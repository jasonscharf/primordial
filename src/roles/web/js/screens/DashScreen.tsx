import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Button, Card, CardActions, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import { RunningBotTable } from "../components/dash/RunningBotTable";
import { ScreenBase } from "./Screenbase";
import { routes } from "../../../common/app-routing";


const DashScreen = () => {
    const hist = useHistory();
    const onClickViewAll = useCallback(() => {
        hist.push(routes.FORWARD_TESTS);
    }, []);

    return (
        <ScreenBase>
            <Grid container spacing={1} direction="row" className="primo-fullsize primo-dash">
                <Grid item xs={12} lg={3}>
                    <Card>
                        <CardHeader disableTypography title="Active Forward Tests" />
                        <CardContent>
                            <RunningBotTable mode="test-forward" />
                        </CardContent>
                        <CardActions>
                            <Button onClick={onClickViewAll} size="small" color="primary">
                                View All
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
        </ScreenBase>
    );
};

export default DashScreen;
