from .AnalyzerBase import *


class NoopAnalyzer(AnalyzerBase):
    def __init__(self):
        self.params = {} #DefaultParamBlock()
        self.name = "noop"

    #
    # Sets up the analyzer. If the analyzer doesn't need to run, it can return false
    # to indicate that its sitting this run out
    #
    def setup(self, ctx, last_run_at, params = None):
        return

    #
    # Runs the analyzer for a particular prediction period
    #
    def run(self, ctx, job, data, params = None):
        print(f"RUN NOOP")
        return
