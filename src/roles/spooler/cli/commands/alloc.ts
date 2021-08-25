import { Command } from "commander";


const alloc = new Command("alloc");
alloc
    .command("create")
    .action(() => {
        console.log("CREATE ALLOC COMMAND")
    });


export { alloc }
