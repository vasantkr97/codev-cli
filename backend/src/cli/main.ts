#!/usr/bin/env bun

import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from "commander";
import { login } from "./commands/auth/login";

dotenv.config();

async function main() {
    console.log(
        chalk.green(
            figlet.textSync(
                "CodeV CLI", 
                {
                    font: "standard",
                    horizontalLayout: "default" 
                }
            )
        )
    )

    console.log(chalk.blue("A cli based tool for creating and managing your projects \n"))

    const program = new Command("codev");

    program.version("0.0.1").description("A cli based tool for creating and managing your projects");

    // Register subcommands
    program.addCommand(login);

    program.action(() => {
        program.help();
    });

    program.parse();
}

main().catch((error) => {
    console.log(chalk.red("Error running codev cli: ", error));
    process.exit(1);
})