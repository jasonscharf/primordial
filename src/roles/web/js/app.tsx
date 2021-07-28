import { render } from "react-dom";
import React from "react";
import "../assets/css/reset.css";
import "../assets/css/main.css";


const splash = (
    <div className="hero-img-wrapper">
        <div className="hero-img">
            <h1>P R I M O R D I A L</h1>
        </div>
    </div>
);

render(splash, document.getElementsByTagName("body")[0]);
