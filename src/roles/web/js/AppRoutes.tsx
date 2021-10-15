import React, { lazy, Suspense } from "react";

import {
    BrowserRouter as Router,
    Link,
    Route,
    Switch,
} from "react-router-dom";

const DashScreen = lazy(() => import("./screens/DashScreen"));
const RunScreen = lazy(() => import("./screens/sandbox/RunScreen"));
const BotResults = lazy(() => import("./screens/sandbox/BotResults"));
const Splash = lazy(() => import("./components/Splash"));


export const AppRoutes = () => {
    return (
        <Router>
            <Switch>
                <Route path="/dash">
                    <DashScreen />
                </Route>
                <Route path="/run">
                    <RunScreen />
                </Route>
                <Route path="/results/:instanceIdOrName">
                    <BotResults />
                </Route>
                <Route exact path="/">
                    <Splash />
                </Route>
            </Switch>
        </Router>
    );
};
