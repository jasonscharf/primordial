import { render } from "react-dom";
import React, { lazy, Suspense } from "react";
import {
    BrowserRouter as Router,
    Link,
    Route,
    Switch,
} from "react-router-dom";

import "../assets/css/reset.css";
import "../assets/css/main.css";


const Loading = () => (
    <div>Loading</div>
);


const RunScreen = lazy(() => import("./screens/sandbox/RunScreen"));
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
                <Route exact path="/">
                    <Splash />
                </Route>
            </Switch>
        </Router>
    </Suspense>
);

render(app, document.getElementById("app-container"));
