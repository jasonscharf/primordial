
import * as React from "react";
import classNames from "classnames";

import { useEffect, useState } from "react";
import { Hashicon } from "@emeraldpay/hashicon-react";

import { Box, Card, CardActions, CardContent, Button, CircularProgress, Grid, TextField, Chip, Avatar } from "@mui/material";
import { Amount } from "../../components/primitives/Amount";
import { BotRunReport } from "../../../../common/models/bots/BotSummaryResults";
import { BotResultsApiResponse as BotResults, BotResultsApiResponse, DataPoint, IndicatorMap } from "../../models";
import { DateTime } from "luxon";
import { Price } from "../../../../common/models/markets/Price";
import { PriceDataParameters } from "../../../../common/models/system/PriceDataParameters";
import { PriceEntity } from "../../../../common/entities/PriceEntity";
import BotRunChart from "../../charts/BotRunChart";
import { TimeResolution } from "../../../../common/models/markets/TimeResolution";
import TradingViewWidget, { BarStyles, Themes } from "../../components/TradingViewWidget";
import { useParams } from "react-router";
import { client } from "../../includes";
import { isNullOrUndefined, sleep } from "../../../../common/utils";
import { Spinner } from "../../components/primitives/Spinner";
import { from, normalizePriceTime, shortDateAndTime } from "../../../../common/utils/time";
import OrderTable from "../../components/OrderTable";
import { OrderEntity } from "../../../../common/entities/OrderEntity";
import { Percent } from "../../components/primitives/Percent";
import { RunState } from "../../client";



type BotEvent = any;
const DEFAULT_BOT_RESULTS_POLL_MS = 500;


/**
 * Shows results for a bot run, including OLHCV data, indicators, and events.
 */
