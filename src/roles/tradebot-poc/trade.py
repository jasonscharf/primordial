#!/usr/bin/python3
import os
import sys
from os import path
import datetime as dt
import json
import numpy as np
import pandas as pd
import yfinance as yf
import plotly.express as px
import plotly.graph_objects as go
import multiprocessing
import threading
import uuid
import traceback
from rich import inspect


import asyncio
import globals
from globals import yaml
from ruamel.yaml import YAML
from time import sleep
from pandas import Series, DataFrame
from genetics import Genotype
from bots import BotState
from utils import *
from bots import *
from Workspace import *

from binance.client import Client
from binance import AsyncClient, BinanceSocketManager
from binance import *
import binance


#
# TRADEBOT 0.9
#

# Resources:
# https://algotrading101.com/learn/binance-python-api-guide/
# https://github.com/sammchardy/python-binance
# https://sammchardy.github.io/async-binance-basics/
# https://python-binance.readthedocs.io/en/latest/


# Env
env = os.environ.get('SM_ENV', 'dev')
api_key = os.environ.get('SM_BINANCE_API')
api_secret = os.environ.get('SM_BINANCE_SECRET')


#
# Kline receiver
#
async def kline_listener(client, workspace, robot, params, symbol):
    bm = BinanceSocketManager(client)
    res_count = 0

    async def handle_socket_message(msg):
        if msg is None:
            return

        event_name = msg['e']
        event_time = msg['E']
        event_symbol = msg['s']

        payload = msg['k']
        payload['e'] = event_name
        payload['E'] = event_time
        payload['s'] = event_symbol

        if event_name == 'kline':
            await robot.handle_symbol_tick(event_name, event_time, symbol, payload)
        elif event_name == 'executionReport':
            await robot.handle_exec_report(event_time, msg)

    try:
        #streams = ['BNBBTC@miniTicker', 'BNBBTC@bookTicker']
        #bm.multiplex_socket(callback=handle_socket_message, streams=streams)
        # bm.user_socket(callback=handle_socket_message)
        streams = [f"{symbol}@ticker"]
        # async with bm.user_socket() as stream:
        async with bm.kline_socket(symbol=symbol) as stream:
            while True:
                msg = await stream.recv()
                await handle_socket_message(msg)

    except Exception as e:
        log(f"Error in tick listener: {e}. Assuming disconnection...")
        # traceback.print_stack()
        #exc_type, exc_value, exc_traceback = sys.exc_info()
        #print("*** print_tb:")
        #traceback.print_tb(exc_traceback, limit=1, file=sys.stdout)
        raise
        return

#


async def order_book(client, symbol):
    order_book = await client.get_order_book(symbol=symbol)
    print(order_book)


#
# Runs the primary program logic.
#
async def main(args):
    symbol = args['symbol']

    if symbol is None:
        raise Exception('Missing symbol')

    # Params
    workspace_name = 'dev'
    workspace = None

    # Capturing args
    capture = args['capture']

    # Testing args
    backtest = args['backtest']
    forwardtest = get_bool(args['fwdtest'])

    mode_backtest = False
    mode_forwardtest = False

    if backtest != '':
        mode_backtest = True
        mode_forwardtest = False

    elif forwardtest == True:
        if mode_backtest:
            raise Exception('Cannot backtest and forward test in the same run')
        else:
            mode_backtest = False
            mode_forwardtest = True

    mode_live = args['live']

    if mode_live:
        if mode_backtest or mode_forwardtest:
            raise Exception('Cannot run back/forward tests while live trading')

    # Capture mode logic
    if capture == '':
        capture_mode = False
    else:
        capture_mode = True

    if mode_backtest and capture:
        log(f"Can't capture in backtest. Ignoring capture option.")
        capture_mode = False

    # Time resolution logic
    resolution = args['res']
    if resolution not in ['1m', '1H', '1D']:
        raise Exception(f"Unknown time resolution '{resolution}'")

    # Robot naming
    id = str(uuid.uuid4())
    name = args['name']

    if name == '':
        name = id[0:8]

    # Genome
    genome = args['genome']

    # Initialization
    init = get_bool(args['init'])
    bot_path = path.join(os.getcwd(), 'output',
                         f"{symbol}-{name}") + '-state.yml'
    bot_exists = path.exists(bot_path)
    overwrite = get_bool(args['overwrite'])
    init_state = None

    if init and bot_exists:
        if overwrite is False:
            raise Exception(
                f"Bot '{name}' already exists. Use the --overwrite flag if you wish to overwrite it. Aborting...", 'setup')
        elif overwrite is True:
            log(f"Bot '{name}' already exists. Overwriting...", 'setup')
            init_state = init_new_bot(name, bot_path, args, symbol, genome)
        else:
            raise Exception(f"Unknown value '{overwrite}' for --overwrite")

    elif init and not bot_exists:
        init_state = init_new_bot(name, bot_path, args, symbol, genome)

    elif not bot_exists:
        init_state = init_new_bot(name, bot_path, args, symbol, genome)
        #raise Exception(f"Could not find a bot by the name '{name}' at {bot_path}")

    watchlist = [symbol]

    while True:
        try:
            has_creds = api_key != None and api_secret != None and len(
                api_key) > 0 and len(api_secret) > 0
            log(f"Connecting to Binance (creds? {has_creds})...")

            client = await AsyncClient.create(api_key, api_secret)

            if env is None or env == 'dev':
                log(f"Using Binance TEST API", 'config')
                #client.API_URL = 'https://testnet.binance.vision/api'
            else:
                log(f"Using Binance PRODUCTION API,", 'config')
                # TODO: Prompt suppression cmd arg
                # TODO: Prompt for input here, show production banner

            symbol_info = await client.get_symbol_info(symbol.replace('_', ''))

            log(f"Loading workspace '{workspace_name}'...", 'setup')
            workspace = Workspace(
                workspace_name, 'development workspace', watchlist, [], ['test-strategy'])

            symbol = watchlist[0]
            params = []
            data = {}

            robot = create_bot('trade-bot', workspace,
                               symbol, params, id, name, genome)
            robot.symbol_info = symbol_info
            robot.is_live_trading = mode_live

            if init_state is not None:
                robot.state = init_state
            else:
                robot.state = BotState.BotState(name, symbol, genome)

            # TODO: Params
            budget_initial = float(args['budget_initial'])
            wager_initial = float(args['wager_initial'])
            yield_target = float(args['yield_target'])

            robot.state.budget = budget_initial
            robot.state.default_trade_pct = wager_initial
            robot.state.target_yield_pct = yield_target

            if capture_mode:
                log(f"Capture mode enabled", 'setup')
                robot.is_capturing = True

            # Get runin data
            runin_period = 1000  # TODO: Refine to be more flexible for different time resolutions

            try:
                if mode_backtest is True:
                    complete = await run_backtest(client, workspace, robot, params, symbol, backtest)

                    # Break out
                    if complete:
                        try:
                            #
                            # Backtest report
                            #
                            num_trades = len(robot.state.trades)
                            profit = robot.state.total_profit
                            log(
                                f"Testing complete. Trades: {num_trades / 2}. Gross profit: {profit}")

                            await client.close_connection()
                            exit()

                        except Exception as e:
                            log(f"Error closing connection: {e}")
                            exit()

                else:
                    await run_bot(client, workspace, robot, params, symbol, forwardtest)

            except Exception as e:
                log(f"Error running bot: {e}")
                raise

            # TODO: Dump trades.csv

            try:
                await client.close_connection()
            except Exception as e:
                exit()

        # Python fun: This doesn't work as expected
        # except ConnectionError:
        #    log(f"Connecting error. Retrying in {reconnect_interval}")
        #    sleep(reconnect_interval)
        except OSError as e:
            # if e.errno not in (errno.EPIPE, errno.ESHUTDOWN, errno.ECONNABORTED, errno.ECONNREFUSED, errno.ECONNRESET):
            raise

        except Exception as e:
            log(f"Main loop error: {e}")
            raise


