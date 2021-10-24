import React, { useCallback } from "react";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Grid, List, ListItem, TableCell, TableRow } from "@mui/material";
import { Amount } from "../primitives/Amount";
import { GeneticBotFsmState } from "../../../../common/models/bots/BotState";
import { GenotypeInstanceDescriptor } from "../../../../common/models/bots/GenotypeInstanceDescriptor";
import { If } from "../primitives/If";
import { generatePath, useHistory } from "react-router";
import { presentBotState, presentDuration } from "../../../../common/utils/presentation";
import { routes } from "../../../../common/app-routing";


export interface InstanceOverviewItemProps {
    workspaceId?: string;
    strategyId?: string;
    instance: GenotypeInstanceDescriptor;
}

export const InstanceOverviewItem: React.FC<InstanceOverviewItemProps> = props => {
    const { instance } = props;
    const hist = useHistory();

    const handleClickListItem = useCallback((d: GenotypeInstanceDescriptor) => {
        if (d.modeId === 'test-back') {
            hist.push(generatePath(routes.BACK_TESTS_RESULTS_FOR_BOT, { instanceName: d.name }));
        }
    }, []);

    return (
        <TableRow
            onClick={() => handleClickListItem(instance)}
            sx={{ border: "none" }}
        >
            <TableCell
                align="left"
                sx={{ border: "none", padding: 0 }}
            >
                <Grid item container spacing={1} style={{ flexWrap: "nowrap", paddingBottom: "1em" }}>
                    <Grid item style={{ marginTop: "auto", marginBottom: "auto" }}>
                        <Hashicon value={instance.id} size={32} />
                    </Grid>
                    <Grid item style={{}} className="primo-ellipses">
                        {/*
                            <Grid item >
                                <b>{d.name}</b>
                            </Grid>*/}
                        <Grid item>
                            <b>{instance.symbols}</b>&nbsp;@&nbsp;<b>{instance.resId}</b>
                        </Grid>
                        <Grid item>
                            <span>{instance.genome}</span>
                        </Grid>
                        <If exp={instance.modeId !== "test-back"}>
                            <Grid item>
                                <b>{presentBotState(instance.fsmState as any as GeneticBotFsmState)}</b>
                            </Grid>
                        </If>
                        <If exp={instance.modeId === "test-back"}>
                            <Grid item>
                                <span>{presentDuration(instance.duration)}</span>
                            </Grid>
                        </If>
                    </Grid>
                </Grid>
            </TableCell>
            <TableCell
                align="right"
                sx={{ border: "none", padding: 0 }}
            >
                <Grid item style={{ marginLeft: "auto" }}>
                    <Amount amount={instance.totalProfit} symbol={instance.quoteSymbolId} />
                </Grid>
            </TableCell>

        </TableRow>
    );
};
