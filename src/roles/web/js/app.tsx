import React, { lazy, Suspense, useEffect, useState } from "react";
import { render } from "react-dom";
import DateAdapter from "@mui/lab/AdapterLuxon";
import { SnackbarProvider } from "notistack";
import { LocalizationProvider } from "@mui/lab";
import { AppRoutes } from "./AppRoutes";
import { InfoContext } from "./contexts";
import { InfoResponse } from "./client";
import { client } from "./includes";


const Loading = () => (
    <div>Loading</div>
);

const App = () => {
    const [info, setInfo] = useState<InfoResponse>(null);
    useEffect(() => {
        client.info.getInfo()
            .then(response => response.data)
            .then(setInfo)
            .catch(err => {
                alert(`There was an error contacting the server`);
            })
    }, []);

    return (
        <LocalizationProvider dateAdapter={DateAdapter}>
            <SnackbarProvider maxSnack={3}>
                <InfoContext.Provider value={info}>
                    <Suspense fallback={<div />}>
                        <AppRoutes />
                    </Suspense>
                </InfoContext.Provider>
            </SnackbarProvider>
        </LocalizationProvider>
    );
};

render(<App />, document.getElementById("app-container"));
