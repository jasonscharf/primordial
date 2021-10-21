import React, { useEffect } from "react";
import { Avatar, Grid } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";


export interface HeaderProps {
    onTapMenu: () => void;
}

export const AppHeader = (props: HeaderProps) => {
    const { onTapMenu } = props;
    return (
        <Grid container className="primo-app-header" direction="row">
            <Grid item>
                <button onClick={() => onTapMenu && onTapMenu()}>
                    <MenuIcon />
                </button>
            </Grid>
            <Grid item direction="column">
                <Grid item className="primo-app-header-title">
                    <h1>Primordial</h1>
                    <span></span>
                </Grid>
            </Grid>
            <Grid item style={{ textAlign: "right", flex: 1 }}><b>System User</b></Grid>
            <Grid item className="primo-app-header-user-menu">
                <Avatar sx={{ width: 24, height: 24 }}>S</Avatar>
            </Grid>
        </Grid >
    );
};
