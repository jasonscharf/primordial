import * as React from "react";
import { CircularProgress, Grid } from "@mui/material"


export interface MiniSpinnerProps {
    caption1?: string;
    caption2?: string;
}

export const SpinnerMini = (props: MiniSpinnerProps) => {
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
        <Grid item container className="primo-spinner-mini" alignItems="center" alignContent="stretch" style={{ textAlign: "center" }}>
            <Grid item style={{ flex: 1 }}>
                <CircularProgress  color="inherit" style={{ width: "64px", height: "64px" }} />
                {maybeCaption}
                {maybeSubCaption}
            </Grid>
        </Grid>
    )
}
