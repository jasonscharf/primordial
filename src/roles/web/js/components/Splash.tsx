import React, { useEffect, useState } from "react";
import "react-dom";
import { InfoResponse } from "../../../common/models";
import { client } from "../includes";


export const Splash = () => {
    const [info, setInfo] = useState<InfoResponse>(null);

    useEffect(async () => {
        const { data } = await client.info.getInfo();
        setInfo(data);
    }, []);

    if (!info) {
        return <div />;
    }

    let { mode } = info.environment;
    const devMode = mode === "dev";
    let infoText = "development";
    let versionText = "";

    if (mode == "dev") {
        infoText = "development";
    }
    else {
        infoText = mode;
        versionText = `v. ${(info as InfoResponse).buildInfo.version}`
    }

    return (
        <div className="hero-img-wrapper">
            <div className="hero-img"></div>
            <div className="hero-text">
                <h1>P R I M O R D I A L</h1>
                <h2>{infoText}</h2>
                <h3>{versionText}</h3>
            </div>
        </div>
    );
};
