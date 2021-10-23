import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, Grid } from "@mui/material";
import { CardHeader } from "../components/primitives/CardHeader";
import { ScreenBase } from "./Screenbase";


const WorkspaceScreen = () => {
    return (
        <ScreenBase>
            <Grid item xs={12} lg={4}>
                <Card>
                    <CardHeader title="About Workspaces">

                    </CardHeader>
                    <CardContent>
                        <p>
                            <em>Workspaces</em> are the top-level organizational entity in Primordial.
                        </p>
                        <p>
                            Workspaces can be thought of as folders that contain <em>Strategies</em>,
                            which are groups of bots, along with settings dictating how those
                            bots should manage risk, market conditions, and other aspects.
                        </p>
                        <p>
                            For now, the system has 1 user ("System User"), who has 1 workspace ("Default Workspace"),
                            and one strategy ("Default Strategy").
                        </p>
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export default WorkspaceScreen;
