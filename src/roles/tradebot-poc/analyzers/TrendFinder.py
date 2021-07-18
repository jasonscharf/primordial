import os
import datetime as dt
from os import path
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from findiff import FinDiff
from utils import *
from skimage import *
import matplotlib
import trendln
from pmdarima.arima import AutoARIMA


class TrendFinder():#AnalyzerBase):
    def __init__(self, results = {}):
        self.params = {} #DefaultParamBlock()
        self.name = 'trend-finder'
        self.tag = self.name

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
        log(f"Running TRENDFINDER against {len(data.index)} data points...", self.tag)
        historical_data = data.copy();


        # TODO: Remove
        historical_data.to_csv(path.join(os.getcwd(), 'output', f"{job['name']}-trends-raw.csv"))

        prediction_data = self.predict(ctx, job, data)
        prediction_data.to_csv(path.join(os.getcwd(), 'output', f"{job['name']}-predictions-raw.csv"))


        backtest_data = None
        if ctx['backtesting'] == True:
            backtest_data = self.backtest(ctx, job, data)


        if ctx['visualize']:
            self.render_predictions(ctx, job, data, prediction_data, backtest_data)

        fig_actuals = self.find_lines2(ctx, job, historical_data, 'actuals')
        fig_actuals.savefig(path.join(os.getcwd(), 'output', f"{job['name']}-trends-actuals.png"))
        fig_actuals.clf()

        newdf = historical_data.append(prediction_data)
        return


    # Backtest the algo
    def backtest(self, ctx, job, data):
        log(f"Backtesting {self.name} in job {job['name']}")
        backtest = pd.DataFrame(columns=['PercentDiff', 'Positions', 'LogReturns'])

        # Getting the percentage difference between the predictions and the actual values
        #backtest['PercentDiff'] = data['MovAvgClose'].loc[data.dropna().index] - 1
        backtest['PercentDiff'] = (data['Predictions'].dropna() / 
                           data['MovAvgClose'].loc[data['Predictions'].dropna().index]) - 1

        # Getting positions
        backtest['Positions'] = backtest['PercentDiff'].apply(lambda x: self.get_positions(x, 
                                                                                        thres=1, 
                                                                                        short=True))
        #for i in range(0, len(backtest['Positions'])):
        #    backtest['Positions'][i] = self.get_positions(backtest['Positions'][i], thres=1, short=True)


        # Preventing lookahead bias by shifting the positions
        backtest['Positions'] = backtest['Positions'].shift(2).dropna()

        # Getting Log Returns
        backtest['LogReturns'] = data['LogReturns'].loc[backtest['Positions'].index]

        # Calculating Returns by multiplying the 
        # positions by the log returns
        #returns = backtest['Positions'] * backtest['LogReturns']

        # Calculating the performance as we take the cumulative 
        # sum of the returns and transform the values back to normal
        backtest['Returns'] = (backtest['Positions'] * backtest['LogReturns']).diff().dropna().cumsum().apply(np.exp)

        backtest['Date'] = data['Date']
        #backtest.reset_index(drop=True)
        return backtest


    # Renders predictions + backtest data if available
    def render_predictions(self, ctx, job, data, predictions, backtest = None):
        chart_data = predictions.copy()
        chart_data['MovAvgClose'].shift(1).astype(float).dropna()

        fig = go.Figure()

        # Returns for SPY
        #spy = yf.download('SPY', start=returns.index[0]).loc[returns.index]
        #spy = spy['Adj Close'].apply(np.log).diff().dropna().cumsum().apply(np.exp)


        # Plotting the actual values
        fig.add_trace(go.Scatter(x=data['Date'],
                                y=data['MovAvgClose'].loc[data.index],
                                name='Actual Moving Average',
                                mode='lines'))

        # Plotting the predicted values
        fig.add_trace(go.Scatter(x=chart_data['Date'],
                                y=chart_data['MovAvgClose'],
                                name='Future Moving Average',
                                mode='lines'))

        # Setting the labels
        fig.update_layout(title=f"Moving Average for {job['symbol']}",
                        xaxis_title='Date',
                        yaxis_title='Prices')

        if backtest is not None:
            # Calculating the performance as we take the cumulative sum of the returns and transform the values back to normal
            fig.add_trace(go.Scatter(x=backtest['Date'],
                        y=backtest['Returns'],
                        name='Backtest',
                        mode='lines'))

        # fig.show()
        fig.write_html(path.join(os.getcwd(), 'output', f"{job['name']}-figure.html"))

        #r['tf.stats.rmse'] = 

        # Finding the root mean squared error
        #try:
        #    rmse = mean_squared_error(stock_df['MovAvg'][stock].loc[pred_df.index], pred_df[stock], squared=False)
        #    print(f"On average, the model is off by {rmse} for {stock}\n")
        #except ValueError:
        #    print(f"Missing data for mean_squared_error")
        #    pass


    def predict(self, ctx, job, data):
        symbol = job['symbol']

        #
        # ARIMA
        # 

        # Training params TODO: From ctx
        days_to_train = ctx['num_days_lookback']
        days_to_predict = ctx['num_days_lookahead']

        # Establishing a new DF for predictions
        #preds = pd.DataFrame(index=pd.RangeIndex(start=days_to_train, stop = days_to_train + days_to_predict, step=1),
        #                    columns=["Date", "Close"])
        preds = pd.DataFrame(columns=data.columns)


        # Build a dataframe to hold the predictions
        day = data.shape[0]
        num_days = data.shape[0]
        last_date_str = data['Date'][day - 1]
        last_date = dt.datetime.strptime(last_date_str, '%Y-%m-%d')
        predict_start_date = last_date + dt.timedelta(days=1)

        last_ix = data['index'][day - 1] + 1
        date_list = [predict_start_date + dt.timedelta(days=x) for x in range(days_to_predict)]
        preds['Date'] = date_list
        preds['Date'] = preds['Date'].apply(lambda x: x.strftime("%Y-%m-%d"))
        preds['index'] = pd.RangeIndex(start=last_ix, stop=last_ix+days_to_predict, step=1)

        # For backtesting
        data['Predictions'] = data['MovAvgClose'].copy()


        # Copy existing columns
        #for col in ['symbol','Adj Close', 'Open', 'Close', 'Low', 'High', 'Volume','MovAvgOpen', 'MovAvgClose', 'MovAvgLow', 'MovAvgHigh', 'MovAvgVolume']:
        #    preds[col] = data[col]
        backtesting = ctx['backtesting']

        # Generate ARIMA sequence predictions for each applicable column
        for col in ['MovAvgClose']:# ['LogMovAvgOpen', 'LogMovAvgClose', 'LogMovAvgLow', 'LogMovAvgHigh', 'LogMovAvgVolume']:
            offset = 0
            if ctx['backtesting']:
                start_day = days_to_train
                end_day = num_days + days_to_predict
            else:
                start_day = data['MovAvgClose'].size[0] # TODO: Rm?
                end_day = num_days + days_to_train

            for day in range(start_day, end_day):

                # BEGIN LOOP
                training = data['LogMovAvgClose'].iloc[day - days_to_train:day + 1].dropna()
            
                # Finding the best parameters
                model    = AutoARIMA(start_p=0, start_q=0,
                                        start_P=0, start_Q=0,
                                        max_p=8, max_q=8,
                                        max_P=5, max_Q=5,
                                        error_action='ignore',
                                        information_criterion='bic',
                                        suppress_warnings=True)

                # Getting predictions for the optimum parameters by fitting to the training set
                forecast = model.fit_predict(training, n_periods=days_to_predict)

                # Getting the last predicted value from the next N days
                try:
                    # Forward
                    preds[col].iloc[offset:days_to_predict] = np.exp(forecast[-1])

                    # Backwards
                    data['Predictions'].iloc[day:day+days_to_predict] = np.exp(forecast[-1])
                except Exception as e:
                    log(f"Error predicting future: {e}")
                    pass

                # IN LOOP
                #try:
                #    preds[col[9:]] = np.exp(forecast)
                #    preds[col[9:]].iloc[offset:days_to_predict] = np.exp(forecast[-1])
                #except Exception as e:
                #    log(f"Error predicting future: {e}")
                #    pass


                offset = offset + 1
                # END LOOP

        return preds


    # https://github.com/GregoryMorse/trendln
    def find_lines2(self, ctx, job, data, subname = 'actuals'):
        r = job['result']

        # TODO: Setting here to base trends on the averages
        lows = data['Low']
        highs = data['High']
        closes = data['Close']

        accuracy = 8
        mins, maxs = trendln.calc_support_resistance(closes, accuracy=accuracy) # TODO: PLAY WITH THIS PARAM
        minimaIdxs, pmin, mintrend, minwindows = trendln.calc_support_resistance((lows, None), accuracy=accuracy) #support only

        # Capture results
        r['tf.topo.sr.close_num_mins'] = len(mins)
        r['tf.topo.sr.close_num_maxes'] = len(mins)
        r['tf.topo.sr.close_minima_ids'] = minimaIdxs # TODO: Adjust so they are more usable (and correct day indices)
        r['tf.topo.sr.close_pmin'] = pmin
        r['tf.topo.sr.close_mintrend'] = mintrend
        r['tf.topo.sr.close_minwindows'] = minwindows


        mins, maxs = trendln.calc_support_resistance((lows, highs), accuracy=accuracy)
        (minimaIdxs, pmin, mintrend, minwindows), (maximaIdxs, pmax, maxtrend, maxwindows) = mins, maxs

        r['tf.topo.sr.lohi_num_mins'] = len(mins)
        r['tf.topo.sr.lohi_num_maxes'] = len(mins)
        r['tf.topo.sr.lohi_minima_ids'] = minimaIdxs
        r['tf.topo.sr.lohi_pmin'] = pmin
        r['tf.topo.sr.lohi_mintrend'] = mintrend
        r['tf.topo.sr.lohi_minima_ids'] = maximaIdxs
        r['tf.topo.sr.lohi_pmin'] = pmax
        r['tf.topo.sr.lohi_mintrend'] = maxtrend
        r['tf.topo.sr.lohi_minwindows'] = maxwindows


        if ctx['visualize']:
            
            # Visualize the current

            # TODO: Copy dataframe
            graph_data = data.copy()
            graph_data['Date'] = graph_data['Date'].apply(lambda x: dt.datetime.strptime(x, '%Y-%m-%d'))
            graph_data.set_index(['Date'], inplace=True)
            fig = trendln.plot_sup_res_date(closes, accuracy=accuracy, idx=graph_data.index)

            #data['Date'] = data['Date'].apply(lambda x: dt.datetime.strptime(x, '%Y-%m-%d'))
            #data.set_index(['Date'], inplace=True)

            return fig

            # Visualize predicted


   
    # Note from article:
    # If you noticed in the “Positions” DF, we have shifted the series of positions by 2 days.
    # This is done to account for look-ahead bias as well as the situation in which we may
    #  find ourselves deciding to initiate a trade closer to the end of the trading day based
    #  on the prediction from the day before. If we decided to initiate a trade at the very
    #  beginning of the trading day, then we may be fine with just shifting positions by 1 day instead.

    def get_positions(self, difference, thres=3, short=False):
        """
        Compares the percentage difference between actual 
        values and the respective predictions.

        Returns the decision or positions to long or short 
        based on the difference.
        
        Optional: shorting in addition to buying
        """

        if difference > thres/100:
            return 1
        elif short and difference < -thres/100:
            return -1
        else:
            return 0


    #
    # From "Programmatic Identification of Support Resistance Trend Lines"
    # See: https://towardsdatascience.com/programmatic-identification-of-support-resistance-trend-lines-with-python-d797a4a90530
    #
    def find_lines1(self, ctx, data):
        closes = data['Close']

        #
        # TODO: Test better algos here. This is extremely trivial.
        # See https://towardsdatascience.com/programmatic-identification-of-support-resistance-trend-lines-with-python-d797a4a90530
        # 

        # Method 1
        #minimaIdxs = np.flatnonzero(
        #    closes.rolling(window=3, min_periods=1, center=True).aggregate(agg_min)).tolist()

        #maximaIdxs = np.flatnonzero(
        #    closes.rolling(window=3, min_periods=1, center=True).aggregate(agg_max)).tolist()

        # Method 2

        dx = 1 #1 day interval
        d_dx = FinDiff(0, dx, 1)
        d2_dx2 = FinDiff(0, dx, 2)
        clarr = np.asarray(closes)
        mom = d_dx(clarr)
        momacc = d2_dx2(clarr)

        h = closes#.lolist()
        minimaIdxs, maximaIdxs = get_extrema(h, mom, momacc, True), get_extrema(h, mom, momacc, False)



        ymin, ymax = [h[x] for x in minimaIdxs], [h[x] for x in maximaIdxs]
        zmin, zmne, _, _, _ = np.polyfit(minimaIdxs, ymin, 1, full=True)  #y=zmin[0]*x+zmin[1]
        pmin = np.poly1d(zmin).c
        zmax, zmxe, _, _, _ = np.polyfit(maximaIdxs, ymax, 1, full=True) #y=zmax[0]*x+zmax[1]
        pmax = np.poly1d(zmax).c


        #log(f"extrema1: {(pmin, pmax, zmne, zmxe)}", self.tag)


        # From article:

        # The error cannot be applied consistently for all securities however as absolute values
        # of error are relative to the time period and price range over that time period.

        # So first an appropriate scale should be computed: scale = (hist.Close.max() — hist.Close.min()) / len(hist).
        # (If merely taking square root of the residual error and dividing by (n-2) then dividing by len(hist) here is not necessary.) 

        # Then a parameter errpct to the trend lines function will be a simple percentage error such as
        #  0.5%=0.005 where fltpct=scale*errpct.
        # 
        # Other nuances should be handled, such as the fact that a slope of 0 is not returned as a coefficient and must be manually filled.

        p, r = np.polynomial.polynomial.Polynomial.fit(minimaIdxs, ymin, 1, full=True) #more numerically stable
        pmin, zmne = list(reversed(p.convert().coef)), r[0]

        log(f"extrema2: {(p, r, ymin, pmin, zmne)}", self.tag)

        p, r = np.polynomial.polynomial.Polynomial.fit(maximaIdxs, ymax, 1, full=True) #more numerically stable
        pmax, zmxe = list(reversed(p.convert().coef)), r[0]

        log(f"extrema3: {(p, r, ymax, pmax, zmxe)}", self.tag)

        # TODO: Evaluate these!
        #mintrend, maxtrend = get_trend(minimaIdxs), get_trend(maximaIdxs)
        #mintrend, maxtrend = get_trend_opt(minimaIdxs), get_trend_opt(maximaIdxs)
        #mintrend, maxtrend = hough(minimaIdxs), hough(maximaIdxs)
        #mintrend, maxtrend = prob_hough(minimaIdxs), prob_hough(maximaIdxs)

        #fig = trendln.plot_support_resistance(closes)
        return

