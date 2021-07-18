import os
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import trendln
import json
import globals
from enum import IntEnum
from utils import *
from os import path
from ruamel.yaml import YAML
from binance.client import Client
from binance.enums import *
from binance.helpers import round_step_size
from findiff import FinDiff
from rich import inspect
import talib
from talib import MA_Type

# See https://mrjbq7.github.io/ta-lib/ for docs
import talib
from talib import RSI, BBANDS

from .BotState import BotState, FsmState
from .Trade import Trade, TradeState, TradeType
from globals import yaml


class SymbolContext:
    def __init__(self, symbol):
        self.symbol = symbol
        self.res = '1m'


# Docs:
# https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
# https://binance-docs.github.io/apidocs/spot/en/#individual-symbol-ticker-streams

hist_columns = ['open-time', 'open', 'close', 'low', 'high', 'volume', 'close-time', 'quote-asset-volume', 'num-trades', 'taker-buy-base-volume', 'taker-buy-quote-volume', 'event', 'event-description']

# Simple bot that buys low and sells high
class TradeBot:
    def __init__(self, workspace, symbol, params, id, name, genetics = ''):
        self.id = id
        self.name = name
        self.genetics = genetics
        self.params = params
        self.symbol = symbol
        self.symbol_info = None
        self.fsm_state = FsmState.INIT
        self.state: BotState = None
        self.tag = name
        self.history = pd.DataFrame(columns=hist_columns)
        self.ticks = []#pd.DateFrame(columns=hist_columns)
        self.resolution = '1m'
        self.last_sample_min = -1
        self.current_event_time = dt.datetime.now()
        self.playback_curr_time = dt.datetime.now()
        self.playback_tick_in_interval_counter = 0
        self.is_playback = False
        self.is_capturing = True
        self.is_playback = False
        self.is_live_trading = False
        self.client = None
        self.prev_last_minima_id = -1
        self.prev_last_maxima_id = -1
        self.has_handled_interval_closing = False
        self.trades = []
        self.last_stats = None
        self.last_closed_interval_price = None
        self.prev_tick_price = None

        # Rolling window size for moving average (history, not ticks)
        # In primary time resolution units, e.g. minutes
        self.moving_avg_window_small = 7
        self.moving_avg_window_medium = 25
        self.moving_avg_window_large = 99


    # Initializes the bot with a rolling window of data to prime itself in
    async def initialize(self, client, data, runin_end = None):
        self.client = client

        # Get rid of the last interval - we'll get it on date interval close
        #self.history.drop(self.history.tail(1).index, inplace=True)

        # Load previous state, unless in playback mode
        # TEMP
        if not self.is_playback: #and not self.is_capturing:
            self.load_state(self.genetics)
        elif self.state is None:
            self.state = BotState(self.name, self.symbol, self.genetics)

        ##self.change_fsm_state(FsmState.RUNIN)
        self.analyze_runin(data, runin_end)

        log(f"Initializing with {len(data)} data points", self.tag)
        log(f"Genotype is: {self.state.get_genotype_str(full=True)}", self.tag)

        # Restore the proper FSM state
        self.change_fsm_state(self.state.saved_fsm_state)

        #if self.state is FsmState.READY and self.is_capturing is not True:
        #    self.change_fsm_state(FsmState.ACTIVE)
        #elif self.is_capturing:
        #    self.change_fsm_state(FsmState.PASSIVE_CAPTURE)
        #else:
        #   self.change_fsm_state(FsmState.READY)

        # Params!
        # TODO: Introduce a degrading upper threshold as part of a safe exit strategy
        self.param_timescale = self.state.get('TS')

        # General genes
        self.param_buy_signal_threshold = self.state.get('BT')
        self.param_sell_signal_threshold = self.state.get('ST')
        self.param_profit_lock_interval = self.state.get('PLI')
        self.param_profit_lock_buffer = self.state.get('PLT')
        self.param_stop_loss_floor = self.state.get('SLF')

        # RSI indicators
        self.param_rsi_low = self.state.get('RSIL')
        self.param_rsi_high = self.state.get('RSIH')

        # Bollinger params
        self.param_bb_buy_breakouts_only = self.state.get('BBBBO')
        self.param_bb_sell_breakouts_only = self.state.get('BBSBO')
        self.param_bb_use_close = self.state.get('BBUC')

        # Buy signal weights
        self.param_bw_bb_l = self.state.get('BWBB')
        self.param_sw_bb_h = self.state.get('SWBB')
        self.param_bw_rsi_l = self.state.get('BWRSI')
        self.param_sw_rsi_h = self.state.get('SWRSI')

        return


    # Gets the path where the bot stores its state
    def get_state_path(self):
        return self.get_output_path(self.symbol) + f'-state.yml'


    # Load the bot's state, including params, any trades made, allocations, etc
    def load_state(self, genetics = ''):
        state_path = self.get_state_path()
        log(f"Loading bot state from '{state_path}'...", self.tag)

        self.state = BotState(self.name, self.symbol, genetics)
        if path.exists(state_path):
            with open(state_path) as file:
                state_raw = yaml.load(file)
                #state_raw = json.load(file)

                if state_raw is None:
                    log(f"WARNING: Could not load bot state")
                else:
                    self.state.load_from_yaml(state_raw)

            return


    def save_state(self):
        state_path = self.get_state_path()
        log(f"Saving bot state to '{state_path}'...")

        self.state.saved_fsm_state = self.fsm_state

        with open(state_path, 'w') as file:
            content = self.state.get_yaml()
            yaml.dump(content, file)

        return


    # Analyzes the run-in period before trading begins
    def analyze_runin(self, data, start = None, end = None):
        log(f"Analyzing runin data...", self.tag)

        perf_start = dt.datetime.now()

        #data.reset_index(drop=True)

        for entry in data:
            ts = load_time(entry[0])
            if end is not None and ts > end:
                break
            else:
                self.intake_kline_entry(entry, historical=True)

        try:
            self.history.to_csv(path.join(self.get_output_path(self.symbol) + f"-runin.csv"))
        except Exception as e:
            log(f"Could not open run-in file! {len(data)} entries will not be saved an run-in")
            pass

        timeframe = dt.timedelta(minutes=60 * 4) # TODO: MAKE CONFIGURABLE DUH

        if end is None:
            end = dt.datetime.now()

        if start is None:
            start = (end - timeframe)

        first_entry = data[0]
        first_ts = load_time(first_entry[0])

        if start < first_ts:
            start = first_ts
        
        # Initial analysis
        self.perform_analysis(self.history, start, end)

        # TODO: Proper prev price logic
        self.prev_tick_price = self.prev_price = float(data[-1][4])
        perf_end = dt.datetime.now()
        return


    # Note: window_size in relative time res units (min. minutes), not tick rate
    def perform_analysis(self, data, start, end, tick_data=[]):
        log(f"Performing analysis", self.tag)

        # Compute some useful stats on our window
        stats = data.copy()#[len(data) - self.moving_avg_window_large:]

        col_avg_small = f'MovAvgClose{self.moving_avg_window_small}'
        col_avg_medium = f'MovAvgClose{self.moving_avg_window_medium}'
        col_avg_large = f'MovAvgClose{self.moving_avg_window_large}'

        # Compute moving averges back 5, 15, 30 minutes/days/weeks/months
        stats[col_avg_small] = data['close'].rolling(self.moving_avg_window_small).mean().dropna()
        stats[col_avg_medium] = data['close'].rolling(self.moving_avg_window_medium).mean().dropna()
        stats[col_avg_large] = data['close'].rolling(self.moving_avg_window_large).mean().dropna()

        # NOTE: No rounding here due to minor currency values in coins... really should be using fixed point
        stats[f'Log' + col_avg_small] = stats[col_avg_small].apply(np.log)#.apply(lambda x: round(x, 2))
        stats[f'Log' + col_avg_medium] = stats[col_avg_medium].apply(np.log)
        stats[f'Log' + col_avg_large] = stats[col_avg_large].apply(np.log)


        #
        # Compute extrema
        # 
        lows = stats['low']
        highs = stats['high']
        closes = stats['close']

        perf_start = dt.datetime.now()

        # Compute extrema
        #dx = 1 # interval
        #d_dx = FinDiff(0, dx, 1)
        #d2_dx2 = FinDiff(0, dx, 2)
        #clarr = np.asarray(closes)
        #mom = d_dx(clarr)
        #momacc = d2_dx2(clarr)
