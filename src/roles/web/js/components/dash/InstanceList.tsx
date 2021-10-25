import "react-dom";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { generatePath, useHistory } from "react-router";
import { Chip, Grid, List, ListItem, Table, TableBody, TableRow } from "@mui/material";
import { CommonQueryArgs } from "../../../../common/models/CommonQueryArgs";
import { GenotypeInstanceDescriptor } from "../../../../common/models/bots/GenotypeInstanceDescriptor";
import { GenotypeInstanceDescriptorEntity } from "../../../../common/entities/GenotypeInstanceDescriptorEntity";
import { If } from "../primitives/If";
import { InfoContext } from "../../contexts";
import { SpinnerMini } from "../primitives/SpinnerMini";
import { useApiRequestEffect } from "../../hooks/useApiRequestEffect";
import { QueryOrderDirection } from "../../client";
import { InstanceOverviewItem } from "../genotypes/InstanceOverviewItem";


export interface InstanceListProps {
    workspaceId?: string;
    strategyId?: string;
    mode: "test-back" | "test-forward" | "live";
    limit?: number;
    orderBy?: string;
    orderDir?: QueryOrderDirection;
    noItems?: string;

}

export const InstanceList = (props: InstanceListProps) => {
    const { limit, mode, noItems, orderBy, orderDir } = props;
    const [descriptors, setDescriptors] = useState<GenotypeInstanceDescriptor[]>([]);
    const info = useContext(InfoContext);
    const hist = useHistory();



    const [, isLoading] = useApiRequestEffect(async (client) => {
        if (!info) {
            return;
        }

        const { defaultStrategy, defaultWorkspace } = info;

        const workspaceId = props.workspaceId || defaultWorkspace;
        const strategyId = props.strategyId || defaultStrategy;

        const args: CommonQueryArgs = {
            limit,
            orderBy,
            orderDir,
        };

        if (mode === 'test-forward') {
            const { data } = await client.workspaces.getRunningInstances(workspaceId, strategyId, mode, args as any);
            const items = data.map(item => GenotypeInstanceDescriptorEntity.fromRow(item as any as GenotypeInstanceDescriptor));
            setDescriptors(items);
        }
        else if (mode === 'test-back') {
            const { data } = await client.workspaces.getTopBacktests(workspaceId, strategyId, args as any);
            const items = data.map(item => GenotypeInstanceDescriptorEntity.fromRow(item as any as GenotypeInstanceDescriptor));
            setDescriptors(items);
        }

    }, [info, limit, orderBy, orderDir]);


    if (isLoading) {
        return <SpinnerMini />
    }

    return (
        <>
            {descriptors.length === 0
                ? (<b>{noItems ?? "No genotypes found"}</b>)
                : (
                    <Table className="primo-instance-list">
                        <TableBody>
                            {descriptors.map((d, i) => (
                                <InstanceOverviewItem key={i} instance={d} />
                            ))}
                        </TableBody>
                    </Table>
                )
            }
        </>
    );
};
