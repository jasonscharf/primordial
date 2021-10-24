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
        <Grid container direction="column" className="primo-screen-base">
            <Grid item>
                <AppHeader onTapMenu={() => handleDrawerToggle()} />
            </Grid>
            <Grid item className="primo-screen-base-body">
                <Grid item>
                    {maybeDrawer}
                </Grid>
                <Grid item style={{ maxWidth: "100%", flex: 1 }}>
                    {children}
                </Grid>
            </Grid>
            <Grid item>
                <AppFooter />
            </Grid>
        </Grid>
    );
}