#def prob_hough(Idxs): #pip install scikit-image
#  image, tested_angles, scl, m = make_image(Idxs)
#  from skimage.transform import probabilistic_hough_line
#  lines = []
#  for x in range(hough_prob_iter):
#    lines.append(probabilistic_hough_line(image, threshold=2,
#                 theta=tested_angles, line_length=0,
#      line_gap=int(np.ceil(np.sqrt(
#        np.square(image.shape[0]) + np.square(image.shape[1]))))))
#  l = []
#  for (x0, y0), (x1, y1) in lines:
#    if x0 == x1: continue
#    if x1 < x0: (x0, y0), (x1, y1) = (x1, y1), (x0, y0)
#    y0, y1 = y0 / scl + m, y1 / scl + m
#    pts, res = find_line_pts(Idxs, x0, y0, x1, y1)
#    if len(pts) >= 3: l.append((pts, res))
#  return l


def hough(Idxs): #pip install scikit-image
  image, tested_angles, scl, m = make_image(Idxs)
  from skimage.transform import hough_line, hough_line_peaks
  h, theta, d = hough_line(image, theta=tested_angles)
  origin, lines = np.array((0, image.shape[1])), []
  for pts, angle, dist in zip(*hough_line_peaks(h, theta, d, threshold=2)):
    y0, y1 = (dist - origin * np.cos(angle)) / np.sin(angle)
    y0, y1 = y0 / scl + m, y1 / scl + m
    pts, res = find_line_pts(Idxs, 0, y0, image.shape[1], y1)
    if len(pts) >= 3: lines.append((pts, res))
  return lines


