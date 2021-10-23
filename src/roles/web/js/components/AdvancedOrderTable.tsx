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

import { Amount } from "./primitives/Amount";
import { ApiBotOrderDescriptor } from "../../../common/messages/trading";
import { Order } from "../../../common/models/markets/Order";
import { shortDateAndTime } from "../../../common/utils/time";


export interface AdvancedOrderTableProps {
    orders: ApiBotOrderDescriptor[];
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
                    <TableCell align="left">{row.instance.symbols}</TableCell>

                    <TableCell align="right">{shortDateAndTime(row.order.closed)}</TableCell>

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
                        <TableCell align="left">Symbols</TableCell>

                        <TableCell align="right">Closed</TableCell>

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
