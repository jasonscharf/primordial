#!/usr/bin/python3
import os
import sys
from os import path
import datetime as dt
import json
import numpy as np
import pandas as pd
import yfinance as yf
import pandas_datareader.data as web
import plotly.express as px
import plotly.graph_objects as go
import multiprocessing
#import requests_cache
import threading
import uuid
import traceback


from time import sleep
from pandas import Series, DataFrame
from matplotlib.pyplot import rcParams
from analyzers import *
from utils import *
from AnalysisBatch import *
from Workspace import *


# Settings
is_debugging = True
num_threads = 8
download_delay = 2
setting_moving_average = 10

watchlist = ['SPY', 'PLTR', 'GME', 'AMC']#, 'SPY', 'GME', 'AMC', 'GOOG']
watchlist = ['GME']
pull_from_date = dt.datetime(2010, 1, 1).date()

num_days_lookback = 260 + setting_moving_average
num_days_lookahead = 30

end = dt.date.today()
start = (end - dt.timedelta(days=num_days_lookback))


job_map = {}
symbols_updating = {}

batch = None
workspace = None


#
# Main program
#
def entrypoint():
    symbols_path = path.join(os.getcwd(), "symbols");
    if not path.exists(symbols_path):
        os.mkdir(symbols_path)

    batch = AnalysisBatch(watchlist, start, end)

    # First, update watchlist to previous day's close
    # TODO: NOTE: Remove? updating should be batched (and delayed for huge symbol fetches)
    #update_watchlist(watchlist)

    # Load a workspace and populate it with historical data for its symbols
    workspace = Workspace('dev', 'development workspace', watchlist, ['trend-finder'])

    # Next, run batch analysis for all symbols
    ctx = {}
    ctx['workspace'] = workspace
    ctx['batch'] = batch
    ctx['visualize'] = True
    ctx['start'] = start
    ctx['end'] = end
    ctx['num_days_lookback'] = num_days_lookback
    ctx['num_days_lookahead'] = num_days_lookahead
    ctx['backtesting'] = True

    rcParams['figure.figsize'] = 16, 9

    run_analysis(ctx)


# Runs predictions for each symbol
def run_analysis(ctx):
    workspace = ctx['workspace']
    batch = ctx['batch']
    jobs = []
    for a in workspace.analyzers:
        for symbol in workspace.symbols:
            job = {}
            job['id'] = str(uuid.uuid4())
            job['name'] = f"{workspace.name}-{symbol}-{a}-{job['id'][:8]}"
            job['symbol'] = symbol
            job['analyzer'] = a
            job['ctx'] = ctx
            job['result'] = {}
            jobs.append(job)


    # TODO: Proper batch running, sleeping during full fetch
    log(f"Have {len(jobs)} job(s) to schedule")
    running = 0;
    threads = []


    job_id = 0
    for job in jobs:
        job_map[job_id] = job
        
        # NOTE: We only use threading if we're not debugging.
        # Debugging with thread does not appear to work in VS Code.
        # Threads simply keep running through breakpoints.
        if is_debugging:
            work(job_id)
        else:
            # TODO: IMPORTANT: Batching with N worker threads
            for job in jobs:
                log(f"Dispatching worker thread for {job['name']}")
                thread = threading.Thread(target=work, args=(job_id,), daemon=True)
                threads.append(thread)
                thread.start()
                job_id = job_id + 1


    # Wait for all threads to complete
    if not is_debugging:
        for thread in threads:
            thread.join()

    #
    # FINISHED!
    #
    log(f"*** FINISHED! ***", 'fin')


# Have to pass simple args here via "pickle" encoding when passing to processes and threads,
# so we just use map lookup instead
def work(job_no):
    job_name = 'unknown'
    try:
        job = job_map[job_no]
        ctx = job['ctx']
        job_name = job['name']
        tag = job_name
        log(f"Start job #{job_no}", tag)

        symbol = job['symbol']
        analyzer = create_analyzer(job['analyzer'])

        symbol_path = path.join(os.getcwd(), 'data', 'symbols', symbol)

        #
        # TODO: Thread-safe this... we may already be updating the symbol. Use a map.
        #
        update_symbol(symbol, job_name)

        if not is_debugging and download_delay > 0:
            sleep(download_delay)

        log(f"Running analysis on stonk {symbol}...", tag)

        data = open_symbol(symbol)

        data = data[ctx['num_days_lookback'] * -1:]
        data.reset_index(inplace=True)

        start = dt.datetime.now()
        should_run = analyzer.setup(ctx, pull_from_date)
        if should_run is not False:
            log(f"Analyzer {analyzer.name} opts out of job {job_name}", tag)
            analyzer.run(ctx, job, data)

        end = dt.datetime.now()
        elapsed = 0; # TODO timedelta(end - start)

        log(f"Done running job {job_name} / {analyzer.name} / {symbol} in {elapsed}s", tag)

        result = job['result']

        # TODO: Add to thread safe queue
        #log(f"{result}", 'result')

    except Exception as e:
        log(f"Error running job {job_no} ({job_name}): {e}")
        log(f"{print(traceback.format_exc())}")

        # TODO: Last error in manifest?


