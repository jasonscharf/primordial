import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, Grid } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { ScreenBase } from "./Screenbase";


const CapitalScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader title="Capital Management" />
                    <CardContent>
                        <p>
                            Placeholder for managing capital.
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default CapitalScreen;
