import { GenotypeInstanceDescriptor } from "./models/bots/GenotypeInstanceDescriptor";


type PropSet<T> = {
    [Property in keyof T];
};

type PartialPropSet<T> = {
    [Property in keyof Partial<T>];
};

export const DEFAULT_INSTANCE_SORT_FIELD = "totalProfit";

export const INSTANCE_SORT_OPTIONS: PartialPropSet<GenotypeInstanceDescriptor> = {
    totalProfit: "Total Profit",
    updated: "Updated",
    name: "Name",
    baseSymbolId: "Base",
    quoteSymbolId: "Quote",
};

export const BACKTEST_SORT_OPTIONS: PartialPropSet<GenotypeInstanceDescriptor> = {
    ...INSTANCE_SORT_OPTIONS,
    duration: "Duration",
    numOrders: "Num. Orders",
    totalFees: "Fees",
    from: "From",
    to: "To",
};
