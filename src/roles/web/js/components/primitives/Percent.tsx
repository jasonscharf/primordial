import "react-dom";
import React from "react";
import { Grid, useTheme } from "@mui/material";
import { BigNum } from "../../../../common/numbers";
import classes from "classnames";


export enum PercentStyle {
    NEUTRAL = "neutral",
    NEGATIVE = "negative",
    POSITIVE = "positive",
};

export interface PercentProps {
    amount?: number | BigNum;
    big?: boolean;
}

export const Percent = (props: PercentProps) => {
    const theme = useTheme();
    let { amount, big } = props;

    if (amount instanceof BigNum) {
        amount = amount.round(11).toNumber();
    }

    let className: string = "";
    if (amount < 0) {
        className = "primo-negative";
    }
    else if (amount > 0) {
        className = "primo-positive";
    }
    else {
        className = "primo-neutral";
    }

    let normalizedAmount = (amount * 100).toPrecision(2);
    if (amount > 0) {
        normalizedAmount = "+" + normalizedAmount;
    }
    const emphasis = big ? theme.utils.emphasis : {};
    return (
        <Grid item className={classes("primo-percent", className)} sx={emphasis}>
            <span>{normalizedAmount}</span>&#37;
        </Grid>
    )
};
