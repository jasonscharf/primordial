import React from "react";
import { Grid } from "@mui/material";
import { isNullOrUndefined } from "../../../../common/utils";


export interface CardHeaderProps {
    title?: string;
    subtitle?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = (props) => {
    const { children, subtitle, title } = props;

    const maybeTitle = isNullOrUndefined(title)
        ? void 0
        : <Grid item className="primo-card-header-title"><b>{title}</b></Grid>
        ;

    const maybeSubtitle = isNullOrUndefined(subtitle)
        ? void 0
        : <Grid item className="primo-card-header-title-sub"><b>{subtitle}</b></Grid>
        ;

    return (
        <Grid container className="MuiCardHeader-root primo-card-header">
            <Grid container direction="row" spacing={1} className="MuiCardHeader-content">
                {maybeTitle}
                {maybeSubtitle}
                {children}
            </Grid>
        </Grid>
    );
};
