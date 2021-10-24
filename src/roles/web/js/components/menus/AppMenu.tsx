import React, { useCallback } from "react";
import { Grid, ListItemText, MenuItem, MenuList } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import AndroidIcon from "@mui/icons-material/Android";
import BiotechIcon from "@mui/icons-material/Biotech";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HistoryIcon from "@mui/icons-material/History";
import LocalAtmIcon from '@mui/icons-material/LocalAtm';
import SettingsSystemDaydreamIcon from "@mui/icons-material/SettingsSystemDaydream";
import TimelineIcon from "@mui/icons-material/Timeline";
import { routes } from "../../../../common/app-routing";
import { useHistory } from "react-router";

export interface AppMenuProps {

}


export const AppMenu = (props: AppMenuProps) => {
    const hist = useHistory();
    const nav = useCallback((route: string) => {
        hist.push(route);
    }, []);

    return (
        <Grid className="primo-app-menu">
            <Grid item>
            </Grid>
            <Grid item>
                <MenuList dense>
                    <MenuItem onClick={() => nav(routes.WORKSPACE_LIST)}>
                        <AccountTreeIcon />
                        <ListItemText inset>
                            <b>Workspaces</b><br />
                            <span>Current: Default</span>
                        </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.DASH)}>
                        <DashboardIcon />
                        <ListItemText inset>Dashboard</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.ANALYTICS)}>
                        <AnalyticsIcon />
                        <ListItemText inset>Analytics</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.CAPITAL)}>
                        <LocalAtmIcon />
                        <ListItemText inset>Capital</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.GENOTYPES)}>
                        <AcUnitIcon />
                        <ListItemText inset>Genotypes</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.ORDERS)}>
                        <TimelineIcon />
                        <ListItemText inset>Orders</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.TESTS)}>
                        <BiotechIcon />
                        <ListItemText inset>Testing</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.DATA)}>
                        <CloudDownloadIcon />
                        <ListItemText inset>Data</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={() => nav(routes.SYSTEM)}>
                        <SettingsSystemDaydreamIcon />
                        <ListItemText inset>System</ListItemText>
                    </MenuItem>
                </MenuList>
            </Grid>
        </Grid>
    );
};
