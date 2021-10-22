import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, Grid } from "@mui/material";
import { ScreenBase } from "./Screenbase";


const BotScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader disableTypography title="Genotype Management" />
                    <CardContent>
                        <p>
                            Placeholder for genotype management screen.
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default BotScreen;
