import React, { useCallback } from "react";
import { Hashicon } from "@emeraldpay/hashicon-react";
import { Grid, List, ListItem, TableCell, TableRow, Tooltip, useTheme } from "@mui/material";
import { Amount } from "../primitives/Amount";
import { BigNum } from "../../../../common/numbers";
import { GeneticBotFsmState } from "../../../../common/models/bots/BotState";
import { GenotypeInstanceDescriptor } from "../../../../common/models/bots/GenotypeInstanceDescriptor";
import { If } from "../primitives/If";
import { Percent } from "../primitives/Percent";
import { generatePath, useHistory } from "react-router";
import { presentBotState } from "../../../../common/utils/presentation";
import { routes } from "../../../../common/app-routing";
import { presentDuration } from "../../../../common/utils/time";


export interface InstanceOverviewItemProps {
    workspaceId?: string;
    strategyId?: string;
    instance: GenotypeInstanceDescriptor;
}

export const InstanceOverviewItem: React.FC<InstanceOverviewItemProps> = props => {
    const { instance } = props;
    const theme = useTheme();
    const hist = useHistory();

    const handleClickListItem = useCallback((d: GenotypeInstanceDescriptor) => {
        hist.push(generatePath(routes.BACK_TESTS_RESULTS_FOR_BOT, { instanceName: d.name }));
    }, []);

    const { fsmState, state } = instance;
    const isSelling = (
        fsmState === GeneticBotFsmState.SURF_SELL ||
        fsmState === GeneticBotFsmState.WAITING_FOR_SELL_OPP ||
        fsmState === GeneticBotFsmState.WAITING_FOR_SELL_ORDER_CONF
    );

    const { latestPrice: latestPriceRaw, prevPrice: prevPriceRaw } = state || {};

    const latestPrice = BigNum(latestPriceRaw ?? "0");
    const prevPrice = BigNum(prevPriceRaw ?? "0");

    // Using the loose definition of drawdown here (dd from last buy, not last peak)
    const drawdown = !isSelling
        ? 0
        : latestPrice.minus(prevPrice).round(2) // TEMP USDT
        ;

    const drawdownPct = (!isSelling || latestPrice.eq("0"))
        ? 0
        : BigNum("1").minus(prevPrice.div(latestPrice)).round(2).toNumber()
        ;

    return (

        <TableRow
            onClick={() => handleClickListItem(instance)}
            sx={{ border: "none", userSelect: "none" }}
        >
            <Tooltip title={instance.name}>
                <TableCell
                    align="left"
                    sx={{ border: "none", padding: 0 }}
                >
                    <Grid item container spacing={1} sx={{ flexWrap: "nowrap", paddingBottom: "1em" }}>
                        <Grid item sx={{ marginTop: "auto", marginBottom: "auto" }}>
                            <Hashicon value={instance.id} size={32} />
                        </Grid>
                        <Grid item sx={theme.utils.smaller} className="primo-ellipses">
                            {/*
                            <Grid item >
                            <b>{d.name}</b>
                        </Grid>*/}
                            <Grid item>
                                <b>{instance.symbols}</b>
                                &nbsp;&#124;&nbsp;<b>{instance.resId}</b>
                                <If exp={instance.modeId !== "test-back"}>
                                    &nbsp;&#124;&nbsp;
                                    <b>{presentBotState(instance.fsmState, instance.runState)}</b>
                                </If>
                            </Grid>
                            <If above sm>
                                <Grid item>
                                    <span>{instance.genome}</span>
                                </Grid>
                            </If>
                            <Grid item>
                                <Grid item>
                                    {presentDuration(instance.duration, { short: true })}
                                </Grid>
                            </Grid>

                            <Grid item sx={theme.utils.smallest}>
                                <Amount neutral amount={instance.prevPrice} />&nbsp;
                                <Amount neutral amount={instance.latestPrice} />&nbsp;
                                <Percent amount={drawdownPct} />
                            </Grid>
                        </Grid>
                    </Grid>
                </TableCell>
            </Tooltip >
            <TableCell
                align="right"
                sx={{ border: "none", padding: 0 }}
            >
                <Grid item sx={{ marginLeft: "auto" }}>
                    <Grid item sx={{ fontSize: "1rem" }}>
                        <Percent amount={instance.totalProfitPct} />
                    </Grid>
                    <Grid item sx={theme.utils.smaller}>
                        <Amount amount={instance.totalProfit} symbol={instance.quoteSymbolId} />
                    </Grid>
                </Grid>
            </TableCell>

        </TableRow>

    );
};
