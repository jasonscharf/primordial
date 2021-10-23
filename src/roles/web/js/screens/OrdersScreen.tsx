import React, { useCallback, useContext, useEffect, useState } from "react";
import { Card, CardContent, Grid } from "@mui/material";
import { AdvancedOrderTable } from "../components/AdvancedOrderTable";
import { ApiBotOrderDescriptor } from "../../../common/messages/trading";
import { ApiBotOrderDescriptor as ClientApiBotOrderDescriptor } from "../client";
import { BotDefinitionEntity } from "../../../common/entities/BotDefinitionEntity";
import { BotInstanceEntity } from "../../../common/entities/BotInstanceEntity";
import { BotRunEntity } from "../../../common/entities/BotRunEntity";
import { CardHeader } from "../components/primitives/CardHeader";
import { InfoContext } from "../contexts";
import { OrderEntity } from "../../../common/entities/OrderEntity";
import { ScreenBase } from "./Screenbase";
import { SpinnerMini } from "../components/primitives/SpinnerMini";
import { useApiRequestEffect } from "../hooks/useApiRequestEffect";


const OrdersScreen = () => {
    const info = useContext(InfoContext);
    const [orders, setOrders] = useState<ApiBotOrderDescriptor[]>([]);

    const [, isLoading] = useApiRequestEffect(async client => {
        if (!info) {
            return;
        }

        const { defaultWorkspace, defaultStrategy } = info;
        const options = null;
        const { data } = await client.orders.getOrders(defaultWorkspace, defaultStrategy, options);

        const orderEntries = data.map(hydrateApiBotOrderDescriptor);
        setOrders(orderEntries);
    }, [info]);

    const maybeTable = isLoading
        ? <SpinnerMini />
        : <AdvancedOrderTable orders={orders} />
        ;

    return (
        <ScreenBase>
            <Grid item xs={12}>
                <Card>
                    <CardHeader title="Orders - 100 most recent" />
                    <CardContent style={{ padding: 0 }}>
                        {maybeTable}
                    </CardContent>
                </Card>
            </Grid>
        </ScreenBase>
    );
};

export function hydrateApiBotOrderDescriptor(d: ClientApiBotOrderDescriptor): ApiBotOrderDescriptor {
    const def = BotDefinitionEntity.fromRow(d.def as unknown);
    const instance = BotInstanceEntity.fromRow(d.instance as unknown);
    const run = BotRunEntity.fromRow(d.run as unknown);
    const order = OrderEntity.fromRow(d.order as unknown);

    return {
        def,
        instance,
        run,
        order,
    };
}

export default OrdersScreen;
