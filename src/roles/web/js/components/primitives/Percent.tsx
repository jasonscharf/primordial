import "react-dom";
import React from "react";
import classes from "classnames";


export enum PercentStyle {
    NEUTRAL = "neutral",
    NEGATIVE = "negative",
    POSITIVE = "positive",
};

export interface PercentProps {
    amount?: number;
}

export const Percent = (props: PercentProps) => {
    const { amount } = props;

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


    const normalizedAmount = (amount * 100).toPrecision(2);
    return (
        <div className={classes("primo-percent", className)}>
            <span>{normalizedAmount}</span>&nbsp;&#37;
        </div>
    )
};
