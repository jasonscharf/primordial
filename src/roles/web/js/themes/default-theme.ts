import { Components, createTheme } from "@mui/material"

const foo = "#59A5D8";
export const defaultTheme = createTheme({
    palette: {
        primary: {
            main: "#59A5D8",
        },
        secondary: {
            main: "#FFFFFF",
        },

        error: {
            main: "#FF0000",
        },
        background: {
            default: "#fff",
        },
    },
    components: <Components>{
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
});

/*
type CustomTheme = {
    [Key in keyof typeof defaultTheme]: typeof defaultTheme[Key]
}
declare module "@mui/material" {
    interface Theme extends CustomTheme { }
    interface ThemeOptions extends CustomTheme { }
}*/
