import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router";
import { Button, Card, CardActions, CardContent, FormControlLabel, FormGroup, Grid, makeStyles, MenuItem, Select, Switch, TableSortLabel } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { InstanceList } from "../components/dash/InstanceList";
import { QueryOrderDirection } from "../client";
import { ScreenBase } from "./Screenbase";
import { routes } from "../../../common/app-routing";
import { BACKTEST_SORT_OPTIONS } from "../../../common/constants";


export const BACKTEST_LIMIT = 25;
const TestsScreen = () => {
    const [backtestOrder, setBacktestOrder] = useState("totalProfit");
    const [backtestOrderDir, setBacktestOrderDir] = useState<QueryOrderDirection>(QueryOrderDirection.DESC);

    const hist = useHistory();


    const onClickViewAll = useCallback(() => {
        hist.push(routes.FORWARD_TESTS);
    }, []);

    const onClickRunBackTest = useCallback(() => {
        hist.push(routes.BACK_TESTS_RUN);
    }, []);

    const handleChangeBacktestSortOrder = useCallback((order) => {
        setBacktestOrder(order);
    }, []);

    const handleChangeOrderDir = useCallback((val) => {
        setBacktestOrderDir(val === QueryOrderDirection.DESC ? QueryOrderDirection.DESC : QueryOrderDirection.ASC);
    }, []);


    const backtestSortOptions = useMemo(() => {
        return BACKTEST_SORT_OPTIONS;
    }, [BACKTEST_SORT_OPTIONS]);


    return (
        <ScreenBase>
            <Grid container direction="row">
                {
                    <Grid item xs={12} lg={6}>
                        <Grid item>
                            <Card>
                                <CardHeader title="Run Tests" />
                                <CardActions style={{ marginLeft: "auto" }}>
                                    <Button onClick={onClickRunBackTest} size="small" color="primary">
                                        Run Backtest&nbsp;&raquo;
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                        <Grid item>
                            <Card>
                                <CardHeader title="Active Forward Tests">

                                </CardHeader>
                                <CardContent>
                                    <InstanceList mode="test-forward" limit={10} noItems="No active forward tests" />
                                </CardContent>
                                <CardActions>
                                    <Button onClick={onClickViewAll} size="small" color="primary">
                                        View All&nbsp;&raquo;
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    </Grid>}
                <Grid item xs={12} lg={6}>
                    <Card>
                        <CardHeader title="Top Backtests" subtitle={`(${BACKTEST_LIMIT})`}>
                            <Grid item sx={{ marginLeft: "auto" }}>
                                <TableSortLabel
                                    onClick={evt => handleChangeOrderDir(backtestOrderDir === "ASC" ? "DESC" : "ASC")}
                                    direction={backtestOrderDir.toLowerCase() as any}>{backtestOrderDir}</TableSortLabel>

                                <Select
                                    size={"small"}
                                    sx={{ fontSize: "0.8rem"}}
                                    defaultValue={"totalProfit"}
                                    onChange={evt => handleChangeBacktestSortOrder(evt.target.value)}>
                                    {Object.keys(backtestSortOptions).map(opt => (
                                        <MenuItem value={opt}>{backtestSortOptions[opt]}</MenuItem>
                                    ))}
                                </Select>
                            </Grid>
                        </CardHeader>
                        <CardContent>
                            <InstanceList
                                mode='test-back'
                                noItems="No backtests found"
                                orderBy={backtestOrder}
                                orderDir={backtestOrderDir}
                                limit={BACKTEST_LIMIT} />
                        </CardContent>
                        <CardActions style={{ marginLeft: "auto" }}>
                            <Button onClick={onClickRunBackTest} size="small" color="primary">
                                Run Backtest&nbsp;&raquo;
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
        </ScreenBase>
    );
};

export default TestsScreen;
