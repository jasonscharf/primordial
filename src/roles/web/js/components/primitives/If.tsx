import React, { useContext, useEffect, useState } from "react";
import { isNullOrUndefined } from "../../../../common/utils";
import { PresentationContext, ResponsiveBreakpoint } from "../../contexts";


export interface IfProps {
    exp?: boolean | (() => boolean);
    above?: boolean;
    xs?: boolean;
    sm?: boolean;
    md?: boolean;
    lg?: boolean;
    xl?: boolean;
}

export const If: React.FC<IfProps> = props => {
    const { above, children, exp, xs, sm, md, lg, xl } = props;
    const [condition, setCondition] = useState(false);
    const { breakpoint } = useContext(PresentationContext);

    function rank(bp: ResponsiveBreakpoint) {
        switch (bp) {
            case "xs": return 1;
            case "sm": return 2;
            case "md": return 3;
            case "lg": return 4;
            case "xl": return 5;
        }
    }

    useEffect(() => {
        let expResult = null;

        // Evaluate "exp"
        if (!isNullOrUndefined(exp)) {
            if (typeof exp === "function") {
                expResult = exp();
            }
            else {
                expResult = (!!exp);
            }
        }

        let breakpointResult: boolean = null;

        // Evaluate specific classbreaks
        if (above) {
            const currentBreakpointRank = rank(breakpoint);
            let specifiedBreakpointRank: number = null;
            if (xs) {
                specifiedBreakpointRank = rank("xs");
            }
            else if (sm) {
                specifiedBreakpointRank = rank("sm");
            }
            else if (md) {
                specifiedBreakpointRank = rank("md");
            }
            else if (lg) {
                specifiedBreakpointRank = rank("lg");
            }
            else if (xl) {
                specifiedBreakpointRank = rank("xl");
            }
            else {
                breakpointResult = false;
            }

            if (breakpointResult !== false) {
                breakpointResult = currentBreakpointRank > specifiedBreakpointRank;
            }
        }
        else {
            if ([xs, sm, md, lg, xl].every(isNullOrUndefined)) {
                breakpointResult = true;
            }
            else if (breakpointResult !== false && xs && breakpoint === "xs") {
                breakpointResult = true;
            }
            else if (breakpointResult !== false && sm && breakpoint === "sm") {
                breakpointResult = true;
            }
            else if (breakpointResult !== false && md && breakpoint === "md") {
                breakpointResult = true;
            }
            else if (breakpointResult !== false && lg && breakpoint === "lg") {
                breakpointResult = true;
            }
            else if (breakpointResult !== false && xl && breakpoint === "xl") {
                breakpointResult = true;
            }
            else {
                breakpointResult = false;
            }
        }

        const result = (expResult !== false && breakpointResult !== false);
        setCondition(!!result);

    }, [above, breakpoint, exp, xs, sm, md, lg, xl]);

    return (
        <>{condition && children}</>
    );
};
