import "react-dom";
import React from "react";
import classes from "classnames";
import { Grid, useTheme } from "@mui/material";
import { BigNum } from "../../../../common/numbers";
import { isNullOrUndefined } from "../../../../common/utils";


export enum AmountStyle {
    NEUTRAL = "neutral",
    NEGATIVE = "negative",
    POSITIVE = "positive",
};

export interface AmountProps {
    amount?: string | number | BigNum;
    symbol?: string;
    style?: string;
    neutral?: boolean;
    big?: boolean;
    showPlus?: boolean;
}

export const Amount = (props: AmountProps) => {
    const theme = useTheme();

    let { amount, big, neutral, showPlus, style, symbol } = props;
    let className: string = "";

    if (isNullOrUndefined(amount)) {
        neutral = true;
    }
    else if (amount instanceof BigNum) {
        amount = amount.round(11).toNumber();
    }
    else if (typeof amount === "string") {
        amount = parseFloat(amount.toString())
    }

    if (style) {
        className = `primo-${style}`;
    }
    else {
        if (neutral) {
            className = "primo-neutral";
        }
        else if (amount < 0) {
            className = "primo-negative";
        }
        else if (amount > 0) {
            className = "primo-positive";
        }
        else {
            className = "primo-neutral";
        }
    }

    let amountStr = "";

    if (isNullOrUndefined(amount)) {
        amountStr = '---';
    }
    else {
        // TODO: Rm. Total hack. Need currency info and conversion facilities.
        if (!isNullOrUndefined(amount)) {
            if (symbol && symbol.indexOf("USD") > -1) {
                amountStr = (amount as number).toFixed(2).toString();
            }
            else {
                amountStr = (amount as number).toString();
            }
        }
    }

    if (showPlus && amount > 0) {
        amountStr = "+" + amountStr;
    }

    const maybeSymbol = symbol ? `${symbol}` : null;
    const emphasis = big ? theme.utils.emphasis : {};
    return (
        <Grid item className={classes("primo-amount", className)} sx={emphasis}>
            <span>{amountStr}</span>
            &nbsp;{maybeSymbol}
        </Grid>
    )
};
