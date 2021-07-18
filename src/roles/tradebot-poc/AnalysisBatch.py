import uuid
import datetime as dt
import DefaultParamBlock


#
# AnalysisBatch represents a run of the tool.
# NOTE: Must be updated in a thread-safe manner!
#
class AnalysisBatch:
    def __init__(self, symbols, start, end, params = DefaultParamBlock):
        self.id = uuid.uuid4()
        self.symbols = symbols
        self.start = start
        self.end = end
        self.timestamp = dt.datetime.now()
        self.duration = 0
        self.name = 'New Context'
        self.runs = []
        self.tickers = []
        self.resolution = 'day'
