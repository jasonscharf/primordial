#
# Analyzers can observe and react to market data in real-time
#
class AnalyzerBase:
    def __init__(self, params):
        self.type = "noop"
        self.params = params
        self.generate_name()

    def generate_name(self):
        params = self.params

        name = self.type + "-"
        for k, v in sorted(x.items(), key=lambda item: item[1]):
            name = f"{k.name}-{v.value}"

        print (name)

    def setup(self, last_run_at, params):
        return
        
    def train(self, params):
        print (f"Empty training method for {self.name}")

    def run(self, params):
        print (f"Empty run method for {self.name}")
