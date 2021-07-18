from utils import *


class CurrencyManager:
    def __init__(self):
        self._currency_dict = {}


    def parse_pair(self, pair):
        atoms = pair.split('_')
        if len(atoms) != 2:
            raise Exception(f"Unknown currency pair '{pair}'")
        
        source, target = self.get_symbol(atoms[0]), self.get_symbol(atoms[1])
        return source, target


    def render(self, symbol, amount):
        entry = self.get_symbol(symbol.symbol)
        
        if entry is None:
            log(f"Warning...no symbol found for '{symbol}'")
            du = 16

        else:
            du = entry.du
        
        amount_str = str(round(amount, du))
        return f"{amount_str} {symbol}"


    def get_symbol(self, symbol: str):
        if not symbol in self._currency_dict:
            log(f"Warning: Unknown currency '{symbol}'. Add to currencies.yml. Using default display values for now.")
            entry = Symbol()
            entry.symbol = symbol
            entry.name = symbol
            entry.type = 'crypto'
            entry.sign = '???'
            entry.du = 16

            self._currency_dict[symbol] = entry

            return entry
        else:
            return self._currency_dict[symbol]


    def load(self, yaml):
        self.clear()
        for entry in yaml['currencies']:
            symbol = Symbol()
            symbol.symbol = str(entry['symbol'])
            symbol.name = str(entry['name'])
            symbol.type = str(entry['type'])
            symbol.sign = safe_get(yaml, 'sign', entry['symbol'])
            symbol.du = int(entry['du'])
            self._currency_dict[symbol.symbol] = symbol


    def clear(self):
        self._currency_dict = {}


class Symbol:
    def __init__(self):
        self.symbol = 'UNKNOWN'
        self.name = 'UNKNOWN'
        self.type = 'crypto'
        self.sign = '$'
        self.du = 2


    def to_yaml(self):
        y = {}
        y['symbol'] = self.symbol
        y['name'] = self.name
        y['type'] = self.type
        y['sign'] = self.sign
        y['du'] = self.du
        return y


    def from_yaml(self, y):
        self.symbol = y['symbol']
        self.name = y['name']
        self.type = y['type']
        self.sign = y['sign']
        self.du = int(y['du'])