import "react-dom";
import React, { useContext, useEffect, useState } from "react";
import { InfoResponse } from "../client";
import { client } from "../includes";
import { Button, Grid } from "@mui/material";
import { RouterProps, useHistory } from "react-router";
import { InfoContext } from "../contexts";


const Splash = (props) => {

    const hist = useHistory();
    const info = useContext(InfoContext);

    if (!info) {
        return <div />;
    }

    const { mode } = info.environment;
    const devMode = mode === "dev";
    let infoText = "development";
    let versionText = "";

    if (mode == "dev") {
        infoText = "development";
    }
    else {
        infoText = mode;
        versionText = `| ${(info as InfoResponse).buildInfo.version}`;
    }

    return (
        <>
            <div className="hero-img-wrapper">
                <div className="hero-img"></div>
                <div className="hero-text">
                    <h1>P R I M O R D I A L</h1>
                    <Grid item container spacing={1} className="primo-button-strip" style={{ width: "auto", justifyContent: "center"}}>
                        <Grid item>
                            <Button variant="contained" onClick={() => hist.push("/dash")}>
                                <span>Dashboard&nbsp;&raquo;</span>
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button variant="contained" onClick={() => hist.push("/run")}>
                                <span>Run a backtest&nbsp;&raquo;</span>
                            </Button>
                        </Grid>
                    </Grid>
                </div>
            </div>
            <div className="hero-version-footer">
                <i>{infoText}</i>
                <i>{versionText}</i>
            </div>
        </>
    );
};

export default Splash;

