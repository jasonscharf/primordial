import React from "react";
import { Grid, ListItemText, MenuItem, MenuList } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AndroidIcon from "@mui/icons-material/Android";
import BiotechIcon from "@mui/icons-material/Biotech";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HistoryIcon from "@mui/icons-material/History";
import SettingsSystemDaydreamIcon from "@mui/icons-material/SettingsSystemDaydream";
import TimelineIcon from "@mui/icons-material/Timeline";

export interface AppMenuProps {

}


export const AppMenu = (props: AppMenuProps) => {
    return (
        <Grid className="primo-app-menu">
            <Grid item>
            </Grid>
            <Grid item>
                <MenuList dense>
                    <MenuItem>
                        <AccountTreeIcon />
                        <ListItemText inset>
                            <b>Workspaces</b><br />
                            <span>Current: Default</span>
                        </ListItemText>
                    </MenuItem>
                    <MenuItem>
                        <DashboardIcon />
                        <ListItemText inset>Dashboard</ListItemText>
                    </MenuItem>
                    <MenuItem>
                        <AnalyticsIcon />
                        <ListItemText inset>Analytics</ListItemText>
                    </MenuItem>
                    <MenuItem>
                        <AndroidIcon />
                        <ListItemText inset>Bots</ListItemText>
                    </MenuItem>
                    <MenuItem>
                        <TimelineIcon />
                        <ListItemText inset>Orders</ListItemText>
                    </MenuItem>
                    <MenuItem>
                        <HistoryIcon />
                        <ListItemText inset>Backtests</ListItemText>
                    </MenuItem>
                    <MenuItem>
                        <CloudDownloadIcon />
                        <ListItemText inset>Downloads</ListItemText>
                    </MenuItem>
                    <MenuItem>
                        <SettingsSystemDaydreamIcon />
                        <ListItemText inset>System</ListItemText>
                    </MenuItem>
                </MenuList>
            </Grid>
        </Grid>
    );
};
