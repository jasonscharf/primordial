import figlet from "figlet";
import { version } from "../../common/version";


const fonts = [
    "Cyberlarge",
    "Elite",
    "Impossible",
    "Isometric1",
    "Isometric2",
    "Isometric3",
];

export function banner() {

    // See: http://patorjk.com/software/taag/#p=testall&t=PRIMORDIAL for fontz
    const bannerText = figlet.textSync("PRIMO", {
        font: fonts[Math.floor(Math.random() * fonts.length)],
        horizontalLayout: "default",
        verticalLayout: "default",
        width: 140,
        whitespaceBreak: true,
    });

    console.log(bannerText);
    console.log(`v. ${version.full}`);
}
