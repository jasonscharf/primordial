import datetime as dt
from utils import *
from enum import IntEnum


class TradeState(IntEnum):
    OPEN = 1
    PLACED = 2
    PARTIALLY_FILLED = 3
    CLOSED = 4
    CANCELLED = 5
    ERROR = 6


class TradeType(IntEnum):
    BUY = 1
    SELL = 2


class Trade:
    def __init__(self, symbol, type):
        self.symbol = symbol
        self.type = type
        self.time = dt.datetime.now()
        self.price = 0
        self.gross = 0
        self.fees = 0
        self.exchange = 'binance'
        self.state = TradeState.OPEN
        self.quantity = 0
        self.strike = 0
        self.limit = 0
        self.stop = 0
        self.rating = 0.0
        self.notes = []
        self.stoploss_price = 0
        self.stoploss_order_id = ''
        self.order_id = ''
        self.target = 0


    def from_yaml(self, yaml):
        self.symbol = safe_get(yaml, 'symbol')
        self.type = TradeType(safe_get(yaml, 'type'))
        self.time = load_time(safe_get(yaml, 'time'))
        self.price = float(safe_get(yaml, 'price'))
        self.gross = float(safe_get(yaml, 'gross'))
        self.fees = float(safe_get(yaml, 'fees'))
        self.exchange = safe_get(yaml, 'exchange')
        self.state = TradeState(safe_get(yaml, 'state'))
        self.quantity = float(safe_get(yaml, 'quantity'))
        self.limit = float(safe_get(yaml, 'limit'))
        self.stop = float(safe_get(yaml, 'stop'))
        self.rating = float(safe_get(yaml, 'rating'))
        self.notes = safe_get(yaml, 'notes')
        self.stoploss_price = safe_get(yaml, 'stoploss_price')
        self.stoploss_order_id = safe_get(yaml, 'stoploss_order_id')
        self.order_id = safe_get(yaml, 'order_id')
        self.target = safe_get(yaml, 'target', d=0)


    def to_yaml(self, yaml):
        y = {}
        y['symbol'] = self.symbol
        y['type'] = int(self.type)
        y['time'] = format_time(self.time)
        y['price'] = self.price
        y['gross'] = self.gross
        y['fees'] = self.fees
        y['exchange'] = self.exchange
        y['state'] = int(self.state)
        y['quantity'] = self.quantity
        y['limit'] = self.limit
        y['stop'] = self.stop
        y['rating'] = self.rating
        #y['notes'] = self.notes
        y['stoploss_price'] = float(self.stoploss_price)
        y['stopless_order_id'] = self.stoploss_order_id
        y['order_id'] = self.order_id
        y['target'] = self.target

        return y


    def add_note(self, note):
        #self.notes.append(note)
        pass