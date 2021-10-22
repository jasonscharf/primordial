import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router";
import { Button, Card, CardActions, CardContent, CardHeader, Grid } from "@mui/material";
import { ScreenBase } from "./Screenbase";
import { routes } from "../../../common/app-routing";


const TestsScreen = () => {
    const hist = useHistory();
    const onClickRunBackTest = useCallback(() => {
        hist.push(routes.BACK_TESTS_RUN);
    }, []);

    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader disableTypography title="Tests" />
                    <CardContent>
                        <p>
                            Placeholder for testing screen.
                        </p>
                    </CardContent>
                    <CardActions style={{ marginLeft: "auto"}}>
                        <Button onClick={onClickRunBackTest} size="small" color="primary">
                            Run Backtest&nbsp;&raquo;
                        </Button>
                    </CardActions>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default TestsScreen;
