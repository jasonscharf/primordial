import React from "react";
import { InfoResponse } from "./client";

export const InfoContext = React.createContext<InfoResponse>(null);
InfoContext.displayName = "ctx.info";
