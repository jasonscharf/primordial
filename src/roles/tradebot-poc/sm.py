import click

import AnalysisBatch
import DefaultParamBlock
import Workspace
import version

from art import *
from trade import run_trade_command
from globals import *
from utils import *


@click.group()
def cli():
    return


@click.command()
@click.option('--dev', is_flag=True, default=False, help='Run the bot during development')
@click.option('--fwdtest', is_flag=True, default='False', help='Run the bot in forward testing mode to make mock trades')
@click.option('--symbol', default='BTCUSDT', help='The symbol or currency pair to trade or test against, ex: BTC_USDT')
@click.option('--name', default='', help='The name of the robot')
@click.option('--backtest', default='', help='Run the specified backtest. See README for examples.')
@click.option('--LIVE', is_flag=True, default=False, help='Perform actual live-testing (unless --test-back or --test-fwd are specified)')
@click.option('--suppress', default=False, help='Suppress live trading prompt on startup')
@click.option('--capture', default='', help='Capture ticks and historical data for replay')
@click.option('--res', default='1m')
@click.option('--init', is_flag=True, default=False, help='Initialize a new bot with initial settings')
@click.option('--overwrite', is_flag=True, default=False, help='Overwrite existing robot if it exists and --init is true')
@click.option('--budget-initial', default=0, help='Initial budget in the TARGET current currency, e.g. USD for BTC_USD. Only used when creating new bot instance.')
@click.option('--wager-initial', default=0.1, help='The percentage of the budget to place on each trade')
@click.option('--yield-target', default=0.01, help='The relative percent of last interval close to consider a trade profitable')
@click.option('--genome', default='', help='The bot genome to run/test/trade with')
@click.pass_context
def bot(ctx, dev,
    fwdtest,
    symbol,
    name,
    backtest,
    live,
    suppress,
    capture,
    res,
    init,
    overwrite,
    budget_initial,
    wager_initial,
    yield_target,
    genome):

    run_trade_command(ctx.params)


cli.add_command(bot)

tprint(f'STONKMINER')
print(f"v{version.STONKMINER_VERSION_SEMVER}-{version.STONKMINER_VERSION_SOURCE}\n\n")
if __name__ == '__main__':
    currencies_path = "./data/currencies.yml"
    log(f"Loading currencies from {currencies_path}...", 'tool')
    load_currencies(currencies_path)
    cli()
    pass
