import "react-dom";
import React, { useContext, useEffect, useState } from "react";
import { Amount } from "../primitives/Amount";
import { Chip, Grid } from "@mui/material";
import { GeneticBotFsmState } from "../../../../common/models/bots/BotState";
import { GenotypeInstanceDescriptor } from "../../../../common/models/bots/GenotypeInstanceDescriptor";
import { GenotypeInstanceDescriptorEntity } from "../../../../common/entities/GenotypeInstanceDescriptorEntity";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { InfoContext } from "../../contexts";
import { SpinnerMini } from "../primitives/SpinnerMini";
import { presentBotState } from "../../../../common/utils/presentation";
import { useApiRequestEffect } from "../../hooks/useApiRequestEffect";


export interface InstanceListProps {
    workspaceId?: string;
    strategyId?: string;
    mode: "test-back" | "test-forward" | "live";
    limit?: number;
}

export const InstanceList = (props: InstanceListProps) => {
    const [descriptors, setDescriptors] = useState<GenotypeInstanceDescriptor[]>([]);
    const info = useContext(InfoContext);

    const [, isLoading] = useApiRequestEffect(async (client) => {
        if (!info) {
            return;
        }

        const { defaultStrategy, defaultWorkspace } = info;
        const { limit, mode } = props;

        const workspaceId = props.workspaceId || defaultWorkspace;
        const strategyId = props.strategyId || defaultStrategy;

        if (mode === 'test-forward') {
            const { data } = await client.workspaces.getRunningInstances(workspaceId, strategyId, mode, { limit });
            const items = data.map(item => GenotypeInstanceDescriptorEntity.fromRow(item as any as GenotypeInstanceDescriptor));
            setDescriptors(items);
        }
        else if (mode === 'test-back') {
            const { data } = await client.workspaces.getTopBacktests(workspaceId, strategyId, { limit });
            const items = data.map(item => GenotypeInstanceDescriptorEntity.fromRow(item as any as GenotypeInstanceDescriptor));
            setDescriptors(items);
        }

    }, [info]);

    if (isLoading) {
        return <SpinnerMini />
    }

    return (
        <>
            {descriptors.length === 0
                ? (<b>No genotypes found</b>)
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
                            <Amount amount={d.totalProfit} symbol={d.quoteSymbolId} />
                        </Grid>
                    </Grid>))
            }
        </>
    );
};
