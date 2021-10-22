import React, { useCallback, useState } from "react";
import { AppBar, Grid, IconButton, Toolbar, Typography } from "@mui/material";
import { AppFooter } from "../components/AppFooter";
import { AppHeader } from "../components/AppHeader";
import { AppMenu } from "../components/menus/AppMenu";


export interface ScreenBaseProps {
    modal?: boolean;
}

export const drawerWidth = 240;
export const ScreenBase: React.FC<ScreenBaseProps> = props => {
    const { children } = props;

    const [drawerOpen, setDrawerOpen] = useState(false);
    const maybeDrawer = drawerOpen && <AppMenu />;

    const handleDrawerToggle = useCallback(() => {
        setDrawerOpen(!drawerOpen);
    }, [drawerOpen]);

    return (
        <Grid container direction="column" style={{
            height: "100vh",
            display: "flex"
        }}>
            <Grid item>
                <AppHeader onTapMenu={() => handleDrawerToggle()} />
            </Grid>
            <Grid item direction="row" style={{ display: "flex", flex: 1 }}>
                <Grid item>
                    {maybeDrawer}
                </Grid>
                <Grid item style={{ flex: 1 }}>
                    {children}
                </Grid>
            </Grid>
            <Grid item>
                <AppFooter />
            </Grid>
        </Grid>
    );
}
