import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, Grid } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { ScreenBase } from "./Screenbase";


const AnalyticsScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader title="Analytics" />
                    <CardContent>
                        <p>
                            Placeholder for:
                            <ul>
                                <li>Metrics on live bots and forward tests</li>
                                <li>Equity curves</li>
                                <li>P&amp;L overviews</li>
                            </ul>
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default AnalyticsScreen;
