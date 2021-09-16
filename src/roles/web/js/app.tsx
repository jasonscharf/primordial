import { render } from "react-dom";
import React, { lazy, Suspense } from "react";
import {
    BrowserRouter as Router,
    Link,
    Route,
    Switch,
} from "react-router-dom";

const Loading = () => (
    <div>Loading</div>
);


const RunScreen = lazy(() => import("./screens/sandbox/RunScreen"));
const BotResults = lazy(() => import("./screens/sandbox/BotResults"));
const Splash = lazy(() => import("./components/Splash"));


const app = (
    <Suspense fallback={<div />}>
        <Router>

            {/* A <Switch> looks through its children <Route>s and
                  renders the first one that matches the current URL. */}
            <Switch>
                <Route path="/run">
                    <RunScreen />
                </Route>
                <Route path="/results/:instanceId">
                    <BotResults />
                </Route>
                <Route exact path="/">
                    <Splash />
                </Route>
            </Switch>
        </Router>
    </Suspense>
);

render(app, document.getElementById("app-container"));