def hough_points(pts, width, height, thetas):
  diag_len = int(np.ceil(np.sqrt(width * width + height * height)))
  rhos = np.linspace(-diag_len, diag_len, diag_len * 2.0)
  # Cache some resuable values
  cos_t = np.cos(thetas)
  sin_t = np.sin(thetas)
  num_thetas = len(thetas)
  # Hough accumulator array of theta vs rho
  accumulator =np.zeros((2 * diag_len, num_thetas), dtype=np.uint64)
  # Vote in the hough accumulator
  for i in range(len(pts)):
    x, y = pts[i]
    for t_idx in range(num_thetas):
      # Calculate rho. diag_len is added for a positive index
      rho=int(round(x * cos_t[t_idx] + y * sin_t[t_idx])) + diag_len
      accumulator[rho, t_idx] += 1
  return accumulator, thetas, rhos

def make_image(data, Idxs):
    max_size = int(np.ceil(2/np.tan(np.pi / (360 * 5)))) #~1146
    m, tested_angles = data.min(), np.linspace(-np.pi / 2, np.pi / 2, 360*5)
    height = int((data.max() - m + 0.01) * 100)
    mx = min(max_size, height)
    scl = 100.0 * mx / height
    image = np.zeros((mx, len(hist))) #in rows, columns or y, x
    for x in Idxs:
        image[int((h[x] - m) * scl), x] = 255
    return image, tested_angles, scl, m

