import "react-dom";
import React, { useContext, useEffect, useState } from "react";
import { Amount } from "../primitives/Amount";
import { Chip, Grid } from "@mui/material";
import { GeneticBotFsmState } from "../../../../common/models/bots/BotState";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { InfoContext } from "../../contexts";
import { RunningBotDescriptor } from "../../client";
import { presentBotState } from "../../../../common/utils/presentation";
import { useApiRequestEffect } from "../../hooks/useApiRequestEffect";

export interface RunningBotTableProps {
    workspaceId?: string;
    strategyId?: string;
    mode: "test-forward" | "live";
}

export const RunningBotTable = (props: RunningBotTableProps) => {
    const [descriptors, setDescriptors] = useState<RunningBotDescriptor[]>([]);
    const info = useContext(InfoContext);

    useApiRequestEffect(async (client) => {
        if (!info) {
            return;
        }

        const { defaultStrategy, defaultWorkspace } = info;
        let mode = props.mode;

        const workspaceId = props.workspaceId || defaultWorkspace;
        const strategyId = props.strategyId || defaultStrategy;

        const { data } = await client.workspaces.getBots(workspaceId, strategyId, mode);
        setDescriptors(data);

    }, [info]);

    return (
        <>
            {descriptors.length === 0
                ? (<b>There are no active forward tests</b>)
                : descriptors.map((d, i) => (
                    <Grid key={i} item container spacing={1} style={{ flexWrap: "nowrap", marginBottom: "1em" }}>
                        <Grid item style={{ marginTop: "auto", marginBottom: "auto" }}>
                            <Hashicon value={d.id} size={32} />
                        </Grid>
                        <Grid item style={{}} className="primo-ellipses">
                            {/*
                            <Grid item >
                                <b>{d.name}</b>
                            </Grid>*/}
                            <Grid item>
                                <b>{d.symbols}</b>&nbsp;@&nbsp;<b>{d.resId}</b>
                            </Grid>
                            <Grid item>
                                <span>{d.genome}</span>
                            </Grid>
                            <Grid item>
                                <b>{presentBotState(d.fsmState as any as GeneticBotFsmState)}</b>
                            </Grid>
                        </Grid>
                        <Grid item style={{ marginLeft: "auto" }}>
                            <Amount amount={d.gross} symbol={d.quoteSymbolId} />
                        </Grid>
                    </Grid>))
            }
        </>
    );
};
