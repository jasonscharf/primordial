import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, Grid } from "@mui/material";
import { ScreenBase } from "./Screenbase";


const TestsScreen = () => {
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
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default TestsScreen;
