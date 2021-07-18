import copy
import re
from enum import Enum
from utils import *


class Gene:
    def __init__(self, name, title, type, default):
        self.name = name
        self.title = title
        self.type = type
        self.default = default
        self.value = default
        self.enabled = False

    def to_string(self):
        value_str = ''

        if self.type == GT.Timescale:
            value_str = '1m' # TODO
        elif (self.type in [GT.Num, GT.BW, GT.SW]):
            value_str = str(self.value)
        elif self.type == GT.Percent:
            value_str = str(self.value * 100)
        elif self.type == GT.Flag:
            if self.value == True:
                value_str = 'y'
            else:
                value_str = 'n'
        else:
            raise Exception(f"Unknown gene type '{self.type}'")

        return f"{self.name}{sep_value}{value_str}"


class GT(Enum):
    Num = 0
    Flag = 1
    BW = 2
    SW = 3
    Timescale = 4
    Percent = 5


sep_gene = '|'
sep_value = '='
sep_gene_re = '[|,]'
sep_value_re = '[$=-]'

# Represents a genotype with all genes.


class Genotype:
    def __init__(self, genetics=''):
        self.genes = {}

        # Copy default genetics
        for gene in all_genes:
            self.genes[gene.name] = copy.copy(gene)
            self.genes[gene.name].value = gene.default

        self.parse(genetics)

    def get_gene(self, name: str):
        if not name in self.genes:
            return None
        else:
            return self.genes[name]

    def get_value(self, name):
        if not name in self.genes:
            return None
        else:
            return self.genes[name].value

    def to_string(self, full=False):
        str = ''
        for name in self.genes:
            gene = self.genes[name]
            if full or (gene.value != None and gene.value != gene.default):
                str += gene.to_string() + sep_gene

        if len(str) > 0 and str[-1] == sep_gene:
            return str[:-1]
        else:
            return str

    # Parse out genetic settings
    def parse(self, genome: str):
        found_genes = []
        decls = re.split(sep_gene_re, genome)

        for decl in decls:
            if decl == '':
                continue

            pieces = re.split(sep_value_re, decl)
            name = pieces[0]
            gene = self.get_gene(name)

            if gene is None:
                raise Exception(f"Unknown robot gene '{name}'")

            value = None
            if gene.type == GT.Flag:
                if len(pieces) == 2:
                    flag_val = pieces[1]
                    if flag_val.lower() not in ['y', 'yes', 'n', 'no']:
                        raise Exception(f"Invalid flag value {flag_val}")

                    value = get_bool(flag_val)

                elif len(pieces) == 1:
                    value = True

                else:
                    raise Exception(f"Invalid gene flag value '{value}'")

            elif gene.type in [GT.Num, GT.BW, GT.SW]:
                if len(pieces) != 2:
                    raise Exception(f"Invalid genetic value '{value}'")
                else:
                    value = float(pieces[1])

            elif gene.type == GT.Timescale:
                if len(pieces) != 2:
                    raise Exception(f"Invalid genetic value '{value}'")
                else:
                    value = parse_timescale(pieces[1])

            elif gene.type == GT.Percent:
                if len(pieces) != 2:
                    raise Exception(f"Invalid genetic percentage '{value}'")
                else:
                    value = round(float(pieces[1]) * 100, 2)

            else:
                raise Exception(f"Unknown gene type '{gene.type}'")

            new_gene = copy.copy(gene)
            new_gene.value = value

            # Overwrite any existing genes
            new_gene.enabled = True
            self.genes[new_gene.name] = new_gene


all_genes = [

    # General
    Gene('TS', 'Timescale', GT.Timescale, '1m'),
    Gene('BT', 'Buy signal threshold', GT.Num, 1),
    Gene('ST', 'Sell signal threshold', GT.Num, 1),
    Gene('PLI', 'Profit locking interval %',
         GT.Percent, 0.1),  # tenth-of-percent
    # one half of one-tenth percent
    Gene('PLT', 'Profit locking buffer %', GT.Percent, 0.05),
    Gene('SLF', 'Stop loss floor %', GT.Percent, 1),

    # Bollinger Bands
    Gene('BBUC', 'Use close instead of low/high', GT.Flag, False),
    Gene('BBBBO', 'Buy breakouts only. Rate non-breakouts 0', GT.Flag, False),
    Gene('BBSBO', 'Sell breakouts only. Rate non-breakouts 0', GT.Flag, False),
    Gene('BWBBL', 'Buy weight for a low escape', GT.BW, 1.0),
    Gene('SWBBH', 'Sell weight for a high escape', GT.SW, 1.0),

    # RSI
    Gene('RSIL', 'RSI lower threshold', GT.Num, 33.33),
    Gene('RSIH', 'RSI upper threshold', GT.Num, 66.66),
    Gene('BWRSI', 'Buy weight for RSI below lower', GT.Num, 1.0),
    Gene('SWRSI', 'Sell weight for RSI above upper', GT.Num, 1.0),
]

# Examples
# TS-1m|BT=1|
