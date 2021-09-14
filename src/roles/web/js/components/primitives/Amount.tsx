import "react-dom";
import React from "react";
import classes from "classnames";


export enum AmountStyle {
    NEUTRAL = "neutral",
    NEGATIVE = "negative",
    POSITIVE = "positive",
};

export interface AmountProps {
    amount?: number;
    symbol?: string;
    style?: string;
}

export const Amount = (props: AmountProps) => {
    const { amount, style, symbol } = props;

    let className: string = "";

    if (style) {
        className = `primo-${style}`;
    }
    else {
        if (amount < 0) {
            className = "primo-negative";
        }
        else if (amount > 0) {
            className = "primo-positive";
        }
        else {
            className = "primo-neutral";
        }
    }

    let amountStr ="";
    const parsedAmount = parseFloat(amount.toString());

    // TODO: Rm. Total hack. Need currency info and conversion facilities.
    if (symbol.indexOf("USD") > -1) {
        amountStr = parsedAmount.toFixed(2).toString();
    }
    else {
        amountStr = parsedAmount.toFixed(8).toString();
    }

    const maybeSymbol = symbol ? `${symbol}` : null;
    return (
        <div className={classes("primo-amount", className)}>
            <span>{amountStr}</span>
            &nbsp;{maybeSymbol}
        </div>
    )
};
