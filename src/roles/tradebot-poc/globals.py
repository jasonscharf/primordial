from ruamel.yaml import YAML
from CurrencyManager import *
from genetics import *

# Globals
yaml = YAML()
currencies: CurrencyManager = CurrencyManager()


def load_currencies(currencies_path) -> None:
    with open(currencies_path) as file:
        currencies_yaml = yaml.load(file.read())
        currencies.load(currencies_yaml)


