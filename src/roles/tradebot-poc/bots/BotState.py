from .Trade import Trade, TradeState, TradeType
from enum import IntEnum
from utils import *
import globals
from genetics import *

class FsmState(IntEnum):
    NEW = 1

    # Initializing stats based on historicals
    INIT = 2

    # Waiting for first extrema
    RUNIN = 3

    # Ready to do stuff
    READY = 4

    WAITING_FOR_BUY_OPP = 5

    WAITING_FOR_SELL_OPP = 6

    WAITING_FOR_BUY_ORDER_CONF = 8

    WAITING_FOR_SELL_ORDER_CONF = 9

    WAITING_FOR_STOP_LOSS = 7

    # Just capturing ticks and historical data for training purposes
    PASSIVE_CAPTURE = 80

    # Waiting for a buy order to go through
    PENDING_BUY = 90

    # Waiting for a sell order to go through
    PENDING_SELL = 100



class BotState:
    def __init__(self, name, symbol = 'BTC_USDT', genotype_str: str = ''):
        #self.args = args
        self.name = name
        self.genetics = genotype_str
        self._genotype: Genotype = Genotype.Genotype(genotype_str)

        self.symbol = symbol
        self.symbol_base,  self.symbol_quote = globals.currencies.parse_pair(symbol)

        self.saved_fsm_state = FsmState.READY
        self.budget = 0.0
        self.default_trade_pct = 0.01
        self.target_yield_pct = 0.01
        self.total_profit = 0
        self.trades = []
        self.events = []
        self.exch_fee_base = 0
        self.exch_fee_pct = 0.001 # Binance


    def get(self, gene_name: str):
        return self._genotype.get_value(gene_name)

    def get_genotype_str(self, full=True) -> str:
        return self._genotype.to_string(full)


    def load_from_yaml(self, yaml):
        self.name = safe_get(yaml, 'name', 'bot')
        self.genetics = safe_get(yaml, 'genetics', None)
        self.budget = float(safe_get(yaml, 'budget', 0.0))
        self.default_trade_pct = float(safe_get(yaml, 'default_trade_pct', 0.1))
        self.saved_fsm_state = FsmState(int(safe_get(yaml, 'saved_fsm_state', FsmState.INIT)))
        self.total_profit = float(safe_get(yaml, 'total_profit', 0))
        self.exch_fee_base = float(safe_get(yaml, 'exch_fee_base', BINANCE_FEE_BASE))
        self.exch_fee_pct = float(safe_get(yaml, 'exch_fee_pct', BINANCE_FEE_PCT))
        self.symbol = safe_get(yaml, 'symbol')
        self.symbol_base,  self.symbol_quote = globals.currencies.parse_pair(self.symbol)

        self._genotype: Genotype = Genotype.Genotype(self.genetics)

        if 'trades' in yaml:
            for trade_yaml in yaml['trades']:
                trade = Trade(self.symbol, TradeType.BUY)
                trade.from_yaml(trade_yaml)
                self.trades.append(trade)

        return

    def get_portfolio(self):
        total = 0;

        # TODO: Implement
        # ... Add up buy pairs
        for t in self.trades:
            if t.type == TradeType.Buy:
                total += 0

        # TEMP
        return self.total_profit


    def get_yaml(self):
        d = {}
        d['name'] = self.name
        d['genetics'] = self._genotype.to_string(full=True)
        d['genetics_short'] = self._genotype.to_string(full=False)
        d['symbol'] = self.symbol
        d['saved_fsm_state'] = int(self.saved_fsm_state)
        d['budget'] = self.budget
        d['default_trade_pct'] = self.default_trade_pct
        d['total_profit'] = self.total_profit
        d['target_yield_pct'] = self.target_yield_pct
        d['exch_base_fee'] = self.exch_fee_base
        d['exch_base_pct'] = self.exch_fee_pct
        d['symbol_base'] = self.symbol_base.to_yaml()
        d['symbol_quote'] = self.symbol_quote.to_yaml()

        trades_yaml = []

        for trade in self.trades:
            ty = trade.to_yaml(trade)
            trades_yaml.append(ty)

        events_yaml = []

        d['trades'] = trades_yaml
        d['events'] = []
        return d


    def get_prev_trade(self):
        if len(self.trades) == 0:
            return None

        return self.trades[-1]

    def get_prev_prev_trade(self):
        if len(self.trades) < 2:
            return None
        
        return self.trades[-2]


    def add_trade(self, trade):
        self.trades.append(trade)
        return trade