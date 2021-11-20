import React, { lazy, Suspense, useEffect, useState } from "react";
import { render } from "react-dom";
import DateAdapter from "@mui/lab/AdapterLuxon";
import { SnackbarProvider } from "notistack";
import { LocalizationProvider } from "@mui/lab";
import useDimensions from "react-cool-dimensions";
import { AppRoutes } from "./AppRoutes";
import { InfoContext, InfoContextState, PresentationContext, ResponsiveBreakpoint, breakpoints, DEFAULT_INFO_CONTEXT } from "./contexts";
import { InfoResponse } from "./client";
import { ThemeProvider } from "@mui/material";
import { client } from "./includes";
import { defaultTheme } from "./themes/default-theme";
import { ModalError } from "./components/ModalError";
import { parseServerErrors } from "./utils";
import { PrimoSerializableError } from "../../common/errors/errors";


const Loading = () => (
    <div>Loading...</div>
);


const App = () => {
    const [errors, setErrors] = useState<PrimoSerializableError[]>(null);
    const [info, setInfo] = useState<InfoContextState>(null);
    const [breakpoint, setBreakpoint] = useState<ResponsiveBreakpoint>("xs");

    const { observe, unobserve, width, height, entry } = useDimensions({
        breakpoints,
        updateOnBreakpointChange: true,
        onResize: ({ currentBreakpoint }) => {
            setBreakpoint(currentBreakpoint as ResponsiveBreakpoint);
        },
    });

    useEffect(() => {
        client.info.getInfo()
            .then(response => response.data)
            .then(setInfo)
            .catch(err => {
                const errors = parseServerErrors(err);
                errors.unshift(new PrimoSerializableError(`There was an error contacting the server.`));
                setErrors(errors);
            })
            ;
    }, []);

    if (errors) {
        return (
            <ModalError error={errors} />
        );
    }

    return (
        <div className="primo-app-container" ref={observe}>
            <ThemeProvider theme={defaultTheme}>
                <LocalizationProvider dateAdapter={DateAdapter}>
                    <PresentationContext.Provider value={{ breakpoint }}>
                        <SnackbarProvider maxSnack={3}>
                            <InfoContext.Provider value={info}>
                                <Suspense fallback={<div />}>
                                    <AppRoutes />
                                </Suspense>
                            </InfoContext.Provider>
                        </SnackbarProvider>
                    </PresentationContext.Provider>
                </LocalizationProvider>
            </ThemeProvider>
        </div>
    );
};

render(<App />, document.getElementById("primo-app-container"));
