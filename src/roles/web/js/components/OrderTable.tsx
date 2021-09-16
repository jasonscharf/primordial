import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@material-ui/core";
import { Amount } from "./primitives/Amount";
import { Order } from "../../../common/models/markets/Order";


export interface OrderTableProps {
    orders: Order[];
}

export default function OrderTable(props?: OrderTableProps) {
    const orders = (props && props.orders) ? props.orders : [];
    return (
        <TableContainer component={Paper}>
            <Table size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        <TableCell align="left">Order</TableCell>
                        <TableCell align="right">Type</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Gross</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {orders.map((row) => (
                        <TableRow
                            key={row.id}>
                            <TableCell component="th" scope="row">
                                {row.displayName}
                            </TableCell>
                            <TableCell align="right">{row.typeId}</TableCell>
                            <TableCell align="right">{row.quantity.round(12).toString()}</TableCell>
                            <TableCell align="right">{row.price.round(12).toString()}</TableCell>
                            <TableCell align="right"><Amount amount={row.gross.round(12).toNumber()} symbol={row.quoteSymbolId} /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
