import { DateTime } from "luxon";
import React, { useCallback, useEffect, useState } from "react";
import { Autocomplete, Box, Button, CircularProgress, Card, CardContent, Grid, TextField, Alert, Checkbox, FormGroup, FormControlLabel } from "@mui/material";
import DateAdapter from "@mui/lab/AdapterLuxon";
import DateTimePicker from "@mui/lab/DateTimePicker";
import { ApiBacktestRequest, ApiTimeResolution } from "../../client";
import { TimeResolution } from "../../../../common/models/markets/TimeResolution";
import { client } from "../../includes";
import { Spinner } from "../../components/primitives/Spinner";

const DEFAULT_SYMBOLS = "BTC/USDT";
const DEFAULT_GENOME = "RSI-L=33|RSI-H=66";

const RunScreen = () => {

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
    }, []);

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

    const handleClickRun = useCallback(async () => {
        try {
            const res: ApiTimeResolution = ApiTimeResolution.Type15M;
            const args: ApiBacktestRequest = {
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
    }, [from, genome, openInNewWindow, symbolPairs, to]);


    return (
        <Box width={1} height={1} className="primo-screen-runner" style={{
            textAlign: "center",
            height: "100vh",
            display: "flex",
        }}>
            <Grid container className="primo-fullsize"
                spacing={0}
                direction="column"
                alignItems="center"
                justifyContent="center"
                style={{ minHeight: "100vh" }}
            >
                {
                    isRunning
                        ? (<Spinner caption1="Running bot..." caption2="This may take a while..." />)
                        : (
                            <Card elevation={15}>
                                <CardContent style={{ padding: "32px" }}>
                                    <form noValidate autoComplete="off" onSubmit={handleClickRun}>
                                        <Grid item container spacing={2} style={{ padding: "0px !important" }}>
                                            <Grid item container style={{ padding: 0 }}>
                                                <Grid item container>
                                                    <Grid item xs={3}>
                                                        <TextField
                                                            fullWidth
                                                            id="outlined-basic"
                                                            label="Symbol Pair (Binance)"
                                                            variant="outlined"
                                                            value={symbolPairs}
                                                            onChange={evt => handleChangeSymbols(evt.target.value)} />
                                                    </Grid>
                                                    <Grid item xs={3} style={{ marginLeft: "auto" }}>
                                                        <DateTimePicker
                                                            label="from"
                                                            value={from}
                                                            onChange={handleChangeFrom}
                                                            renderInput={(params) => <TextField {...params} />}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={3}>
                                                        <DateTimePicker
                                                            label="to"
                                                            value={to}
                                                            onChange={handleChangeTo}
                                                            renderInput={(params) => <TextField {...params} />}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                            <Grid item xs={12} style={{ paddingLeft: 0 }}>
                                                <TextField
                                                    fullWidth
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
                                    <Grid item container spacing={2}>
                                        <Grid item>
                                            <FormGroup>
                                                <FormControlLabel control={<Checkbox checked={openInNewWindow} onChange={evt => handleCheckOpenInNewWindow(evt.target.checked)} />} label="Open in new window (popups might get blocked; check address bar)" />
                                            </FormGroup>
                                        </Grid>
                                        <Grid item style={{ marginLeft: "auto", textAlign: "right", }}>
                                            <Button type="submit" onClick={handleClickRun} variant="contained">Run backtest</Button>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}
            </Grid>
        </Box>
    );
};

export default RunScreen;