#
        #h = closes#.lolist()
        #minimaIdxs, maximaIdxs = get_extrema(h, mom, momacc, True), get_extrema(h, mom, momacc, False)
        #
        #ymin, ymax = [h[x] for x in minimaIdxs], [h[x] for x in maximaIdxs]
        #zmin, zmne, _, _, _ = np.polyfit(minimaIdxs, ymin, 1, full=True)  #y=zmin[0]*x+zmin[1]
        #pmin = np.poly1d(zmin).c
        #
        #if len(maximaIdxs) > 0:
        #    zmax, zmxe, _, _, _ = np.polyfit(maximaIdxs, ymax, 1, full=True) #y=zmax[0]*x+zmax[1]
        #    pmax = np.poly1d(zmax).c
        #

        accuracy=128
        mins, maxs = trendln.calc_support_resistance((lows.tolist(), highs.tolist()), accuracy=accuracy)
        (minimaIdxs, pmin, mintrend, minwindows), (maximaIdxs, pmax, maxtrend, maxwindows) = mins, maxs

        perf_end = dt.datetime.now()

        #elapsed_extrema = perf_end - perf_start
        log(f"Computed extrema in {perf_end - perf_start}", self.tag)


        #
        # Filter extrema "noise"
        #

        #
        # Analyze extrema
        #

        if len(minimaIdxs) > 0:
            last_minima_id = minimaIdxs[-1]
        else:
            last_minima_id = -1

        if len(maximaIdxs) > 0:
            last_maxima_id = maximaIdxs[-1]
        else:
            last_maxima_id = -1


        # TODO: Statefulness
        # 
        is_first_minima = self.prev_last_minima_id == -1
        is_first_maxima = self.prev_last_maxima_id == -1

        # Keep track, so we can observe new extrema
        self.prev_last_minima_id = last_minima_id
        self.prev_last_maxima_id = last_maxima_id

        extrema_direction = 0
        if last_minima_id < last_maxima_id:
            extrema_direction = 1.0
        else:
            extrema_direction = -1.0


        # TODO: Slope of moving average including tick

        #
        # Plot diagnostics
        #
        plot_template = go.layout.Template()
        #plot_template.layout.annotationdefaults = dict(font=dict(color="crimson"))
        #plot_template.theme = 'plotly_dark'

        fig = go.Figure()

        
        #fig.template.theme = 'plotly_dark'

        try:
            fig.add_trace(go.Scatter(x=minimaIdxs,
                                    y=stats[col_avg_small].iloc[minimaIdxs],
                                    name='Minima',
                                    mode='markers'))
            fig.add_trace(go.Scatter(x=maximaIdxs,
                                    y=stats[col_avg_small].iloc[maximaIdxs],
                                    name='Maxima',
                                    mode='markers'))

            # Plot MA
            fig.add_trace(go.Scatter(x=stats.index,
                                    y=stats[col_avg_small],
                                    name=F'MA ({self.moving_avg_window_small})',
                                    mode='lines'))

            fig.add_trace(go.Scatter(x=stats.index,
                                    y=stats[col_avg_medium],
                                    name=F'MA ({self.moving_avg_window_medium})',
                                    mode='lines'))

            fig.add_trace(go.Scatter(x=stats.index,
                                    y=stats[col_avg_large],
                                    name=F'MA ({self.moving_avg_window_large})',
                                    mode='lines'))

                
            # Setting the labels
            fig.update_layout(title=f'TradeBot 1.0 :: diagnostics',
                            xaxis_title='Date',
                            yaxis_title='Prices',
                            template=plot_template)
        
            fig.write_html(self.get_output_path(self.symbol) + '-diagnostics.html')

        except Exception as e:
            log(f"Error running chart... skipping")
            # TODO FIX
            return
           
        # fig.show()

        # Finding the root mean squared error
        #try:
        #    rmse = mean_squared_error(stock_df['MovAvg'][stock].loc[pred_df.index], pred_df[stock], squared=False)
        #    print(f"On average, the model is off by {rmse} for {stock}\n")
        #except ValueError:
        #    print(f"Missing data for mean_squared_error")
        #    pass

        self.last_stats = stats
        return



    # Processes the next kline entry and adds it to the rolling window.
    # Note: Always assumes it's the latest!
    def intake_kline_entry(self, kl, historical = True):

        open_time = load_time(kl[0])
        close_time = load_time(kl[6])

        open = float(kl[1])
        high = float(kl[2])
        low = float(kl[3])
        close = float(kl[4])
        volume = float(kl[5])
        quote_asset_volume = float(kl[7])
        number_of_trades = float(kl[8])
        taker_buy_base_volume = float(kl[9])
        taker_buy_quote_volume = float(kl[10])
        ignore = kl[11]

        event = ''
        event_description = ''

        row = [open_time, open, close, low, high, volume, close_time, quote_asset_volume, number_of_trades, taker_buy_base_volume, taker_buy_quote_volume, event, event_description]


        # TODO: What about adjusted close???

        if len(self.history) == 0:
            prev_entry = None
        else:
            prev_entry = self.history.tail(1)

        if (prev_entry is not None and load_time(prev_entry['close-time'].iloc[-1]) == close_time):
            log(f"Ignoring duplicate interval row in intake_kline_entry")

        # TODO: Prune history...but note that doing so seems to completely break RSI...
        self.history.loc[len(self.history)] = row
        self.last_closed_interval_price = close
        return


    # Updates the historical lines.
    # TODO: Thread
    async def update_history(self, ticks=1):
        if self.is_playback:
            return
        else:
            source, target = globals.currencies.parse_pair(self.symbol)
            api_symbol = source.symbol + target.symbol
            k = await self.client.get_historical_klines(api_symbol, Client.KLINE_INTERVAL_1MINUTE, "2m ago PST") # TODO: Time res
            #log(f"Server request")

            open_time = 0

            #k = [open_time, open, close, low, high, volume, close_time, quote_asset_volume, number_of_trades, taker_buy_base_volume, taker_buy_quote_volume, event, event_description]
            self.intake_kline_entry(k[0])


            if self.is_capturing:
                self.history.to_csv(path.join(self.get_output_path(self.symbol) + f"-history.csv"))

        return


    # Writes any captured ticks to disk. For training purposes.
    def emit_captured_ticks(self):
        df = pd.DataFrame.from_records(self.ticks)
        df.to_csv(self.get_output_path(self.symbol) + '-ticks.csv')


    # Seems as though Binance's test API gives us back a static snapshot of old data for historicals.
    # This method uses the last tick. Not for production!!!
    async def update_history_from_latest_tick(self):
        # TODO: Thread
        return

    #
    # Runs the bot's trading logic possibly producing trade signals
    #
    async def run_robot_logic(self):
        log("Running trading logic...")
        return



    def handle_exec_report(self, msg):
        
        # "e": "executionReport",        // Event type
        # "E": 1499405658658,            // Event time
        # "s": "ETHBTC",                 // Symbol
        # "c": "mUvoqJxFIILMdfAW5iGSOW", // Client order ID
        # "S": "BUY",                    // Side
        # "o": "LIMIT",                  // Order type
        # "f": "GTC",                    // Time in force
        # "q": "1.00000000",             // Order quantity
        # "p": "0.10264410",             // Order price
        # "P": "0.00000000",             // Stop price
        # "F": "0.00000000",             // Iceberg quantity
        # "g": -1,                       // OrderListId
        # "C": "",                       // Original client order ID; This is the ID of the order being canceled
        # "x": "NEW",                    // Current execution type
        # "X": "NEW",                    // Current order status
        # "r": "NONE",                   // Order reject reason; will be an error code.
        # "i": 4293153,                  // Order ID
        # "l": "0.00000000",             // Last executed quantity
        # "z": "0.00000000",             // Cumulative filled quantity
        # "L": "0.00000000",             // Last executed price
        # "n": "0",                      // Commission amount
        # "N": null,                     // Commission asset
        # "T": 1499405658657,            // Transaction time
        # "t": -1,                       // Trade ID
        # "I": 8641984,                  // Ignore
        # "w": true,                     // Is the order on the book?
        # "m": false,                    // Is this trade the maker side?
        # "M": false,                    // Ignore
        # "O": 1499405658657,            // Order creation time
        # "Z": "0.00000000",             // Cumulative quote asset transacted quantity
        # "Y": "0.00000000",             // Last quote asset transacted quantity (i.e. lastPrice * lastQty)
        # "Q": "0.00000000"              // Quote Order Qty

        order_id = msg['c']
        quantity = msg['q']
        price = msg['p']
        stop_price = msg['P']
        exec_type = msg['x']
        exec_status = msg['X']
        avg_price = float(msg['Z']) / float(msg['z'])

        log(f"Order update for order '{order_id}': Status: {exec_status}")


        # ... update trades
        is_buy_order_conf = exec_type == ''

        if is_buy_order_conf:
            if self.fsm_state == FsmState.WAITING_FOR_BUY_ORDER_CONF:
                self.change_fsm_state(FsmState.WAITING_FOR_SELL_OPP)
            elif self.fsm_state == FsmState.WAITING_FOR_SELL_ORDER_CONF:
                self.change_fsm_state(FsmState.WAITING_FOR_BUY_OPP)

        return


    # Normalizes a price and quantity based on the symbol's settings
    # See: https://sammchardy.github.io/binance-order-filters/
    def normalize_price_and_quantity(self, price: float, quantity: float) -> float:
        filters = self.symbol_info['filters']
        price_filter = [x for x in filters if x['filterType'] == 'PRICE_FILTER'][0]
        tick_size = float(price_filter['tickSize'])

        quantity_filter = [x for x in filters if x['filterType'] == 'LOT_SIZE'][0]
        step_size = float(quantity_filter['stepSize'])

        # TODO: Handle quantity better
        return round_step_size(price, tick_size), round_step_size(quantity, step_size)



    # TODO: To broker
    async def place_buy_order(self, price: float, quantity: float, time) -> Trade:
        price, quantity = self.normalize_price_and_quantity(price, quantity)
        
        # TODO: Timestamp logic... use TS from exchange?
        trade = Trade(self.symbol, TradeType.BUY)
        trade.price = price
        trade.quantity = quantity
        trade.stop = trade.price
        trade.limit = trade.price
        #trade.rating = current_tick_rsi
        trade.fees = 0#self.compute_fees(trade.price, trade.quantity)
        trade.gross = -(trade.price * trade.quantity + trade.fees)
        trade.target = price + (price * self.state.target_yield_pct) + trade.fees
        note = f"Buy {self.symbol} at {self.show_in_quote_currency(price)} at {time}."
        trade.add_note(note)


        precision = 8
        try:
            precision = self.symbol_info['quoteAssetPrecision']
        except:
            pass

        quantity_str = f"{quantity:.8f}"


        # Live only!
        if self.is_live_trading:
            log(f"--- LIVE TRADE for {quantity} ---")
            order = await self.client.create_order(
                symbol=f"{self.state.symbol.replace('_', '')}",
                side=SIDE_BUY,
                type=ORDER_TYPE_LIMIT,
                timeInForce=TIME_IN_FORCE_GTC,
                quantity=quantity_str,
                price=str(price))

            self.change_fsm_state(FsmState.WAITING_FOR_BUY_ORDER_CONF)
            self.prev_order = order
            trade.order_id = order['orderId']
        else:
            order = await self.client.create_test_order(
                symbol=f"{self.state.symbol.replace('_', '')}",
                side=SIDE_BUY,
                type=ORDER_TYPE_LIMIT,
                timeInForce=TIME_IN_FORCE_GTC,
                quantity=quantity_str,
                price=str(price))

            self.change_fsm_state(FsmState.WAITING_FOR_BUY_ORDER_CONF)
            self.prev_order = order

            # TODO: Deal with empty obj here from Binance test API
            trade.order_id = order['orderId']

        jsons = json.dumps(order, indent=4, sort_keys=True)
        print (jsons)

        #trade.order_id = order.id
        self.record_trade(trade)
        self.save_state()
        log(note, 'BUYBUYBUY')
        return trade


    # Places a sell order
    # TODO: Move to broker
    async def place_sell_order(self, prev_trade: Trade, price: float, quantity: float, time) -> Trade:
        price, quantity = self.normalize_price_and_quantity(price, quantity)
        
        #
        # See: https://sammchardy.github.io/binance-order-filters/
        # 
        trade = Trade(self.symbol, TradeType.SELL)
        trade.price = price
        trade.quantity = prev_trade.quantity
        trade.stop = trade.price
        trade.limit = trade.price
        #trade.rating = current_tick_rsi
        trade.fees = prev_trade.fees
        trade.gross = trade.price * trade.quantity - trade.fees
        #trade.target = prev_trade.target
        note = f"Sell {self.symbol} at {self.show_in_quote_currency(price)} at {time}."
        trade.add_note(trade)

        precision = 8
        try:
            precision = self.symbol_info['quoteAssetPrecision']
        except:
            pass

        quantity_str = f"{quantity:.8f}"


        #
        if self.is_live_trading:
            log(f"--- LIVE TRADE for {quantity} ---")
            order = await self.client.create_order(
                symbol=f"{self.state.symbol.replace('_', '')}",
                side=SIDE_SELL,
                type=ORDER_TYPE_LIMIT,
                timeInForce=TIME_IN_FORCE_GTC,
                quantity=quantity_str,
                price=str(price))
                
            self.prev_order = order
            trade.order_id = order['orderId']
            self.change_fsm_state(FsmState.WAITING_FOR_SELL_ORDER_CONF)
        else:
            order = await self.client.create_test_order(
                symbol=f"{self.state.symbol.replace('_', '')}",
                side=SIDE_SELL,
                type=ORDER_TYPE_LIMIT,
                timeInForce=TIME_IN_FORCE_GTC,
                quantity=quantity_str,
                price=str(price))
                
            self.prev_order = order
            trade.order_id =  order['orderId']
            self.change_fsm_state(FsmState.WAITING_FOR_SELL_ORDER_CONF)

        jsons = json.dumps(order)
        print (jsons)


        #.add_note(note)
        self.record_trade(trade)
        self.save_state()
        log(note, 'BUYBUYBUY')
        return trade


    # Handle symbol ticks. Assume 2s with a history interval of 1m
    async def handle_symbol_tick(self, event_name, event_time, symbol, pl):
        param_latency_limit_ms = 500

        if pl is None:
            self.disconnect()
            return

        # TODO: Reconcile difference in timestamp 'E' and parent (caller's) timestamp
        if 'E' in pl:
            pass

        #{
        #"e": "24hrTicker",  // Event type
        #"E": 123456789,     // Event time
        #"s": "BNBBTC",      // Symbol
        #"p": "0.0015",      // Price change
        #"P": "250.00",      // Price change percent
        #"w": "0.0018",      // Weighted average price
        #"x": "0.0009",      // First trade(F)-1 price (first trade before the 24hr rolling window)
        #"c": "0.0025",      // Last price
        #"Q": "10",          // Last quantity
        #"b": "0.0024",      // Best bid price
        #"B": "10",          // Best bid quantity
        #"a": "0.0026",      // Best ask price
        #"A": "100",         // Best ask quantity
        #"o": "0.0010",      // Open price
        #"h": "0.0025",      // High price
        #"l": "0.0010",      // Low price
        #"v": "10000",       // Total traded base asset volume
        #"q": "18",          // Total traded quote asset volume
        #"O": 0,             // Statistics open time
        #"C": 86400000,      // Statistics close time
        #"F": 0,             // First trade ID
        #"L": 18150,         // Last trade Id
        #"n": 18151          // Total number of trades
        #}

        # Price changes not included in payload for some reason
        #if 'p' in pl:
        #    price_change = pl['p']
        #    price_change_percent = pl['P']
        #else:
        #    price_change = None
        #    price_change_percent = None


        if 'W' in pl:
             price_avg_weighted = pl['W']
        else:
             price_avg_weighted = None

        # These are missing too. API docs out of date?
        #bid_best_price = pl['b']
        #bid_best_quantity = pl['B']
        #ask_best_price = pl['a']
        #ask_best_quantity = pl['A']
        #stats_open_time = pl['O']
        #stats_close_time = pl['C']
        #trade_first_id = pl['F']
        #trade_last_id = pl['L']
        #first_trade_before_rolling_window = pl['x']

        curr_price = float(pl['c'])
        prev_quantity = float(pl['Q'])
        price_open = float(pl['o'])
        price_high = float(pl['h'])
        price_low = float(pl['l'])
        volume_total_traded_base = float(pl['v'])
        volume_total_traded_quote = float(pl['q'])
        trade_total = float(pl['n'])

        prev_tick_price = self.prev_tick_price
        self.prev_tick_price = curr_price

        if event_name != 'kline':
            log(f"Unknown event '{event_name}'. Skipping message", self.tag)
            return

        time_current = self.get_current_time()
        time_event = load_time(event_time)
        time_spread_ms = millis_between(time_event, time_current)


        self.current_event_time = time_event

        # Detect close (minute res)
        # TODO: Other time resolutions
        # TODO: Dispatch to separate thread
        if self.last_sample_min == -1:
            self.last_sample_min = time_event.minute

        # Capture tick stream
        if self.is_capturing:
            self.capture_tick(pl)


        # Warning logic
        if time_spread_ms > param_latency_limit_ms:
            log(f"Event latency is HIGH @ {time_spread_ms} ms", 'WARN')


        #print (f"TICK {time_event.second}: Price ${curr_price} V: {volume_total_traded_base}")

        #
        # State management
        #
        state_is_holding = False
        state_holding_volume = 0
        state_holding_strike = 0

        # Assumes run-in / perform_analysis called
        stats = self.last_stats

        #
        # Run behaviours. This is where trades actually happen: on tick.
        # This allows us to place orders when we have reasonable confidence what the next
        # closing price will be.
        #
        # If we're getting close to close, or thinks are looking too risky,
        # we'll want to make a decision on what to do and have an order ready for the next window

        # TODO: Time res
        interval_is_closing = time_event.second > 50

        if self.is_playback:

            # Note: Average is 30 ticks per minute
            interval_is_closing = self.playback_tick_in_interval_counter > 20

        # Captured ticks (for playback) don't have seconds, unfortunately.
        # For now, we'll just simulate interval closure when we get > 25 ticks be interval
        # TODO: Capture seconds in ticks during capture mode


        #
        # Indicators
        #
        
        # Indicator: RSI
        # Get the RSI for history + current tick
        data_rsi = self.history['close'].copy()
        data_rsi.loc[len(data_rsi)] = curr_price

        data_rsi = data_rsi.tail(1000)

        rsi6 = RSI(data_rsi, timeperiod=6).tolist()[-1]
        rsi12 = RSI(data_rsi, timeperiod=12).tolist()[-1]
        rsi24 = RSI(data_rsi, timeperiod=24).tolist()[-1]

        print("RSI(6): {} RSI(12): {} RSI(24): {}".format(rsi6, rsi12, rsi24))

        rsi = RSI(data_rsi, timeperiod=6).tolist()[-1]
        upper, middle, lower = time('compute-bollinger-bands', lambda: talib.BBANDS(data_rsi))

        bollinger_lower = lower.iloc[-1]
        bollinger_upper = upper.iloc[-1]

        current_tick_rsi = rsi

        col_avg_small = f'MovAvgClose{self.moving_avg_window_small}'
        col_avg_medium = f'MovAvgClose{self.moving_avg_window_medium}'
        col_avg_large = f'MovAvgClose{self.moving_avg_window_large}'

        ma_small = self.show_in_quote_currency(stats[col_avg_small].tolist()[-1])
        stat_str_1 = f"{self.symbol} | P: {curr_price} | V: {trade_total}"
        stat_str_2 = f"MA({self.moving_avg_window_small}): {ma_small}"
        stat_str_3 = f"RSI: {round(current_tick_rsi)}"
        stat_str_4 = f"BBU: {self.show_in_quote_currency(bollinger_upper)} BBL: {self.show_in_quote_currency(bollinger_lower)}"

        log(f"{stat_str_1} | {stat_str_2} | {stat_str_3} | {stat_str_4}", 'stats')


        # TODO: Future enhancement: Observe remaining ticks till the close just in case of a last
        # minute reversal of fortune. For now, we'll just exercise window close once.
        if interval_is_closing and self.has_handled_interval_closing is False:
            log(f"Approaching interval close for {time_event}", 'time')
            #log(f"{stat_str_1} | {stat_str_2} | {stat_str_3} | {stat_str_4}", 'stats')
            self.has_handled_interval_closing = True
            self.playback_tick_in_interval_counter = 0


 
        #
        # Per-tick analysis
        #
        # TODO: Epsilon
        #if curr_price >= price_high:
            #log(f"Bullish tick at high {price_high}", 'tick')

            # TODO: Inter-tick trades :o
            #   Allow a bot to make a trade within the active interval window

            # TODO: Check remaining budget... exit if too low

            # TODO: Peak logic on RSI data

        # End end-of-interval handling

        #
        # Trading
        #

        # Buying power express in quote currency, e.g. BUSD for BTC/BUSD
        buying_power = self.state.budget * self.state.default_trade_pct

        # Use max buying power every timez

        buy_quantity = buying_power / curr_price

        target_yield_pct = self.state.target_yield_pct
        target_yield = self.prev_price * target_yield_pct
        target_price_before_fees = self.prev_price + target_yield
        target_fees = 0 #TODO self.compute_fees(target_price_before_fees, quantity)

        # This is where the first stop will be once triggered by a dropping
        # price coming back upwards in cyclical fashion
        target_floor = self.prev_price + (self.prev_price * target_yield_pct)

        #curr_gross_yield_pct = 1 - (self.prev_price / curr_price)

        # TODO: Fix this! It should be based on last interval close
        curr_pct_change_interval = 1 - self.last_closed_interval_price / curr_price
        curr_pct_change_tick = 1 - self.prev_price / curr_price


        # https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md

        #
        # Poll order status
        #
        if (not self.is_playback) and (self.fsm_state == FsmState.WAITING_FOR_BUY_ORDER_CONF or self.fsm_state == FsmState.WAITING_FOR_SELL_ORDER_CONF):
            #if self.fsm_state == FsmState.WAITING_FOR_BUY_ORDER_CONF:
            #    prev_order = self.state.get_prev_trade()
            #elif self.fsm_state == FsmState.WAITING_FOR_SELL_ORDER_CONF:
            #    prev_order = self.state.get_prev_trade()
            prev_order = self.state.get_prev_trade()
            order_id = prev_order.order_id
            log(f"Checking order '{order_id}'...")
            checked_order = await self.client.get_order(symbol=self.symbol.replace('_', ''), orderId=order_id)

            # https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#query-order-user_data
            #  "symbol": "LTCBTC",
            #  "orderId": 1,
            #  "orderListId": -1 //Unless part of an OCO, the value will always be -1.
            #  "clientOrderId": "myOrder1",
            #  "price": "0.1",
            #  "origQty": "1.0",
            #  "executedQty": "0.0",
            #  "cummulativeQuoteQty": "0.0",
            #  "status": "NEW",
            #  "timeInForce": "GTC",
            #  "type": "LIMIT",
            #  "side": "BUY",
            #  "stopPrice": "0.0",
            #  "icebergQty": "0.0",
            #  "time": 1499827319559,
            #  "updateTime": 1499827319559,
            #  "isWorking": true,
            #  "origQuoteOrderQty": "0.000000"
            status = checked_order['status']
            orderId = checked_order['orderId']

            log(f"Waiting for order {order_id} (status {status})...")

            if status == ORDER_STATUS_FILLED:
                log(f"Order {order_id} has been FILLED!")
                self.prev_order = None

                if self.fsm_state == FsmState.WAITING_FOR_BUY_ORDER_CONF:
                    log(f"Buy order {orderId} completed")

                    # TODO: Fill out the trade with the actual data

                    log(f"{json.dumps(checked_order)}")

                    self.change_fsm_state(FsmState.WAITING_FOR_SELL_OPP)

                elif self.fsm_state == FsmState.WAITING_FOR_SELL_ORDER_CONF:

                    trade = self.state.get_prev_trade()
                    prev_trade = self.state.get_prev_prev_trade()

                    profit = (trade.gross - trade.fees) - (prev_trade.price * prev_trade.quantity)
                   
                    self.state.total_profit += profit
                    profit_str = globals.currencies.render(self.state.symbol_quote, profit)

                    note = f"SELL {trade.quantity} {self.symbol} @ {trade.price} for profit of {profit}"
                    log(note, 'SELLSELLSELL')
                    log(f"Total profit so far is {self.state.total_profit}")

                    self.change_fsm_state(FsmState.WAITING_FOR_BUY_OPP)




        # RSI opportunity
        elif current_tick_rsi < self.param_rsi_low:
            #log(f"{self.symbol} is undersold at {curr_price} at {time_current} (tRSI: {current_tick_rsi})", 'note')

            # BUY LOW !!!
            if self.fsm_state is FsmState.READY or self.fsm_state is FsmState.WAITING_FOR_BUY_OPP:
                below_bollinger_lower = curr_price < bollinger_lower

                if self.param_bb_buy_breakouts_only and not below_bollinger_lower:
                    #log(f"Skip buy opp inside Bollinger band @ {curr_price}")
                    pass
                else:
                    # TODO: Timestamp logic... use TS from exchange?
                    trade = await self.place_buy_order(curr_price, buy_quantity, time_current)
            #else:
                #log(f"Missed out on possible BUY due to current state of {FsmState(self.fsm_state).name}")

        elif current_tick_rsi >= self.param_rsi_high:
            #log(f"{self.symbol} is oversold at {curr_price} at {time_current} (tRSI: {current_tick_rsi})", 'note')


            # Even if RSI indicates a buy signal, the price may be lower than the previous.
            # An example would be in a sharp downturn, where mean reversions and even possibly
            # positive Bollinger escape might be lower than the buy in price due to steep slope.

            #
            # Sell constraints
            #
            prev_trade = self.state.get_prev_trade()
            if prev_trade is not None: # TODO: Fees
                target_floor = prev_trade.price + (prev_trade.price * target_yield_pct)

            #
            # Ensure we're selling at or above target
            #
            # TODO: Handle exit states / adaptive stop-loss mode.
            if prev_trade is not None and curr_price <= target_floor:
                #log(f"Not selling @ {curr_price} as it is below target price of {target_floor}", self.symbol)
                pass
            elif prev_trade is not None and self.fsm_state is FsmState.WAITING_FOR_SELL_OPP:
                above_bollinger_upper = curr_price > bollinger_upper

                if self.param_bb_sell_breakouts_only and not above_bollinger_upper:
                    #log(f"Skip sell opp inside Bollinger band @ {curr_price}")
                    pass
                else:
                    trade = await self.place_sell_order(prev_trade, curr_price, prev_trade.quantity, time_current)


            #else:
            #    log(f"Missed out on possible SELL due to current state of {FsmState(self.fsm_state).name}")

        #
        # Roll over to next active timeframe
        # 
        if self.last_sample_min != time_current.minute:
            log(f"Rolling over to next active timeframe @ {time_event}", 'time')
            self.has_handled_interval_closing = False

            # TODO: Compare prev tick + new interval
            self.prev_price = curr_price

             # Reset the synthetic tick/interval tracker (for playback)
            self.playback_tick_in_interval_counter = 0

            # Note: If we write an event, it's written after the fact into the history
            await self.update_history(ticks=1)


            # If capturing, write the tick history to disk
            if self.is_capturing is True:
                self.emit_captured_ticks()

            self.last_sample_min = time_current.minute;

        #log(f"Current price for {symbol} is {current_price}")


        #
        # Safety check proposed trades
        #

        #
        # Execute trades
        #

        # ... update state

        self.prev_tick_price = curr_price
        self.playback_tick_in_interval_counter += 1

        return


    def show_in_quote_currency(self, amount, symbol = False, prefix = False):
        target = self.state.symbol_quote
        if prefix is True:
            sign_str = self.state.symbol_quote.sign + ' '
        else:
            sign_str = ''


        if symbol is True:
            symbol_str = ' ' + self.state.symbol_base.sign
        else:
            symbol_str = ''

        return f"{sign_str}{round(amount, target.du)}{symbol_str}"


    def compute_fees(self, price, quantity):
        gross = price * quantity
        fees = self.state.exch_fee_base + (gross * self.state.exch_fee_pct)
        return fees


    # Records and schedules a trade
    def record_trade(self, trade, time = dt.datetime.now()):
        profit = 0

        type_str = TradeType(trade.type)
        log(f"{type_str} {trade.quantity} {trade.symbol} @ {trade.price} | S: {trade.stop} L: {trade.limit}")

        self.state.add_trade(trade)
        self.state.total_profit += profit

        # TODO: Offload to rendering thread
        #self.snapshot_trendlines(self.history, f"-trade-snapshot-{len(self.state.trades)}.png")
        return


    # Computes Bollinger Bands (r)
    def compute_indicator_bollinger(self, data, window, period=10, colsuffix=''):

        try:
            close = data['close']
        except Exception as ex:
            return None

        try:
            upper, middle, lower = talib.BBANDS(
                                close.values, 
                                timeperiod=period,
                                # number of non-biased standard deviations from the mean
                                nbdevup=1,
                                nbdevdn=1,
                                # Moving average type: simple moving average here
                                matype=0)
        except Exception as ex:
            return None

        data_dict = dict(upper=upper, middle=middle, lower=lower)
        bands = pd.DataFrame(data_dict, index=data.index, columns=['upper', 'middle', 'lower']).dropna()
        return bands


    #
    # Computes the RSI indicator
    #
    def compute_indicator_rsi_history(self, data, window_length = None):
        if window_length is None:
            window_length = self.moving_avg_window_small

        magic_num = 14
        prices = []
        c = 0

        # Add the closing prices to the prices list and make sure we start at greater than 2 dollars to reduce outlier calculations.
        while c < len(data):
            prices.append(data.iloc[c])
            c += 1

        i = 0
        upPrices = []
        downPrices = []
        #  Loop to hold up and down price movements
        while i < len(prices):
            if i == 0:
                upPrices.append(0)
                downPrices.append(0)
            else:
                if (prices[i] - prices[i-1])>0:
                    upPrices.append(prices[i] - prices[i-1])
                    downPrices.append(0)
                else:
                    downPrices.append(prices[i] - prices[i-1])
                    upPrices.append(0)
            i += 1
        x = 0

        avg_gain = []
        avg_loss = []

        #  Loop to calculate the average gain and loss
        while x < len(upPrices):
            if x < magic_num + 1:
                avg_gain.append(0)
                avg_loss.append(0)
            else:
                sumGain = 0
                sumLoss = 0
                y = x - magic_num
                while y<=x:
                    sumGain += upPrices[y]
                    sumLoss += downPrices[y]
                    y += 1
                avg_gain.append(sumGain / magic_num)
                avg_loss.append(abs(sumLoss / magic_num))
            x += 1
        p = 0
        RS = []
        RSI = []
        #  Loop to calculate RSI and RS
        while p < len(prices):
            if p < magic_num + 1:
                RS.append(0)
                RSI.append(0)
            else:
                if avg_loss[p] == 0:
                    RSvalue = 1
                else:
                    RSvalue = (avg_gain[p]/avg_loss[p])

                RS.append(RSvalue)
                RSI.append(100 - (100/(1+RSvalue)))
            p+=1

        #  Creates the csv for each stock's RSI and price movements
        df_dict = {
            'Prices' : prices,
            'upPrices' : upPrices,
            'downPrices' : downPrices,
            'AvgGain' : avg_gain,
            'AvgLoss' : avg_loss,
            'RS' : RS,
            'RSI' : RSI
        }
        df = pd.DataFrame(df_dict, columns = ['Prices', 'upPrices', 'downPrices', 'AvgGain','AvgLoss', 'RS', "RSI"])
        return df


    # Compute RSI. Typically, one should base the adjusted close in as data
    # Get the difference in price from previous step
    def compute_indicator_rsi(self, data, window_length = None):
        if window_length is None:
            window_length = self.moving_avg_window_small

        delta = data.diff()
        window = window_length
        up_days = delta.copy()
        up_days[delta<=0]=0.0
        down_days = abs(delta.copy())
        down_days[delta>0] = 0.0
        RS_up = up_days.rolling(window).mean()
        RS_down = down_days.rolling(window).mean()
        rsi = 100 - 100/(1 + RS_up / RS_down)

        return rsi


    def snapshot_trendlines(self, data, filename = '-trendlines.png'):
        accuracy=128
        graph_data = data.copy()
        graph_data['close-time'] = graph_data['close-time'].apply(lambda x: load_time(x))
        graph_data.set_index(['close-time'], inplace=True)
        #fig = trendln.plot_sup_res_date(data['close'], accuracy=accuracy, idx=graph_data.index)

        #fig.write_png(self.get_output_path() + filename)
        #fig.savefig(self.get_output_path(self.symbol) + filename)
        #fig.clf()

    # Adds a tick to the tick stream.
    # For use in capture mode
    def capture_tick(self, tick):
        self.ticks.append(tick)


    async def handle_order_book(self, client, msg):
        self.last_order_book = msg
        log(f"TradeBot receives order book", self.tag)


    def change_fsm_state(self, new_state):
        log(f"Change state to {FsmState(new_state).name}", self.tag)
        self.fsm_state = new_state
        self.save_state()


    def get_output_path(self, symbol):
        return path.join(os.getcwd(), 'output', f"{symbol}-{self.name}")


    def get_current_time(self):
        if self.is_playback:
            return self.playback_curr_time
        else:
            return dt.datetime.now()


    def disconnect(self):
        try:
            self.emit_captured_ticks()
            self.save_state()
        except:
            pass

        self.is_disconnected = True
        return