# Updates a particular symbol, pulling its history to date if the symbol is a new symbol.
def update_symbol(symbol, job_name, exchange = "default"):
    symbol_path = path.join(os.getcwd(), 'data', 'symbols', symbol)
    last_update = pull_from_date
    manifest = {}

    if not path.exists(symbol_path):
        log("Creating folder for new symbol {}...".format(symbol))
        os.mkdir(symbol_path)
        should_update = True

    if not path.exists(path.join(symbol_path, 'ticker.csv')):
        should_update = True

    else:
        # Open the dataframe, find the last pulled date and pull from there
        last_update = dt.date(1979, 1, 1)

        try:
            with open(path.join(symbol_path, "manifest.json")) as manifest_file:
                manifest = json.load(manifest_file)#, object_pairs_hook=deserialize)
                last_update = manifest['lastFetched'];

        except Exception as e:
            #log(f"Error opening manifest for {symbol}: {e}")
            manifest = {}
            manifest['lastFetched'] = '2010-01-01' # TODO: pull_from_date
            should_update = True
            pass

        today = dt.date.today()

        if manifest['lastFetched'] is None:
            should_update = True
            last_update = pull_from_date
        else:
            last_update = dt.datetime.strptime(manifest['lastFetched'], '%Y-%m-%d').date()
            should_update = today > last_update
            
        log(f"Last update of {symbol} was {last_update}. Updating? {should_update}", 'fetch')

    if (should_update):
        pull_symbol(symbol, symbol_path, last_update)

        # Update manifest
        # TODO: Handle case when last_update is before market close by setting it to yesterday
        last_update = dt.date.today()
        manifest['lastFetched'] = last_update

        if (should_update):
            with open(path.join(symbol_path, "manifest.json"), 'w') as manifest_file:
                content = json.dumps(manifest, indent=4, sort_keys=True, default=serializer)
                manifest_file.write(content)



# Pull historical information for a given symbol, back to some predefined start date.
def pull_symbol(symbol, symbol_path, start = pull_from_date, end = dt.date.today(), append = False):

    # Create a new manifest and CSV history # TODO: Move
    m = {}
    m = { 'symbol': symbol, 'exchange': 'default', 'lastFetched': end }
    with open(path.join(symbol_path, 'manifest.json'), 'w') as manifest_file:
        content = json.dumps(m, indent=4, sort_keys=True, default=serializer)
        manifest_file.write(content)


    # TODO: See available data in yFinance: https://pypi.org/project/yfinance/
    # TODO: Consider adding this stuff to manifest
    #session = requests_cache.CachedSession('yfinance.cache')
    #session.headers['User-agent'] = 'mhi-tradebot/1.0'

    yf.Ticker(symbol)
    data = yf.download(symbol, period=f"{(end - start).days}d")#, session=session)

    # Enrich the data
    data['symbol'] = symbol

    # TODO: Map the moving average window to a batch parameter #IMPORTANT
    # TODO: Why is Adjusted Close special? Should other columns be adjusted?
    data['MovAvgClose'] = data['Adj Close'].rolling(setting_moving_average).mean().dropna()
    data['MovAvgOpen'] = data['Open'].rolling(setting_moving_average).mean().dropna()
    data['MovAvgLow'] = data['Low'].rolling(setting_moving_average).mean().dropna()
    data['MovAvgHigh'] = data['High'].rolling(setting_moving_average).mean().dropna()
    data['MovAvgVolume'] = data['Volume'].rolling(setting_moving_average).mean().dropna()

    #data['LogReturns'] = data['Adj Close'].apply(np.log).diff().dropna()
    #data['LogMovAvg'] = data['MovAvg'].apply(np.log).apply(lambda x: round(x, 2))
    digits = 6
    data['LogMovAvgOpen'] = data['MovAvgOpen'].apply(np.log).apply(lambda x: round(x, digits))
    data['LogMovAvgClose'] = data['MovAvgClose'].apply(np.log).apply(lambda x: round(x, digits))
    data['LogMovAvgLow'] = data['MovAvgLow'].apply(np.log).apply(lambda x: round(x, digits))
    data['LogMovAvgHigh'] = data['MovAvgHigh'].apply(np.log).apply(lambda x: round(x, digits))
    data['LogMovAvgVolume'] = data['MovAvgVolume'].apply(np.log).apply(lambda x: round(x, digits))

    data['LogReturns'] = data['Adj Close'].apply(np.log).diff().dropna()

    # Re-order so symbol is first column
    #cols = reversed(data.columns.tolist())
    #cols = cols[-1:] + cols[:-1]
    #data = data[cols]

    log(f"Pulled {len(data.index)} rows for {symbol}")

    data.to_csv(path.join(symbol_path, 'ticker.csv'))


# Comment
def run_full_analysis():
    # TODO: Glob all dataframes together in memory?
    print ("Running full analysis on all watchlist symbols")


# "Opens" a symbol and returns its history
def open_symbol(stonk, exch = "NYSE"):
    return pd.read_csv(path.join(os.getcwd(), 'data', 'symbols', stonk, 'ticker.csv'))


# Runs a report for a particular symbol
def report(stonk, start, end):
    print ("Running report on {}".format(stonk))
    df = web.DataReader(stonk, 'yahoo', start, end)
    df.tail();


#
# Visualizations
#
def plot(stonk):
    #%matplotlib inline
    import matplotlib.pyplot as plt
    from matplotlib import style

    close_px = df['Adj Close']
    mavg = close_px.rolling(window=100).mean()

    # Adjusting the size of matplotlib
    import matplotlib as mpl
    mpl.rc('figure', figsize=(16, 9))
    mpl.__version__

    # Adjusting the style of matplotlib
    style.use('ggplot')

    close_px.plot(label=stonk)

    mavg.plot(label='mavg')
    plt.legend()

    rets = close_px / close_px.shift(1) - 1
    rets.plot(label='return')


#
# Utilities
#
def serializer(o):
    if isinstance(o, dt.datetime) or isinstance(o, dt.date):
        return o.isoformat()
    else:
        return o

def deserialize(pairs, format='%Y-%m-%d'):
    d = {}
    for k, v in pairs:
        if isinstance(v, str):
            try:
                d[k] = dt.datetime.strptime(v, format).date()
            except ValueError:
                d[k] = v
        else:
            d[k] = v
    return d

entrypoint()
