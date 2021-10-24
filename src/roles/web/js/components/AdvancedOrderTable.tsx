import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";

import Biotech from "@mui/icons-material/Biotech";
import { Amount } from "./primitives/Amount";
import { ApiBotOrderDescriptor } from "../../../common/messages/trading";
import { BotMode } from "../../../common/models/system/Strategy";
import { Order, OrderType } from "../../../common/models/markets/Order";
import { shortDateAndTime } from "../../../common/utils/time";


export interface AdvancedOrderTableProps {
    orders: ApiBotOrderDescriptor[];
}

export function presentOrderType(orderType: OrderType) {
    switch (orderType) {
        case OrderType.LIMIT_BUY:
        case OrderType.MARKET_BUY:
            return "BUY";
        case OrderType.LIMIT_SELL:
        case OrderType.MARKET_SELL:
            return "SELL";
        default:
            return "(unknown)";
    }
}

export function AdvancedOrderTable(props?: AdvancedOrderTableProps) {
    const orders = (props && props.orders) ? props.orders : [];

    const maybeOrders = (orders.length === 0)
        ? (
            <TableRow>
                <TableCell colSpan={7}>
                    <h1>No orders</h1>
                </TableCell>
            </TableRow>
        )
        : orders.map(row => {
            return (
                <TableRow
                    key={row.order.id}>

                    <TableCell align="left" style={{ width: "1rem" }}>{row.instance.modeId === BotMode.FORWARD_TEST ? <Biotech /> : ""}</TableCell>
                    <TableCell align="left">{row.instance.symbols}</TableCell>
                    <TableCell align="left" style={{ minWidth: "4rem" }}>{presentOrderType(row.order.typeId)}</TableCell>
                    <TableCell align="left" style={{ minWidth: "11rem" }}>{shortDateAndTime(row.order.closed)}</TableCell>
                    <TableCell align="right">{row.order.price.toString()}</TableCell>
                    <TableCell align="right"><Amount amount={row.order.gross.toString()} symbol={row.order.quoteSymbolId} /></TableCell>
                </TableRow>
            )
        })
        ;

    return (
        <TableContainer className="primo-order-table-advanced">
            <Table size="small" aria-label="Recent orders">
                <TableHead>
                    <TableRow>

                        <TableCell align="left"></TableCell>
                        <TableCell align="left">Symbols</TableCell>
                        <TableCell align="left">Type</TableCell>
                        <TableCell align="left">Closed</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Gross</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {maybeOrders}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
