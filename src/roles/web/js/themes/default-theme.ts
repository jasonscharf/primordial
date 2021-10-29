import { Components, createTheme } from "@mui/material";
import { SxProps } from "@mui/system";


export const defaultTheme = createTheme({
    palette: {

        // Bluey
        primary: {
            main: "#59A5D8",
        },

        // Greyish
        secondary: {
            main: "#333",
        },

        error: {
            main: "#FF0000",
        },
        background: {
            default: "#fff",
        },
    },
    components: <Components>{
        MuiCircularProgress: {
            root: {
                color: "#333",
            },
        },
        MuiButton: {
            root: {
                color: "#FFFFFF"
            },
            contained: {
                color: "#FFFFFF",
            },
            containedPrimary: {
                color: "#FFF",
            },
            raisedPrimary: {
                color: "#FFFFFF",
            },
        },
        MuiDateTimePicker: {
            root: {
                fontSize: "0.5rem",
            },
        },
    },
    utils: {
        borderBottomLite: { 
            borderBottom: "1px solid #ddd",
        },
        raisedHeader: {
            boxShadow: "0px 2px 4px #ddd",
        },
        subtle: {
            opacity: 0.8,
        },
        subtler: {
            opacity: 0.6,
        },
        smaller: {
            fontSize: "0.8rem",
        },
    },
});

/*
type CustomTheme = {
    [Key in keyof typeof defaultTheme]: typeof defaultTheme[Key]
}
declare module "@mui/material" {
    interface Theme extends CustomTheme { }
    interface ThemeOptions extends CustomTheme { }
}*/

declare module "@mui/material/styles" {
    interface Theme {
        utils: { [key: string]: object }
    }
    // allow configuration using `createTheme`
    interface ThemeOptions {
        utils: SxProps;
    }
}
