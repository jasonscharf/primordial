import { format } from "d3-format";
import { timeParse } from "d3-time-format";
import { timeFormat } from "d3-time-format";
import { DateTime } from "luxon";
import * as React from "react";
import {
    Annotate,
    LabelAnnotation,
    SvgPathAnnotation,
    elderRay,
    ema,
    discontinuousTimeScaleProviderBuilder,
    Chart,
    ChartCanvas,
    CurrentCoordinate,
    BarSeries,
    CandlestickSeries,
    ElderRaySeries,
    HoverTooltip,
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
import { heikinAshi } from "@react-financial-charts/indicators";
import { BotRunReport } from "../../../common/models/bots/BotSummaryResults";
import { OrderEntity } from "../../../common/entities/OrderEntity";
import { normalizePriceTime, shortDateAndTime } from "../../../common/utils/time";
import { Candle, DataPoint, BotChartProps } from "../models";
import { Order } from "../../../common/models/markets/Order";
import { BarStyles } from "../components/TradingViewWidget";


type BotEvent = any;

class StockChart extends React.Component<BotChartProps> {
    private margin = { left: 0, right: 68, top: 8, bottom: 0 };
    private pricesDisplayFormat = format(".2f");
    private xScaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(
        (d: Candle) => d.date,
    );

    private svgAnnotation = {
        fill: "#2196f3",
        path: () =>
            "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z",
        pathWidth: 12,
        pathHeight: 22,
        tooltip: "Svg Annotation",
        y: ({ yScale, datum }: any) => yScale(datum.high),
    };

    public render() {
        console.log(`Render bot chart`);
        const { data: initialData, indicators, signals, dateTimeFormat = "%HH:%mm:%ss", height, ratio, summary, width } = this.props;

        const signalMap = new Map<string, number>();
        for (let i = 0; i < initialData.length; ++i) {
            const dp = initialData[i];
            signalMap.set(dp.date.toISOString(), signals[i]);
        }

        const orders = ((summary && summary.orders) ? summary.orders : []).map(o => OrderEntity.fromRow(o));

        const eventMap = new Map<string, BotEvent[]>();
        for (const e of orders) {
            e.opened = DateTime.fromISO(e.opened + "").toJSDate();
            e.created = DateTime.fromISO(e.created + "").toJSDate();
            e.updated = DateTime.fromISO(e.updated + "").toJSDate();

            const key = normalizePriceTime(summary.timeRes, e.opened).toISOString();
            const arr = eventMap.has(key) ? eventMap.get(key) : [];
            eventMap.set(key, arr);

            arr.push(e);
        }

        const when = (d: DataPoint) => {
            const key = d.date.toISOString();
            return eventMap.has(key);
        };

        const { margin, xScaleProvider } = this;
        let { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(initialData);

        const max = xAccessor(data[data.length - 1]);
        const min = xAccessor(data[Math.max(0, data.length - 100)]);
        const xExtents = [min, max + 5];

        const gridHeight = height - margin.top - margin.bottom;

        let indicatorNames: string[] = [];
        let numIndicators = 0;
        const hasIndicators = data && data.length > 0;

        if (hasIndicators) {
            indicatorNames = Object.keys(data[0].indicators);
            numIndicators = indicatorNames.length;
        }

        const signalSubchartHeight = 100;
        const indicatorSubchartHeight = 100;
        const elderRayOrigin = (_: number, h: number) => [0, h - signalSubchartHeight * 2];
        const barChartHeight = gridHeight / 4;
        const barChartOrigin = (_: number, h: number) => [0, h - barChartHeight - signalSubchartHeight + 250];
        const chartHeight = gridHeight - signalSubchartHeight - (numIndicators * indicatorSubchartHeight);

        const indicatorXLabel = name => (date) => {
            const key = date.toISOString();
            if (!indicators.has(key)) {
                return null;
            }

            const cators = indicators.get(key);
            const cator = cators.get(name);
            return cator ? `${name}: ${cator.toPrecision(2)}` : null;
        };

        const signalDisplayX = (date) => {
            return "SIG";
        };

        const indicatorCharts = !hasIndicators
            ? null
            : indicatorNames.map((indicator, i) => {
                const series = this.indicatorSeries(indicator);
                return (
                    <Chart
                        key={i}
                        id={i + 5}
                        height={indicatorSubchartHeight}
                        yExtents={[20, 80]}
                        origin={(w, h) => [0, h - indicatorSubchartHeight * (i + 1)]}
                        padding={{ top: 8, bottom: 8 }}
                    >
                        <XAxis showGridLines gridLinesStrokeStyle="#e0e3eb" />
                        <YAxis ticks={4} tickFormat={this.pricesDisplayFormat} />

                        <MouseCoordinateX displayFormat={indicatorXLabel(indicator)} />
                        <MouseCoordinateY rectWidth={margin.right} displayFormat={this.pricesDisplayFormat} />

                        <LineSeries yAccessor={series} />

                        <SingleValueTooltip
                            yAccessor={series}
                            yLabel={indicator}
                            origin={[8, 16]}
                        />

                    </Chart>
                );
            });

        const buildTooltip = ({ currentItem, xAccessor }) => {
            const dt = xAccessor(currentItem);
            const key = dt.toISOString();
            const signalAtDt = signalMap.get(dt.toISOString());

            const cators = indicators.get(key);
            const catorItems = Array.from(cators.entries()).map(([k, v]) => ({
                label: k.toUpperCase(),
                value: cators.get(k).toFixed(2),
            }));

            const events = eventMap.has(key) ? eventMap.get(key) : [];
            const eventItems = events.map(e => {
                const o = e as Order;
                return ({
                    label: o.typeId.toUpperCase(),
                    value: o.price.round(8).toString(),
                });
            });

            const content = {
                x: shortDateAndTime(dt),
                y: [
                    ...eventItems,
                    {
                        label: "signal",
                        value: signalAtDt,// && this.numberFormat(currentItem.open),
                    },
                    ...catorItems,
                    {
                        label: "open",
                        value: currentItem.open,// && this.numberFormat(currentItem.open),
                    },
                    {
                        label: "high",
                        value: currentItem.high// && this.numberFormat(currentItem.high),
                    },
                    {
                        label: "low",
                        value: currentItem.low// && this.numberFormat(currentItem.low),
                    },
                    {
                        label: "close",
                        value: currentItem.close// && this.numberFormat(currentItem.close),
                    },
                ]
            };
            return content;
        };

        const useHA = true;
        if (useHA) {
            const calculator = heikinAshi();
            data = calculator(data);
        }

        return (
            <ChartCanvas
                height={height}
                ratio={ratio}
                width={width}
                margin={margin}
                data={data}
                displayXAccessor={displayXAccessor}
                seriesName="Data"
                xScale={xScale}
                xAccessor={xAccessor}
                xExtents={xExtents}
                zoomAnchor={lastVisibleItemBasedZoomAnchor}
            >

                <Chart id={1} height={chartHeight} yExtents={this.candleChartExtents}>
                    <XAxis showGridLines showTicks={true} showTickLabel={true} />
                    <YAxis showGridLines tickFormat={this.pricesDisplayFormat} />
                    <CandlestickSeries />
                    <MouseCoordinateY rectWidth={margin.right} displayFormat={this.pricesDisplayFormat} />
                    <EdgeIndicator
                        itemType="last"
                        rectWidth={margin.right}
                        fill={this.openCloseColor}
                        lineStroke={this.openCloseColor}
                        displayFormat={this.pricesDisplayFormat}
                        yAccessor={this.yEdgeIndicator}
                    />

                    {this.svgAnnotation && (
                        <Annotate with={SvgPathAnnotation} usingProps={this.svgAnnotation} when={when} />
                    )}

                    <HoverTooltip
                        yAccessor={this.yEdgeIndicator}
                        tooltip={{
                            content: buildTooltip,
                        }}
                    />
                    <OHLCTooltip origin={[8, 16]} />
                </Chart>
                {/*
                <Chart id={2} height={barChartHeight} origin={barChartOrigin} yExtents={this.barChartExtents}>
                    <BarSeries fillStyle={this.volumeColor} yAccessor={this.volumeSeries} />
                </Chart>*/}

                <Chart id={3} height={200} origin={barChartOrigin} yExtents={[0, 100]}>
                    <BarSeries fillStyle={this.volumeColor} yAccessor={this.signalSeries} />
                </Chart>

                <Chart
                    id={4}
                    height={signalSubchartHeight}
                    yExtents={[-1, 1]}
                    origin={elderRayOrigin}
                    padding={{ top: 8, bottom: 8 }}
                >
                    <XAxis showGridLines={true} gridLinesStrokeStyle="#e0e3eb" />
                    <YAxis ticks={4} tickFormat={this.pricesDisplayFormat} />

                    <MouseCoordinateX displayFormat={signalDisplayX} />
                    <MouseCoordinateY rectWidth={margin.right} displayFormat={this.pricesDisplayFormat} />

                    <LineSeries yAccessor={this.signalSeries} />

                    <SingleValueTooltip
                        yAccessor={this.signalSeries}
                        yLabel="Signal"
                        origin={[8, 16]}
                    />

                </Chart>

                {indicatorCharts}
                <CrossHairCursor />
            </ChartCanvas>
        );
    }

    private readonly barChartExtents = (data: Candle) => {
        return data.volume;
    };

    private readonly candleChartExtents = (data: Candle) => {
        return [data.high, data.low];
    };

    private readonly yEdgeIndicator = (data: Candle) => {
        return data.close;
    };

    private readonly volumeColor = (data: Candle) => {
        return data.close > data.open ? "rgba(38, 166, 154, 0.3)" : "rgba(239, 83, 80, 0.3)";
    };

    private readonly volumeSeries = (data: Candle) => {
        return data.volume;
    };

    private readonly rsi = (data) => {
        return data.indicators["RSI"];
    };

    private readonly indicatorSeries = (name) => {
        return data => {
            return data.indicators[name];
        }
    }

    private readonly signalSeries = (data) => {
        return data.signal;
    };

    private readonly openCloseColor = (data: Candle) => {
        return data.close > data.open ? "#26a69a" : "#ef5350";
    };

    private readonly when = (data: Candle) => {
        return data.date.getDay() === 1;
    };
}

export default (withSize({ style: { minHeight: 600 } })(withDeviceRatio()(StockChart)));

const parseDate = timeParse("%Y-%m-%d");

const parseData = () => {
    return (d: any) => {
        const date = parseDate(d.date);
        if (date === null) {
            d.date = new Date(Number(d.date));
        } else {
            d.date = new Date(date);
        }

        for (const key in d) {
            if (key !== "date" && Object.prototype.hasOwnProperty.call(d, key)) {
                d[key] = +d[key];
            }
        }

        return d as Candle;
    };
};