from .TradeBot import TradeBot
from utils import *


def create_bot(type, workspace, symbol, params, id, name, genetics = ''):
    try:
        if type == 'trade-bot':
            return TradeBot(workspace, symbol, params, id, name, genetics)
        else:
            return None

    except Exception as e:
        log(f"Error enountered creating robot of type '{type}'. Error: {e}")
        return None
