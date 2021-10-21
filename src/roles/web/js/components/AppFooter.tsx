import React, { useContext, useEffect } from "react";
import { useHistory } from "react-router";
import { InfoContext } from "../contexts";
import { InfoResponse } from "../client";


export const AppFooter = () => {
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
        <div className="primo-app-footer">
            <i>{infoText}</i>
            <i>{versionText}</i>
        </div>
    );
};
