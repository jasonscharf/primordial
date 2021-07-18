from .AnalyzerBase import AnalyzerBase
from .NoopAnalyzer import NoopAnalyzer
from .TrendFinder import TrendFinder


def create_analyzer(name):
    try:
        if name == 'noop':
            return NoopAnalyzer()
        elif name == 'trend-finder':
            return TrendFinder()
        else:
            return NoopAnalyzer()


    except Exception as e:
        log(f"Error enountered creating analyzer with name '{name}'. Using noop. Error: {e}")
        return NoopAnalyzer()
        pass
