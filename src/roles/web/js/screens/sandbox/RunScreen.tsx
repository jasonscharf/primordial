import { DateTime } from "luxon";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { Button, Card, CardContent, Grid, TextField, Alert, Checkbox, FormGroup, FormControlLabel, InputLabel, MenuItem, Select } from "@mui/material";
import DateTimePicker from "@mui/lab/DateTimePicker";
import { ApiBacktestRequest, ApiTimeResolution } from "../../client";
import { InfoContext } from "../../contexts";
import { client } from "../../includes";
import { Spinner } from "../../components/primitives/Spinner";
import { ScreenBase } from "../Screenbase";
import { CardHeader } from "../../components/primitives/CardHeader";
import { actionButton, smallControl } from "../../styles/util-styles";

const DEFAULT_SYMBOLS = "BTC/USDT";
const DEFAULT_GENOME = "RSI-L=33|RSI-H=66";

const RunScreen = () => {
    const info = useContext(InfoContext);

    const prevFrom = window.localStorage["runner-prev-from"];
    const prevTo = window.localStorage["runner-prev-to"];
    const prevSymbols = window.localStorage["runner-prev-symbols"];
    const prevGenome = window.localStorage["runner-prev-genome"];
    const prevRes = window.localStorage["runner-prev-res"];
    const prevOpenInNewWindow = window.localStorage["runner-open-in-new-window"] === "true";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const initialFrom = prevFrom ? DateTime.fromISO(prevFrom) : DateTime.fromJSDate(startOfMonth)
    const initialTo = prevTo ? DateTime.fromISO(prevTo) : DateTime.fromJSDate(now);

    const [open, setOpen] = useState(false);
    const [from, setFrom] = useState<DateTime>(initialFrom);
    const [to, setTo] = useState<DateTime>(initialTo);
    const [genome, setGenome] = useState<string>(prevGenome || DEFAULT_GENOME);
    const [res, setRes] = useState<ApiTimeResolution>(prevRes || ApiTimeResolution.Type15M)
    const [args, setArgs] = useState<ApiBacktestRequest>();
    const [options, setOptions] = React.useState([]);
    const [symbolPairs, setSymbols] = useState<string>(prevSymbols || DEFAULT_SYMBOLS);
    const [errors, setErrors] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [openInNewWindow, setOpenInNewWindow] = useState<boolean>(prevOpenInNewWindow);
    const loading = open && options.length === 0;

    useEffect(() => {
        try {
            // ... load actual market defs from API
        }
        catch (err) {

        }
    }, [info]);

    const handleChangeFrom = useCallback(val => {
        setFrom(val)
    }, [from]);

    const handleChangeTo = useCallback(val => {
        setTo(val)
    }, [to]);

    const handleChangeGenome = useCallback((value: string) => {
        setGenome(value);
    }, [genome]);

    const handleChangeSymbols = useCallback((value: string) => {
        setSymbols(value);
    }, [symbolPairs]);

    const handleCheckOpenInNewWindow = useCallback((value: boolean) => {
        setOpenInNewWindow(value);
    }, [openInNewWindow]);

    const handleClickSetEndNow = useCallback(async () => {
        setTo(DateTime.now());
    }, []);

    const handleChangeTimeRes = useCallback((value: ApiTimeResolution) => {
        setRes(value);
    }, [res]);

    const handleClickRun = useCallback(async () => {
        try {
            const { defaultWorkspace: workspaceId, defaultStrategy: strategyId } = info;
            const args: ApiBacktestRequest = {
                workspaceId,
                strategyId,
                res,
                symbols: symbolPairs,
                from: from.toISO(),
                to: to.toISO(),
                genome,
                returnEarly: true,
            };

            // ... validate

            window.localStorage["runner-prev-from"] = args.from;
            window.localStorage["runner-prev-to"] = args.to;
            window.localStorage["runner-prev-symbols"] = args.symbols;
            window.localStorage["runner-prev-genome"] = args.genome;
            window.localStorage["runner-prev-res"] = args.res;
            window.localStorage["runner-open-in-new-window"] = openInNewWindow;


            setIsRunning(true);
            setErrors([]);
            const response = await client.sandbox.runBacktest(args);
            const data = await response.data;
            const results = data;
            setIsRunning(false);

            // Note: Can be results, or early return result - both bear "name" prop but not the poly here
            const { name } = results;
            const newUrl = `/results/${name}`;

            if (openInNewWindow) {
                window.open(newUrl);
            }
            else {
                window.location.href = newUrl;
            }
        }
        catch (err) {

            // TODO: Error handling hook

            let errMessage = "";
            let errorTexts: string[] = []
            if (err instanceof Response) {
                const errJson = (err as any).error;
                if (typeof errJson === "string") {
                    errorTexts = [errJson];
                }
                else if (typeof errJson === "object" && Array.isArray(errJson.errors)) {
                    errorTexts = errJson.errors.map(e => e.message);
                }
                else {
                    errorTexts = errJson.errors.map(e => e.message);
                }
            }
            else {
                errorTexts = [(err as Error).message];
            }

            setIsRunning(false);
            setErrors([...errors, ...errorTexts]);
        }
    }, [from, genome, info, openInNewWindow, res, symbolPairs, to]);


    return (
        <ScreenBase>
            {
                isRunning
                    ? (<Spinner caption1="Running bot..." caption2="This may take a while..." />)
                    : (
                        <Grid item xs={12} lg={6}>
                            <Card>
                                <CardHeader title="Run a Backtest" />
                                <CardContent>
                                    <form noValidate autoComplete="off" onSubmit={handleClickRun} style={{ width: "auto" }}>
                                        <Grid item container spacing={2} style={{ padding: "0px !important", width: "auto" }}>
                                            <Grid item container style={{ padding: 0 }}>
                                                <Grid item container>
                                                    <Grid item xs={3}>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            id="outlined-basic"
                                                            label="Symbol Pair (Binance)"
                                                            variant="outlined"
                                                            value={symbolPairs}
                                                            onChange={evt => handleChangeSymbols(evt.target.value)} />
                                                    </Grid>
                                                    <Grid item>
                                                        <Select
                                                            size="small"
                                                            label="Interval"
                                                            id="demo-simple-select"
                                                            value={res}
                                                            onChange={evt => handleChangeTimeRes(evt.target.value as ApiTimeResolution)}
                                                        >
                                                            <MenuItem value={ApiTimeResolution.Type5M}>5 min</MenuItem>
                                                            <MenuItem value={ApiTimeResolution.Type15M}>15 min</MenuItem>
                                                            <MenuItem value={ApiTimeResolution.Type1H}>1 hour</MenuItem>
                                                            <MenuItem value={ApiTimeResolution.Type4H}>4 hours</MenuItem>
                                                            <MenuItem value={ApiTimeResolution.Type6H}>6 hours</MenuItem>
                                                            <MenuItem value={ApiTimeResolution.Type12H}>12 hours</MenuItem>
                                                        </Select>
                                                    </Grid>
                                                    <Grid item xs={3} sx={{ ...smallControl, marginLeft: "auto" }}>
                                                        <DateTimePicker
                                                            label="From"
                                                            value={from}
                                                            onChange={handleChangeFrom}
                                                            renderInput={(params) => <TextField size="small" {...params} />}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={3}>
                                                        <DateTimePicker
                                                            label="To"
                                                            value={to}
                                                            onChange={handleChangeTo}
                                                            renderInput={(params) => <TextField size="small" {...params} />}
                                                        />
                                                    </Grid>
                                                    <Grid item>
                                                        <Button
                                                            variant="outlined"
                                                            style={{ height: "100%" }}
                                                            onClick={handleClickSetEndNow}>
                                                            <span>&#9201;</span>
                                                        </Button>
                                                    </Grid>

                                                </Grid>
                                            </Grid>
                                            <Grid item xs={12} style={{ paddingLeft: 0 }}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    id="outlined-basic"
                                                    value={genome}
                                                    label="Genome"
                                                    variant="outlined"
                                                    placeholder="BTC/USDT"
                                                    onChange={evt => handleChangeGenome(evt.target.value)}
                                                />
                                            </Grid>
                                        </Grid>
                                    </form>
                                    <Grid item >
                                        {errors.map((err, i) => (
                                            <Alert key={i} severity="error">{err}</Alert>
                                        ))}
                                    </Grid>
                                    <Grid item container spacing={2} sx={{ width: "auto" }}>
                                        <Grid item>
                                            <FormGroup>
                                                <FormControlLabel control={<Checkbox checked={openInNewWindow} onChange={evt => handleCheckOpenInNewWindow(evt.target.checked)} />} label="Open in new window (popups might get blocked; check address bar)" />
                                            </FormGroup>
                                        </Grid>
                                        <Grid item style={{ marginLeft: "auto", textAlign: "right", }}>
                                            <Button type="submit" onClick={handleClickRun} variant="contained" sx={actionButton}>Run backtest</Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}
        </ScreenBase>
    );
};

export default RunScreen;
