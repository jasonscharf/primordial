from setuptools import setup

setup(
    name="sm",
    version='0.1',
    py_modules=['sm'],
    install_requires=[
        'click',
        'numpy',
        'pandas',
        'rich',
        'yfinance',
        'plotly',
        'matplotlib',
        'plotly',
        'asyncio',
        'trendln',
        'python-binance',
        'art',
        'TA-lib'
    ],
    entry_points='''
        [console_scripts]
        sm=sm:cli
    ''',
)