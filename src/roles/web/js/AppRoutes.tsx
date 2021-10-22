import React, { lazy, Suspense } from "react";

import {
    BrowserRouter as Router,
    Link,
    Route,
    Switch,
} from "react-router-dom";
import { routes } from "../../common/app-routing";

const AnalyticsScreen = lazy(() => import("./screens/AnalyticsScreen"));
const BackTestsScreen = lazy(() => import("./screens/BackTestsScreen"));
const BotResults = lazy(() => import("./screens/sandbox/BotResults"));
const BotScreen = lazy(() => import("./screens/BotScreen"));
const CapitalScreen = lazy(() => import("./screens/CapitalScreen"));
const DashScreen = lazy(() => import("./screens/DashScreen"));
const DataScreen = lazy(() => import("./screens/DataScreen"));
const ForwardTestsScreen = lazy(() => import("./screens/ForwardTestsScreen"));
const OrdersScreen = lazy(() => import("./screens/OrdersScreen"));
const RunScreen = lazy(() => import("./screens/sandbox/RunScreen"));
const Splash = lazy(() => import("./components/Splash"));
const StrategyScreen = lazy(() => import("./screens/StrategyScreen"));
const SystemScreen = lazy(() => import("./screens/SystemScreen"));
const TestsScreen = lazy(() => import("./screens/TestsScreen"));
const WorkspaceScreen = lazy(() => import("./screens/WorkspaceScreen"));


export const AppRoutes = () => {
    return (
        <Router>
            <Switch>
                <Route path={routes.DASH}>
                    <DashScreen />
                </Route>
                <Route path={routes.WORKSPACE_LIST}>
                    <WorkspaceScreen />
                </Route>
                <Route path={routes.ANALYTICS}>
                    <AnalyticsScreen />
                </Route>
                <Route path={routes.CAPITAL}>
                    <CapitalScreen />
                </Route>
                <Route path={routes.DATA}>
                    <DataScreen />
                </Route>
                <Route path={routes.BOTS}>
                    <BotScreen />
                </Route>
                <Route path={routes.BACK_TESTS_BASE}>
                    <BackTestsScreen />
                </Route>
                <Route path={routes.BACK_TESTS_RUN}>
                    <RunScreen />
                </Route>
                <Route path={routes.BACK_TESTS_RESULTS_FOR_BOT}>
                    <BotResults />
                </Route>
                <Route path={routes.FORWARD_TESTS}>
                    <ForwardTestsScreen />
                </Route>
                <Route path={routes.ORDERS}>
                    <OrdersScreen />
                </Route>
                <Route path={routes.SYSTEM}>
                    <SystemScreen />
                </Route>
                <Route path={routes.TESTS}>
                    <TestsScreen />
                </Route>
                <Route exact path="/">
                    <Splash />
                </Route>
            </Switch>
        </Router>
    );
};

