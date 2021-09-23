import { DateTime } from "luxon";
import React, { useCallback, useEffect, useState } from "react";
import { Autocomplete, Box, Button, CircularProgress, Card, CardContent, Grid, TextField, Alert } from "@mui/material";
import DateAdapter from "@mui/lab/AdapterLuxon";
import DateTimePicker from "@mui/lab/DateTimePicker";
import { ApiBacktestRequest, ApiTimeResolution } from "../../client";
import { TimeResolution } from "../../../../common/models/markets/TimeResolution";
import { client } from "../../includes";
import { Spinner } from "../../components/primitives/Spinner";

const DEFAULT_SYMBOLS = "BTC/BUSD";
const DEFAULT_GENOME = "RSI-L=33|RSI-H=66";

const RunScreen = () => {

    const prevFrom = window.localStorage["runner-prev-from"];
    const prevTo = window.localStorage["runner-prev-to"];
    const prevSymbols = window.localStorage["runner-prev-symbols"];
    const prevGenome = window.localStorage["runner-prev-genome"];
    const prevRes = window.localStorage["runner-prev-res"];

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
        console.log(`Set symbols to '${value}'`, symbolPairs);
    }, [symbolPairs]);

    const handleClickRun = useCallback(async () => {
        try {
            const res: ApiTimeResolution = ApiTimeResolution.Type15M;
            const args: ApiBacktestRequest = {
                res,
                symbols: symbolPairs,
                from: from.toISO(),
                to: to.toISO(),
                genome,
            };

            // ... validate

            window.localStorage["runner-prev-from"] = args.from;
            window.localStorage["runner-prev-to"] = args.to;
            window.localStorage["runner-prev-symbols"] = args.symbols;
            window.localStorage["runner-prev-genome"] = args.genome;
            window.localStorage["runner-prev-res"] = args.res;


            setIsRunning(true);
            const results = await (await client.sandbox.runBacktest(args)).data;
            setIsRunning(false);

            const { name } = results;
            const newUrl = `/results/${name}`;

            window.open(newUrl);
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
    }, [from, genome, symbolPairs, to]);


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
                                    <form noValidate autoComplete="off">
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
                                        <Grid item style={{ marginLeft: "auto", textAlign: "right", }}>
                                            <Button onClick={handleClickRun} variant="contained">Run backtest</Button>
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

/*
<Autocomplete
    id="autocomplete-symbols"
    sx={{ width: 300 }}
    open={open}
    onOpen={() => {
        setOpen(true);
    }}
    onClose={() => {
        setOpen(false);
    }}
    isOptionEqualToValue={(option, value) => option.title === value.title}
    getOptionLabel={(option) => option.title}
    options={options}
    loading={loading}
    renderInput={(params) => (
        <TextField
            {...params}
            label="Asynchronous"
            InputProps={{
                ...params.InputProps,
                endAdornment: (
                    <React.Fragment>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                    </React.Fragment>
                ),
            }}
        />
    )}
    />
*/
