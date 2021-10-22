import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, Grid } from "@mui/material";
import { ScreenBase } from "./Screenbase";


const BackTestsScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader disableTypography title="Back Tests" />
                    <CardContent>
                        <p>
                            Placeholder for back tests screen.
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default BackTestsScreen;
