import datetime as dt
import numpy as np
import pandas as pd
from enum import Enum
#from utils import *


#
# Constants
#
BINANCE_FEE_PCT = 0.001
BINANCE_FEE_BASE = 0


class TimeScale(Enum):
    MINUTE = '1m'
    ONE_HOUR = '1h'
    ONE_DAY = '1d'


# Logging
def log(str, tag=''):
    ts = dt.datetime.now()
    ts_str = format_time(ts)

    maybe_space = ''
    if tag != '':
        tag = f"[{tag}]"
        maybe_space = ' '

    entry = f"[{ts_str}] {tag}{maybe_space}{str}"

    print(entry)


def format_time(time):
    return time.strftime("%Y-%m-%d %H:%M:%S")


# Load time from either a number (Unix timestamp) or string (formatted DT)
def load_time(thinger):

    if isinstance(thinger, str):
        if len(thinger) == 19:
            return dt.datetime.strptime(thinger, "%Y-%m-%d %H:%M:%S")
        else:
            return dt.datetime.strptime(thinger, "%Y-%m-%d %H:%M:%S.%f")
    elif isinstance(thinger, pd.Timestamp):
        return thinger.to_pydatetime()
    elif isinstance(thinger, dt.datetime):
        return thinger
    elif isinstance(thinger, np.datetime64):
        return (thinger - np.datetime64('1970-01-01T00:00:00Z')) / np.timedelta64(1, 's')
    else:
        return dt.datetime.fromtimestamp(thinger / 1000)


def millis_between(then, now):
    return int((now - then).total_seconds() * 1000)


def get_extrema(h, mom, momacc, isMin=False):
    return [x for x in range(len(mom))
            if (momacc[x] > 0 if isMin else momacc[x] < 0) and
            (mom[x] == 0 or  # slope is 0
             (x != len(mom) - 1 and  # check next day
                (mom[x] > 0 and mom[x+1] < 0 and
                 h[x] >= h[x+1] or
                 mom[x] < 0 and mom[x+1] > 0 and
                 h[x] <= h[x+1]) or
                x != 0 and  # check prior day
                (mom[x-1] > 0 and mom[x] < 0 and
                 h[x-1] < h[x] or
                 mom[x-1] < 0 and mom[x] > 0 and
                 h[x-1] > h[x])))]


def time(desc, fn, tag=''):
    start = dt.datetime.now()
    rets = fn()
    end = dt.datetime.now()
    elapsed = millis_between(start, end)

    if tag != '':
        log(f"[{desc}] ran in {elapsed} ms", tag)

    return rets


def safe_get(dict, k, d=None):
    if k in dict:
        return dict[k]
    else:
        return d


def get_bool(val):
    if val == None:
        return False
    else:
        return str(val).lower() in ['y', 'yes', 'true', True, 1]


def parse_timescale(val: str) -> TimeScale:
    try:
        val = TimeScale(val.strip())
        return val
    except Exception as e:
        raise Exception(f"Unknown timescale '{val}'")
