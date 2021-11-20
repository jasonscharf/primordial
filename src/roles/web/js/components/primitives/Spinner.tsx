import * as React from "react";
import { CircularProgress, Grid } from "@mui/material"


export interface SpinnerProps {
    caption1?: string;
    caption2?: string;
}

export const Spinner = (props: SpinnerProps) => {
    const { caption1, caption2 } = props;
    const maybeCaption = !caption1
        ? null
        : (
            <h3>{caption1}</h3>
        );
    const maybeSubCaption = !caption2
        ? null
        : (
            <h5>{caption2}</h5>
        );
    return (
        <Grid item container className="primo-spinner" alignItems="center" alignContent="stretch" style={{ height: "100vh", textAlign: "center" }}>
            <Grid item style={{ flex: 1 }}>
                <CircularProgress color="primary" style={{ width: "100px", height: "100px" }} />
                {maybeCaption}
                {maybeSubCaption}
            </Grid>
        </Grid>
    )
}
