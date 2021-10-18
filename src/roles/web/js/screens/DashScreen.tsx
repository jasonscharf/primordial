import React, { useCallback, useEffect, useState } from "react";
import { Box } from "@mui/system";
import { Card, CardContent, Grid, Typography } from "@mui/material";
import { RunningBotTable } from "../components/dash/RunningBotTable";


const DashScreen = () => {
    return (
        <Box width={1} height={1}>
            <Grid container spacing={1} className="primo-fullsize primo-dash primo-padding-small" direction="row">
                <Grid item xs={12}>
                    <Card title="Forward tests">
                        <CardContent>
                            <Typography color="text.secondary" component="b">
                                <div><b>Active Forward Tests</b></div>
                                <RunningBotTable mode="test-forward" />
                            </Typography>
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
    );
};

export default DashScreen;
