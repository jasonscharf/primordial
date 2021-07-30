import { render } from "react-dom";
import React from "react";
import "../assets/css/reset.css";
import "../assets/css/main.css";

import { Splash } from "./components/Splash";
import { client } from "./includes";


const placeholder = (
    <Splash />
);

render(placeholder, document.getElementsByTagName("body")[0]);
