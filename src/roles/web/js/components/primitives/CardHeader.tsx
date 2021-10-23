import React from "react";
import { Grid } from "@mui/material";
import { isNullOrUndefined } from "../../../../common/utils";


export interface CardHeaderProps {
    title?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = (props) => {
    const { children, title } = props;

    const maybeTitle = isNullOrUndefined(title)
        ? void 0
        : <Grid item><b>{title}</b></Grid>
        ;

    return (
        <Grid container direction="row" className="MuiCardHeader-root primo-card-header">
            <Grid item className="MuiCardHeader-content">
                {maybeTitle}
                {children}
            </Grid>
        </Grid>
    );
};
