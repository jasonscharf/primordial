import uuid
import utils


#
# Workspace represents a research workspace for strategy development and contains
# one or more portfolios, and zero or more analyzer configurations to run against
# each portfolio in the workspace.
#
class Workspace:
    def __init__(self, name = 'Default', description = 'Default dev workspace', symbols = ['SPY'], analyzers = ['trend-finder'], bots = []):
        self.id = uuid.uuid4()
        self.name = name
        self.symbols = symbols
        self.analyzers = analyzers

    # Loads historical data from start to end inclusive
    def load_historical_data(symbols, start, end):
        return