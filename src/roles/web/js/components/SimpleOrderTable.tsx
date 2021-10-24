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
import { Order } from "../../../common/models/markets/Order";
import { shortDateAndTime } from "../../../common/utils/time";


export interface OrderTableProps {
    orders: Order[];
}

export function SimpleOrderTable(props?: OrderTableProps) {
    const orders = (props && props.orders) ? props.orders : [];
    return (
        <TableContainer component={Paper}>
            <Table size="small" aria-label="Recent orders">
                <TableHead>
                    <TableRow>
                        <TableCell align="left">Order</TableCell>
                        <TableCell align="right">Type</TableCell>
                        <TableCell align="right">Opened</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Gross</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {orders.map((row) => (
                        <TableRow
                            key={row.id}>
                            <TableCell>
                                {row.displayName}
                            </TableCell>
                            <TableCell align="right">{row.typeId}</TableCell>
                            <TableCell align="right">{shortDateAndTime(row.opened)}</TableCell>
                            <TableCell align="right">{row.quantity.round(11).toString()}</TableCell>
                            <TableCell align="right">{row.price.round(11).toString()}</TableCell>
                            <TableCell align="right"><Amount amount={row.gross.round(11).toNumber()} symbol={row.quoteSymbolId} /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
