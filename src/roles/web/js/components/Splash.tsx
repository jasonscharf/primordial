import "react-dom";
import React, { useEffect, useState } from "react";
import { InfoResponse } from "../client";
import { client } from "../includes";


const Splash = () => {
    const [info, setInfo] = useState<InfoResponse>(null);

    useEffect(() => {
        client.info.getInfo()
            .then(data => data.data)
            .then(data => setInfo(data))
            .catch(console.error)
            ;
    }, []);

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

