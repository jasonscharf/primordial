import datetime as dt

#
# AnalysisBatch represents a run of the tool
#
class DefaultParamBlock:
    def __init__(self):
        self.symbols = ['SPY']
        self.currentSymbolIx = 0;
        self.start = dt.date(2011, 1, 1)
        self.end = dt.date.today()
        self.mode = 'dev'
        self.symbols = ['*']