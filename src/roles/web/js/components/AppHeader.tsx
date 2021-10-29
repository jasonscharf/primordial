import React, { useEffect } from "react";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { Avatar, Grid, Typography } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material";
import { If } from "./primitives/If";


export interface HeaderProps {
    onTapMenu: () => void;
}

export const AppHeader = (props: HeaderProps) => {
    const theme = useTheme();
    const { onTapMenu } = props;
    return (
        <Grid container direction="row" className="primo-app-header" sx={theme.utils.raisedHeader}>
            <Grid item>
                <button onClick={() => onTapMenu && onTapMenu()}>
                    <MenuIcon />
                </button>
            </Grid>
            <Grid item>
                <Grid item className="primo-app-header-title">
                    <h1>Primordial</h1>
                </Grid>
            </Grid>
            <If>
                <Grid item sx={{ ...theme.utils.smaller, marginLeft: "1em", opacity: 0.6 }}>
                    <Grid item>
                        <AccountTreeIcon fontSize="small" />
                        &nbsp;
                        <span>Default</span>
                    </Grid>
                </Grid>
            </If >
            <Grid item style={{ textAlign: "right", flex: 1 }}><b>System User</b></Grid>
            <Grid item className="primo-app-header-user-menu">
                <Avatar sx={{ width: 24, height: 24 }}>S</Avatar>
            </Grid>
        </Grid >
    );
};
