import React from "react";
import { InfoResponse } from "./client";

export interface InfoContextState extends InfoResponse {

}

export const DEFAULT_INFO_CONTEXT: Partial<InfoContextState> = {
    defaultWorkspace: null,
    defaultStrategy: null,
    buildInfo: {
        version: "",
        hash: "",
    },
    environment: {
        mode: "production",
    },
    user: null,
};

export const InfoContext = React.createContext<InfoContextState>(DEFAULT_INFO_CONTEXT as InfoContextState);
InfoContext.displayName = "ctx.info";


export type ResponsiveBreakpoint = "xs" | "sm" | "md" | "lg" | "xl";
export const breakpoints = {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
};

export interface PresentationContext {
    breakpoint: ResponsiveBreakpoint;
}

export const PresentationContext = React.createContext<PresentationContext>(null);
PresentationContext.displayName = "ctx.presentation";
