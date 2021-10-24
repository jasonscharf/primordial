import React from "react";
import { InfoResponse } from "./client";

export const InfoContext = React.createContext<InfoResponse>(null);
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
