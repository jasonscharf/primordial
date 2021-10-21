import React, { useCallback, useEffect, useState } from "react";
import { Box } from "@mui/system";
import { Card, CardContent, CardHeader, Grid, Typography } from "@mui/material";
import { RunningBotTable } from "../components/dash/RunningBotTable";
import { ScreenBase } from "./Screenbase";


const DashScreen = () => {
    return (
        <ScreenBase>
            <Box width={1} height={1}>
                <Grid container spacing={1} direction="row" className="primo-fullsize primo-dash">
                    <Grid item xs={12} lg={3}>
                        <Card>
                            <CardHeader disableTypography title="Active Forward Tests">

                            </CardHeader>
                            <CardContent>
                                <RunningBotTable mode="test-forward" />
                            </CardContent>
                        </Card>
                    </Grid>
                    {/*
                <Grid item xs={12}>
                    <Card title="Quick Links">
                    <CardContent>
                            <Typography color="text.secondary" component="b">
                                <div><b>Quick Links</b></div>
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>*/}
                </Grid>
            </Box>
        </ScreenBase>
    );
};

export default DashScreen;
