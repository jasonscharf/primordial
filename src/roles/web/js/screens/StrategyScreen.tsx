import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, Grid } from "@mui/material";
import { ScreenBase } from "./Screenbase";


const StrategyScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader disableTypography title="About Strategies" />
                    <CardContent>
                        <p>
                            <em>Strategies</em> are groups of trading bots, and settings that control risk management,
                            market condition parameters, and other configuration values.
                        </p>
                        <p>
                            Strategies allow you to organize and report on groups of related bots.
                            For example, you may have a strategy for low-risk, long-running bots, and another one
                            for newer, more volatile bots.
                        </p>
                        <p>
                            Strategies define settings, such as a strategy-wide stop loss computed from the drawdowns of
                            all bots in the strategy.
                        </p>
                        <p>
                            For now, only one strategy is supported and the concept of multiple can be ignored.
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default StrategyScreen;