const BotResults = () => {
    const args = useParams<{ instanceIdOrName: string }>();
    const [results, setResults] = useState<BotResultsApiResponse>(null);
    const [displayHeikinAshi, setDisplayHeikinAshi] = useState<boolean>(false);

    const imap: IndicatorMap = new Map<string, Map<string, number>>();

    async function waitForCompletion(id: string) {
        let hasCompletionOrError = false;
        while (!hasCompletionOrError) {
            const status = await client.sandbox.getBotResultsStatus(id);
            const data = await status.data;
            const { runState } = data;
            if (runState === RunState.Stopped || runState === RunState.Error) {
                return true;
            }

            console.log(`Waiting for bot results for ${id}...`);
            await sleep(DEFAULT_BOT_RESULTS_POLL_MS);
        }
    }

    useEffect(() => {
        try {
            const { instanceIdOrName: instanceId } = args;

            console.log(`Fetching bot results for '${instanceId}'...`);

            if (!instanceId) {
                //throw new Error("Specify an instance ID");
            }
            else {
                waitForCompletion(instanceId)
                    .then(() => {
                        client.sandbox.getBotResults(instanceId)
                            .then(response => response.data)
                            .then(results => {
                                const {
                                    report,
                                    prices,
                                    signals,
                                    indicators,
                                } = results as BotResultsApiResponse;


                                const rawOrders = ((report && report.orders) ? report.orders : []);

                                // Include the trailing order on the chart
                                if (report.trailingOrder) {
                                    rawOrders.push(report.trailingOrder);
                                }

                                const orderEntities = rawOrders.map(o => OrderEntity.fromRow(o));

                                const orders: OrderEntity[] = [];
                                const eventMap = new Map<string, BotEvent[]>();
                                for (const order of orderEntities) {
                                    order.opened = DateTime.fromISO(order.opened + "").toJSDate();
                                    order.created = DateTime.fromISO(order.created + "").toJSDate();
                                    order.updated = DateTime.fromISO(order.updated + "").toJSDate();

                                    const key = normalizePriceTime(report.timeRes, order.opened).toISOString();
                                    const arr = eventMap.has(key) ? eventMap.get(key) : [];
                                    eventMap.set(key, arr);

                                    arr.push(order);
                                    orders.push(order);
                                }

                                results.eventMap = eventMap;
                                report.orders = orders;

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
                                    price.ts = DateTime.fromISO(price.ts as any as string).toJSDate();

                                    const indicatorsForTick = new Map<string, number>();
                                    Object.keys(indicators).forEach(k => {
                                        indicatorsForTick.set(k, indicators[k][i]);
                                    });

                                    imap.set(price.ts.toISOString(), indicatorsForTick);
                                    const dp: DataPoint = {
                                        ts: price.ts,
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

                                results.indicators = imap;
                                results.data = data;
                                setResults(results);
                            })
                            .catch(err => alert("There was an error loading the results. The bot may have exploded during operation. Please go back and try again. Feel free to copy the URL and report this as a bug."))
                            ;
                    });
            }
        }
        catch (err) {
            console.error(err);
        }
    }, []);

    const handleToggleHeikinAshi = React.useCallback(() => {
        setDisplayHeikinAshi(!displayHeikinAshi);
    }, [displayHeikinAshi]);

    if (!results) {
        return (
            <Spinner caption1={"Loading bot results..."} caption2={"This may take a moment"} />
        );
    }
    const {
        report,
        prices,
        signals,
        indicators,
        data,
        eventMap,
    } = results as BotResultsApiResponse;
    const { exchange, instanceId, name, orders, symbols } = report;


    report.from = from(report.from);
    report.to = from(report.to);

    const [base, quote] = symbols.split(/\//);
    const tradingViewSymbol = `${exchange}:${base}${quote}`;

    const interval = getIntervalForTimeRes(report.timeRes);
    const runType = "backtest"
    return (
        <Box width={1} height={1}>
            <Grid container className="primo-fullsize" direction="row" style={{ alignContent: "baseline", margin: 0, padding: 0 }}>
                <Grid item container style={{ borderBottom: "2px solid #ddd", padding: "12px" }}>
                    <Grid item className="primo-flex-valign" style={{ marginRight: "8px" }}>
                        <Hashicon value={instanceId} size={32} />
                    </Grid>
                    <Grid item>
                        <Grid item>
                            <b>&#127845;&nbsp;{report.symbols}</b>&nbsp;&#40;{runType}&#41;
                        </Grid>
                        <Grid item>
                            <span>&#129516;&nbsp;<b>{report.genome}</b></span>
                        </Grid>
                        <Grid item>
                            <span>&#129302;&nbsp;{report.instanceId}</span>
                        </Grid>
                        <Grid item>
                            <span>&#128588;&nbsp;{report.name}</span>
                        </Grid>
                    </Grid>
                    <Grid item style={{ marginLeft: "auto", textAlign: "right" }}>
                        <Grid item>
                            <b>{shortDateAndTime(report.from)}</b> - <b>{shortDateAndTime(report.to)}</b>
                        </Grid>
                        <Grid item>
                            <span>gross</span>&nbsp;<b><Amount amount={report.totalGross} symbol={quote} /></b>
                        </Grid>
                        <Grid item style={{ textAlign: "right" }}>
                            <b>{report.length}</b>
                        </Grid>
                    </Grid>
                </Grid>

                <Grid container item spacing={3} style={{ borderBottom: "2px solid #ddd", margin: 0 }}>
                    <BotRunChart
                        data={data}
                        displayHeikinAshi={displayHeikinAshi}
                        eventMap={eventMap}
                        summary={report}
                        signals={signals}
                        indicators={indicators}
                    />
                </Grid>

                <Grid container spacing={2} style={{ borderBottom: "1px solid #ddd" }}>
                    <Grid item style={{ marginLeft: "auto", padding: "8px " }}>
                        <Button onClick={handleToggleHeikinAshi} variant="contained">Heikin Ashi {displayHeikinAshi ? "off" : "on"}</Button>
                    </Grid>
                </Grid>

                <Grid container item spacing={2}>

                    <Grid item style={{ flex: 1 }}>
                        <Card>
                            <CardContent>
                                <Grid container spacing={1} flexDirection="column" className={classNames("primo-info-table")}>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Gross</Grid>
                                        <Grid item style={{ textAlign: "right" }}>
                                            <Amount amount={report.totalGross} symbol={report.quote} />
                                            &nbsp;&#47;&nbsp;
                                            <Percent amount={report.totalGrossPct} />
                                        </Grid>
                                    </Grid>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Avg. Daily Gross</Grid>
                                        <Grid item style={{ textAlign: "right" }}>
                                            <Amount amount={report.avgProfitPerDay} symbol={report.quote} />
                                            &nbsp;&#47;&nbsp;
                                            <Percent amount={report.avgProfitPctPerDay} />
                                        </Grid>
                                    </Grid>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Buy &amp; Hold</Grid>
                                        <Grid item style={{ textAlign: "right" }}>
                                            <Amount amount={report.capital * report.buyAndHoldGrossPct} symbol={report.quote} />
                                            &nbsp;&#47;&nbsp;
                                            <Percent amount={report.buyAndHoldGrossPct} />
                                        </Grid>
                                    </Grid>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Est. Per year (weekly comp.)</Grid>
                                        <Grid item style={{ textAlign: "right" }}><Amount amount={report.estProfitPerYearCompounded} /></Grid>
                                    </Grid>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Sharpe</Grid>
                                        <Grid item style={{ textAlign: "right" }}><Amount amount={report.sharpe.toPrecision(2)} /></Grid>
                                    </Grid>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Trailing Order</Grid>
                                        <Grid item style={{ textAlign: "right" }}><b>{report.trailingOrder ? "yes" : "no"}</b></Grid>
                                    </Grid>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Num. Orders</Grid>
                                        <Grid item style={{ textAlign: "right" }}><b>{report.numOrders}</b></Grid>
                                    </Grid>
                                    <Grid item container className="primo-info-table-item">
                                        <Grid item>Num. Candles</Grid>
                                        <Grid item style={{ textAlign: "right" }}><b>{report.numCandles}</b></Grid>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item style={{ overflow: "auto", margin: 0 }}>
                        <OrderTable orders={orders} />
                    </Grid>
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

export default BotResults;
