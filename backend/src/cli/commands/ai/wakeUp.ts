import chalk from "chalk";
import { getStoredToken } from "../auth/login";
import yoctoSpinner from "yocto-spinner";
import prisma from "../../../lib/db";
import { select } from "@clack/prompts";
import { startChat } from "../../chat/chat-with-ai";
import { Command } from "commander";
import { startToolChat } from "../../chat/chat-with-ai-tools";
import { startAgentChat } from "../../chat/chat-with-ai-agent";



const wakeUpAction = async () => {
    const token = await  getStoredToken();

    if (!token?.access_token) {
        console.log(chalk.red("Not authenticated. Please run 'codev login first."))
        return;
    }

    const spinner = yoctoSpinner({ text: "Fetching User Information..."});
    spinner.start();

    const user = await prisma.user.findFirst({
        where: {
            sessions: {
                some: { token:  token.access_token }
            }
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            sessions: true,
        }
    });

    spinner.stop();

    if (!user) {
        console.log(chalk.red("User not found. Please login again"))
        return;
    }

    console.log(chalk.green(`\nWelcome back, ${user.name}!\n`))

    const choice = await select({
        message: "What would you like to do?",
        options: [
            {
                value: "chat",
                label: "Chat with AI",
                hint: "Simple chat with AI",
            },
            {
                value: "tools",
                label: "Tool Calling",
                hint: "Chat with tools (Google Search, Code Execution",
            },
            {
                value: "agent",
                label: "Agent Mode",
                hint: "Advanced AI Agent",
            },
            {
                value: "exit",
                label: "Exit",
                hint: "Exit the application",
            }
        ]
    })

    switch (choice) {
        case "chat":
            await startChat("chat")
            break;
        case "tools":
            await startToolChat(null);
            break;
        case "agent":
            await startAgentChat(null);
            break
    }
}

export const wakeUp = new Command("wakeup")
    .description("Wake up the AI")
    .action(wakeUpAction)