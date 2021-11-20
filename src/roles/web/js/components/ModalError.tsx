import { Alert, Grid } from "@mui/material";
import React from "react";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { PrimoSerializableError } from "../../../common/errors/errors";
import { If } from "./primitives/If";
import { isNullOrUndefined } from "../../../common/utils";


export interface ModalErrorProps {
    text?: string;
    error?: Error | Error[] | PrimoSerializableError | PrimoSerializableError[];
}

export const ModalError = (props: ModalErrorProps) => {
    const { error, text } = props;

    let errs = [];
    if (error instanceof Error) {
        errs.push(error);
    }
    else if (!isNullOrUndefined(error) && Array.isArray(error)) {
        errs = errs.concat(error);
    }

    return (
        <Grid item container sx={{
            alignItems: "center",
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        }}>
            <Grid item xs={12} sx={{ margin: "auto", textAlign: "center" }}>
                <ErrorOutlineIcon sx={{ fontSize: "20rem" }} />
            </Grid>
            <If exp={!!text}>
                <Grid item xs={12} sx={{ margin: "auto" }}>
                    <h3>{text}</h3>
                </Grid>
            </If>
            <If exp={!isNullOrUndefined(errs)}>
                <Grid item container direction="column" xs={12} sx={{ alignItems: "center" }}>
                    {errs.map((err, i) => (
                        <Grid key={i} item >
                            <Alert severity="error">{err + ""}</Alert>
                        </Grid>
                    ))}
                </Grid>
            </If>
        </Grid >
    );
}
