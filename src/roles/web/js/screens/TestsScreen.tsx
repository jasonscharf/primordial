import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Button, Card, CardActions, CardContent, Grid } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { InstanceList } from "../components/dash/InstanceList";
import { ScreenBase } from "./Screenbase";
import { routes } from "../../../common/app-routing";


const TestsScreen = () => {
    const hist = useHistory();

    const onClickViewAll = useCallback(() => {
        hist.push(routes.FORWARD_TESTS);
    }, []);

    const onClickRunBackTest = useCallback(() => {
        hist.push(routes.BACK_TESTS_RUN);
    }, []);

    return (
        <ScreenBase>
            <Grid container direction="row">
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
                            <CardHeader title="Active Forward Tests" />
                            <CardContent>
                                <InstanceList mode="test-forward" limit={10} />
                            </CardContent>
                            <CardActions>
                                <Button onClick={onClickViewAll} size="small" color="primary">
                                    View All&nbsp;&raquo;
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Card>
                        <CardHeader title="Top Backtests" subtitle={`(${100})`}>
                        </CardHeader>
                        <CardContent>
                            <InstanceList mode='test-back' limit={100} />
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
