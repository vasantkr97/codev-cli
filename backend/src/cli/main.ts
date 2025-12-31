#!/usr/bin/env bun

import dotenv from "dotenv";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from "commander";
import { login, logout, whoami } from "./commands/auth/login";
import { wakeUp } from "./commands/ai/wakeUp";

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
    program.addCommand(whoami);
    program.addCommand(logout);
    program.addCommand(wakeUp);

    program.action(() => {
        program.help();
    });

    program.parse();
}

main().catch((error) => {
    console.log(chalk.red("Error running codev cli: ", error));
    process.exit(1);
})