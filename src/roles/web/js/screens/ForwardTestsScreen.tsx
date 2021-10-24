import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, Grid } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { ScreenBase } from "./Screenbase";


const ForwardTestsScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader title="Forward Tests" />
                    <CardContent>
                        <p>
                            Placeholder for forward tests screen.
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default ForwardTestsScreen;
