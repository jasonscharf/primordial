import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, Grid } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { ScreenBase } from "./Screenbase";


const DataScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader title="Data" />
                    <CardContent>
                        <p>
                            Placeholder for data screen.
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default DataScreen;
