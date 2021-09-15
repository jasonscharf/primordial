
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import { utcDay } from "d3-time";
import * as React from "react";
import {
    elderRay,
    ema,
    discontinuousTimeScaleProviderBuilder,
    Chart,
    ChartCanvas,
    CurrentCoordinate,
    BarSeries,
    CandlestickSeries,
    ElderRaySeries,
    LineSeries,
    MovingAverageTooltip,
    OHLCTooltip,
    SingleValueTooltip,
    lastVisibleItemBasedZoomAnchor,
    XAxis,
    YAxis,
    CrossHairCursor,
    EdgeIndicator,
    MouseCoordinateX,
    MouseCoordinateY,
    ZoomButtons,
    withDeviceRatio,
    withSize,
} from "react-financial-charts";

import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import { Amount } from "../../components/primitives/Amount";
import { BotRunReport } from "../../../../common/models/bots/BotSummaryResults";
import { Box, CircularProgress, Grid, TextField } from "@material-ui/core";
import { BotResultsApiResponse, DataPoint, IndicatorMap } from "../../models";
import { DateTime } from "luxon";
import { Price } from "../../../../common/models/markets/Price";
import { PriceDataParameters } from "../../../../common/models/system/PriceDataParameters";
import { PriceEntity } from "../../../../common/entities/PriceEntity";
import StockChart from "../../charts/BotRunChart";
import { TimeResolution } from "../../../../common/models/markets/TimeResolution";
import TradingViewWidget, { BarStyles, Themes } from "../../components/TradingViewWidget";
import { useParams } from "react-router";
import { client } from "../../includes";
import { isNullOrUndefined } from "../../../../common/utils";
import { sizing } from '@material-ui/system';
import { Spinner } from "../../components/primitives/Spinner";
import { from, shortDateAndTime } from "../../../../common/utils/time";

const BotResultsApiResponse = () => {
    const args = useParams<{ instanceId: string }>();
    const [results, setReport] = useState<BotRunReport>();
    const [data, setData] = useState<DataPoint[]>();
    const [indicators, setIndicators] = useState<IndicatorMap>(new Map<Date, Map<string, number>>());
    const [signals, setSignals] = useState([]);

    const imap: IndicatorMap = new Map<Date, Map<string, number>>();


    useEffect(() => {
        const { instanceId } = args;

        console.log(`Fetching bot results for '${instanceId}'...`);

        if (!instanceId) {
            //throw new Error("Specify an instance ID");
        }
        else {
            client.sandbox.getBotResults(instanceId)
                .then(response => response.data)
                .then(results => {
                    const {
                        report,
                        prices,
                        signals,
                        indicators,
                    } = results as BotResultsApiResponse;

                    const args: PriceDataParameters = {
                        exchange: results.exchange,
                        from: DateTime.fromISO(report.from.toString()).toJSDate(),
                        to: DateTime.fromISO(report.to.toString()).toJSDate(),
                        res: report.timeRes,
                        symbolPair: report.symbols.replace("/", "_"),
                        fetchDelay: 1000,
                        fillMissing: true,
                    };

                    const window = report.window || 99;
                    const data: DataPoint[] = [];
                    for (let i = 0; i < prices.length; ++i) {
                        const price = PriceEntity.fromRow(prices[i]);
                        const indicatorsForTick = new Map<string, number>();
                        Object.keys(indicators).forEach(k => {
                            indicatorsForTick.set(k, indicators[k][i]);
                        });

                        imap.set(price.ts, indicatorsForTick);
                        const dp: DataPoint = {
                            ts: DateTime.fromISO(price.ts.toString()).toJSDate(),
                            date: DateTime.fromISO(price.ts.toString()).toJSDate(),
                            open: price.open.round(12).toNumber(),
                            low: price.low.round(12).toNumber(),
                            high: price.high.round(12).toNumber(),
                            close: price.close.round(12).toNumber(),
                            volume: price.volume.round(12).toNumber(),
                            indicators: Object.fromEntries(indicatorsForTick),
                            signal: signals[i],
                        };

                        data.push(dp);
                    }

                    setReport(report);
                    setData(data);
                    setIndicators(imap);
                    setSignals(signals);
                })
                .catch(err => console.error(`Error loading data`, err))
                ;

        }
    }, []);

    if (!results || !data) {
        return (
            <Spinner caption1={"Loading bot results..."} caption2={"This may take a moment"} />
        );
    }

    const { exchange, instanceId, name, symbols } = results;
    results.from = from(results.from);
    results.to = from(results.to);

    const [base, quote] = symbols.split(/\//);
    const tradingViewSymbol = `${exchange}:${base}${quote}`;

    const interval = getIntervalForTimeRes(results.timeRes);

    return (
        <Box width={1} height={1}>
            <Grid container spacing={2} className="primo-fullsize" direction="row" style={{ alignContent: "baseline" }}>
                <Grid item container style={{ borderBottom: "2px solid #ddd" }}>
                    <Grid item>
                        <Grid item>
                            <b>{results.symbols}</b>
                        </Grid>
                        <Grid item>
                            <span><b>{results.genome}</b></span>
                        </Grid>
                        <Grid item>
                            <span>{results.instanceId}</span>
                        </Grid>
                        <Grid item>
                            <span>{results.name}</span>
                        </Grid>
                    </Grid>
                    <Grid item style={{ marginLeft: "auto", textAlign: "right" }}>
                        <Grid item>
                            <b>{shortDateAndTime(results.from)}</b> - <b>{shortDateAndTime(results.to)}</b>
                        </Grid>
                        <Grid item>
                            <span>gross</span>&nbsp;<b><Amount amount={results.totalGross} symbol={quote} /></b>
                        </Grid>
                        <Grid item style={{ textAlign: "right" }}>
                            <b>{results.length}</b>
                        </Grid>
                    </Grid>
                </Grid>

                <Grid container item spacing={3}>
                    <StockChart data={data as any} indicators={indicators} signals={signals} summary={results} />
                </Grid>
            </Grid>
        </Box >
    );
};

function getIntervalForTimeRes(res: TimeResolution) {
    switch (res) {
        case TimeResolution.ONE_MINUTE: return 1;
        case TimeResolution.FIVE_MINUTES: return 5;
        case TimeResolution.FIFTEEN_MINUTES: return 15;
        case TimeResolution.ONE_HOUR: return 60;
        // case "4h": return 240;
        case TimeResolution.ONE_DAY: return "D";
        default: throw new Error(`Unknown time resolution '${res}' for chart`);
    }
}

export function head(array, accessor?) {
    if (accessor && array) {
        let value;
        for (let i = 0; i < array.length; i++) {
            value = array[i];
            if (!isNullOrUndefined(accessor(value))) return value;
        }
        return undefined;
    }
    return array ? array[0] : undefined;
}

export function timeIntervalBarWidth(interval) {
    return function (props, moreProps) {
        const { widthRatio } = props;
        const { xScale, xAccessor, plotData } = moreProps;
        const first = xAccessor(head(plotData));

        return Math.abs(xScale(interval.offset(first, 1)) - xScale(first)) * widthRatio;
        //return 10;
    };
}

export default BotResultsApiResponse;
