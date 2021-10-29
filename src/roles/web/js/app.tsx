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


const Loading = () => (
    <div>Loading...</div>
);



const App = () => {
    const [info, setInfo] = useState<InfoContextState>(DEFAULT_INFO_CONTEXT as InfoContextState);
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
                alert(`There was an error contacting the server`);
            })
    }, []);

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