def init_new_bot(name, path, args, symbol, genome):
    log(f"Creating new bot '{name}'", name)
    state = BotState.BotState(name, symbol, genome)

    budget_initial = float(args['budget_initial'])
    wager_initial = float(args['wager_initial'])
    yield_target = float(args['yield_target'])

    state.name = name
    state.symbol = symbol
    state.budget = budget_initial
    state.default_trade_pct = wager_initial
    state.target_yield_pct = yield_target

    # TODO: Extract bot saving/load to the runner here. This is duplicated and hacky
    with open(path, 'w') as file:
        content = state.get_yaml()
        yaml.dump(content, file)  # , Dumper=yaml.RoundTripDumper)
        #content = json.dump(content, file, indent=4, sort_keys=True)

    return state


# Runs training for a particular time interval
async def run_backtest(client, workspace, bot, params, symbol, backtest_name):
    try:
        bt_history_path = path.join(
            os.getcwd(), 'data', 'training-data', backtest_name + "-history.csv")
        bt_ticks_path = path.join(
            os.getcwd(), 'data', 'training-data', backtest_name + '-ticks.csv')
        data = pd.read_csv(bt_history_path)
        ticks = pd.read_csv(bt_ticks_path)

    except Exception as e:
        log(f"Could not run backtest '{backtest_name}'. Verify that both paths exists and are valid backtesting materials: {bt_history_path}, {bt_ticks_path}")
        raise

    data.drop(data.columns[data.columns.str.contains(
        'unnamed', case=False)], axis=1, inplace=True)

    data = data.values.tolist()
    ticks = ticks.to_dict('records')

    # TODO: Harmonize with params
    rolling_avg_window = 100

    # TODO: Need to fix up time handling here
    first_tick = load_time(ticks[0]['t'])

    # Initialize and run-in the bot, but only up to the point that ticks started
    bot.is_playback = True

    await bot.initialize(client, data, first_tick)

    log(f"Bot is initialized in playback mode. Running through history and ticks...")
    for tick in ticks:
        event_time = load_time(tick['t'])
        bot.playback_curr_time = event_time
        await bot.handle_symbol_tick('kline', event_time, symbol, tick)

    # DEV ONLY
    bot.save_state()
    return True


# Runs the primary bot loop
async def run_bot(client, workspace, bot, params, symbol, forwardtest):
    source, target = globals.currencies.parse_pair(symbol)
    api_symbol = source.symbol + target.symbol
    # "1 day ago PST") # TODO: Test time handling here
    data = await client.get_historical_klines(api_symbol, Client.KLINE_INTERVAL_1MINUTE, "10 hours ago PST")
    await bot.initialize(client, data)

    log(f"Beginning {env} trading on {symbol}. API URL: {client.API_URL}")

    while True:
        log(f"Listening for changes to {api_symbol}...", 'trade')
        await kline_listener(client, workspace, bot, params, api_symbol)
        log(f"Listener stopped. Assuming reconnect. Reconnecting in 10 seconds...")
        sleep(10)

    res = await asyncio.gather(
        client.get_exchange_info()  # ,
        # client.get_all_tickers()
    )


def run_trade_command(args):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main(args))
