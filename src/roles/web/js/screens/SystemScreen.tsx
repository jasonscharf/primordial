import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, Grid } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { ScreenBase } from "./Screenbase";


const StrategyScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader title="System Info" />
                    <CardContent>
                        <p>
                            Placeholder for system info; health, top-level metrics, performance, logs.
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default StrategyScreen;