def get_trend(Idxs):
    trend = []
    for x in range(len(Idxs)):
        for y in range(x+1, len(Idxs)):
            for z in range(y+1, len(Idxs)):
                trend.append(([Idxs[x], Idxs[y], Idxs[z]],
                    get_bestfit3(Idxs[x], h[Idxs[x]],
                                Idxs[y], h[Idxs[y]],
                                Idxs[z], h[Idxs[z]])))
    return list(filter(lambda val: val[1][3] <= fltpct, trend))

def get_trend_opt(Idxs):
  slopes, trend = [], []
  for x in range(len(Idxs)): #O(n^2*log n) algorithm
    slopes.append([])
    for y in range(x+1, len(Idxs)):
      slope = (h[Idxs[x]] - h[Idxs[y]]) / (Idxs[x] - Idxs[y])
      slopes[x].append((slope, y))
  for x in range(len(Idxs)):
    slopes[x].sort(key=lambda val: val[0])
    CurIdxs = [Idxs[x]]
    for y in range(0, len(slopes[x])):
      CurIdxs.append(Idxs[slopes[x][y][1]])
      if len(CurIdxs) < 3: continue
      res = get_bestfit([(p, h[p]) for p in CurIdxs])
      if res[3] <= fltpct:
        CurIdxs.sort()
        if len(CurIdxs) == 3:
          trend.append((CurIdxs, res))
          CurIdxs = list(CurIdxs)
        else: CurIdxs, trend[-1] = list(CurIdxs), (CurIdxs, res)
      else: CurIdxs = [CurIdxs[0], CurIdxs[-1]] #restart search
  return trend


#
# Gets local extrema
# TODO: Parameterize
# 
def get_extrema(h, mom, momacc, isMin=False):
    return [x for x in range(len(mom))
    if (momacc[x] > 0 if isMin else momacc[x] < 0) and
      (mom[x] == 0 or #slope is 0
        (x != len(mom) - 1 and #check next day
          (mom[x] > 0 and mom[x+1] < 0 and
           h[x] >= h[x+1] or
           mom[x] < 0 and mom[x+1] > 0 and
           h[x] <= h[x+1]) or
         x != 0 and #check prior day
          (mom[x-1] > 0 and mom[x] < 0 and
           h[x-1] < h[x] or
           mom[x-1] < 0 and mom[x] > 0 and
           h[x-1] > h[x])))]



def agg_min(x):
    print (f"agg {x}")
    if (len(x) < 3):
        return False
    else:
        return x[0] > x[1] and x[2] > x[1]

def agg_max(x):
    print (f"agg {x}")
    if (len(x) < 3):
        return False
    else:
        return x[0] < x[1] and x[2] < x[1]
