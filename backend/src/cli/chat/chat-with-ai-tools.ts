import { renderMarkdownToTerminal } from "../../utils/terminal-markdown";
import { AIService } from "../../services/google.service";
import { ChatService } from "../../services/chat.service";
import { getStoredToken } from "../commands/auth/login";
import prisma from "../../lib/db";
import yoctoSpinner from "yocto-spinner";
import chalk from "chalk";
import { cancel, intro, isCancel, multiselect, outro } from "@clack/prompts";
import {
    availableTools,
    getEnabledTools,
    enableTools,
    getEnabledToolNames,
    resetTools
} from "../../config/tool.config.js";
import boxen from "boxen";
import { text } from "@clack/prompts";


const aiService = new AIService();
const chatService = new ChatService();

async function getUserFromToken() {
    const token = await getStoredToken()

    if (!token?.access_token) {
        throw new Error("Not Authenticated. Please run 'codev login first.")
    }

    const spinner = yoctoSpinner({ text: "Authenticating..." }).start()

    const user = await prisma.user.findFirst({
        where: {
            sessions: {
                some: { token: token.access_token }
            }
        }
    });

    if (!user) {
        spinner.error("User not found");
        throw new Error("User not found. Please login again")
    }

    spinner.success(`Welcome back, ${user.name}!`)
    return user
}

async function selectTools() {
    const toolOptions = availableTools.map(tool => ({
        value: tool.id,
        label: tool.name,
        hint: tool.description,
    }));

    const selectedTools = await multiselect({
        message: chalk.cyan("Select tools to use in this conversation: "),
        options: toolOptions,
        required: false,
    })

    if (isCancel(selectedTools)) {
        cancel(chalk.yellow("No tools selected."))
        process.exit(0);
    }

    //Enable Selected Tools
    enableTools(selectedTools)

    if (selectedTools.length === 0) {
        console.log(chalk.yellow("\nNo tools selected. AI will work without tools.\n"));
    } else {
        const toolsBox = boxen(
            chalk.green(`Enabled tools:\n${selectedTools.map(id => {
                const tool = availableTools.find(t => t.id === id);
                return `  • ${tool?.name}`;
            }).join('\n')}`),
            {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: "round",
                borderColor: "green",
                title: "Active Tools",
                titleAlignment: "center",
            }
        );
        console.log(toolsBox);
    }

    return selectedTools.length > 0;
}


async function initConversation(userId: any, conversationId: any, mode = "tool") {
    const spinner = yoctoSpinner({ text: "Initializing Conversation..." }).start();

    const conversation = await chatService.getOrCreateConversation(
        userId,
        conversationId,
        mode,
    )

    spinner.success("Conversation initialized")

    //Get enabled tool names for display
    const enabledToolNames = getEnabledToolNames();
    const toolsDisplay = enabledToolNames.length > 0
        ? `\n${chalk.gray("Active Tools:")} ${enabledToolNames.join(", ")}`
        : `\n${chalk.gray("No tools enabled")}`;

    //Display conversation info in a box
    const conversationInfo = boxen(
        `${chalk.bold("Conversation")}: ${conversation.title}\n${chalk.gray("ID: " + conversation.id)}\n${chalk.gray("Mode: " + conversation.mode)}${toolsDisplay}`,
        {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "cyan",
            title: "Tool Calling Session",
            titleAlignment: "center",
        }
    )

    console.log(conversationInfo);

    // Display existing messages if any
    if (conversation.messages?.length > 0) {
        console.log(chalk.yellow("Previous messages:\n"));
        displayMessages(conversation.messages);
    }

    return conversation;
}


function displayMessages(messages: any) {
    messages.forEach((msg: any) => {
        if (msg.role === "user") {
            const userBox = boxen(chalk.white(msg.content), {
                padding: 1,
                margin: { left: 2, bottom: 1 },
                borderStyle: "round",
                borderColor: "blue",
                title: "You",
                titleAlignment: "left",
            });
            console.log(userBox);
        } else if (msg.role === "assistant") {
            const renderedContent = renderMarkdownToTerminal(msg.content);
            const assistantBox = boxen(renderedContent, {
                padding: 1,
                margin: { left: 2, bottom: 1 },
                borderStyle: "round",
                borderColor: "green",
                title: "Assistant (with tools)",
                titleAlignment: "left",
            });
            console.log(assistantBox);
        }
    });
}

async function saveMessage(conversationId: any, role: any, content: any) {
    return await chatService.addMessage(conversationId, role, content);
}

async function getAIResponse(conversationId: any) {
    const spinner = yoctoSpinner({
        text: "AI is thinking...",
        color: "cyan"
    }).start();

    const dbMessage = await chatService.getMessages(conversationId);
    const aiMessages = chatService.formatMessagesForAI(dbMessage);

    const tools = getEnabledTools();

    let fullResponse = "";
    let isFirstChunk = true;
    const toolCallsDetected: any[] = []

    try {
        const result = await aiService.sendMessage(
            aiMessages,
            (chunk: any) => {
                if (isFirstChunk) {
                    spinner.stop();
                    console.log("\n");
                    const header = chalk.green.bold("Assistant:");
                    console.log(header);
                    console.log(chalk.gray("─".repeat(60)));
                    isFirstChunk = false;
                }
                fullResponse += chunk;
            },
            tools,
            (toolCall: any) => {
                toolCallsDetected.push(toolCall);
            },
        );

        //Display tool calls if any
        if (toolCallsDetected.length > 0) {
            console.log("\n");
            const toolCallBox = boxen(
                toolCallsDetected.map(tc =>
                    `${chalk.cyan("Tool:")} ${tc.toolName}\n${chalk.gray("Args:")} ${JSON.stringify(tc.args, null, 2)}`
                ).join("\n\n"),
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: "round",
                    borderColor: "cyan",
                    title: "Tool Calls",
                }
            );
            console.log(toolCallBox);
        }


        // Display tool results if any
        if (result.toolResults && result.toolResults.length > 0) {
            const toolResultBox = boxen(
                result.toolResults.map(tr =>
                    `${chalk.green("Tool:")} ${tr.toolName}\n${chalk.gray("Result:")} ${JSON.stringify(tr.result, null, 2).slice(0, 200)}...`
                ).join("\n\n"),
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: "round",
                    borderColor: "green",
                    title: "Tool Results",
                }
            );
            console.log(toolResultBox);
        }

        // Render markdown response
        console.log("\n");
        const renderedMarkdown = renderMarkdownToTerminal(fullResponse);
        console.log(renderedMarkdown);
        console.log(chalk.gray("─".repeat(60)));
        console.log("\n");

        return result.content;

    } catch (error: any) {
        console.error(chalk.red("AI Response Error:"), error.message);
        console.error(chalk.red("Full error:"), error);
        throw error;
    }
}

async function updateConversation(conversationId: any, userInput: any, messageCount: any) {
    if (messageCount === 1) {
        const title = userInput.slice(0, 50) + (userInput.length > 50 ? "..." : "");
        await chatService.updateTitle(conversationId, title);
    }
}

async function chatLoop(conversation: any) {
    const enabledToolNames = getEnabledToolNames();
    const helpBox = boxen(
        `${chalk.gray('• Type your message and press Enter')}\n${chalk.gray('• AI has access to:')} ${enabledToolNames.length > 0 ? enabledToolNames.join(", ") : "No tools"}\n${chalk.gray('• Type "exit" to end conversation')}\n${chalk.gray('• Press Ctrl+C to quit anytime')}`,
        {
            padding: 1,
            margin: { bottom: 1 },
            borderStyle: "round",
            borderColor: "gray",
            dimBorder: true,
        }
    );

    console.log(helpBox);

    while (true) {
        const userInput: any = await text({
            message: chalk.blue("Your message:"),
            placeholder: "Type your message...",
            validate: (value) => {
                if (!value || value.trim().length === 0) {
                    return "Message cannot be empty";
                }
            }
        })

        if (isCancel(userInput)) {
            const exitBox = boxen(chalk.yellow("Chat session ended. Goodbye!"), {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "yellow",
            });
            console.log(exitBox);
            process.exit(0);
        }

        if (userInput.toLowerCase() === "exit") {
            const exitBox = boxen(chalk.yellow("Chat session ended. Goodbye!"), {
                padding: 1,
                margin: 1,
                borderStyle: "round",
                borderColor: "yellow",
            });
            console.log(exitBox);
            break;
        }

        const userBox = boxen(chalk.white(userInput), {
            padding: 1,
            margin: { left: 2, top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "blue",
            title: "You",
            titleAlignment: "left",
        });
        console.log(userBox);

        await saveMessage(conversation.id, "user", userInput);
        const messages = await chatService.getMessages(conversation.id);
        const aiResponse = await getAIResponse(conversation.id);
        await saveMessage(conversation.id, "assistant", aiResponse);
        await updateConversation(conversation.id, userInput, messages.length);
    }
}


export async function startToolChat(conversationId: null) {
    try {
        intro(
            boxen(chalk.bold.cyan("Codev AI - Tool Calling Mode"), {
                padding: 1,
                borderStyle: "double",
                borderColor: "cyan",
            })
        );

        const user = await getUserFromToken();

        //select tools
        await selectTools();

        const conversation = await initConversation(user.id, conversationId, "tool");
        await chatLoop(conversation);

        //Reset tools on exit
        resetTools();

        outro(
            chalk.green("Thanks for using tools!")
        )
    } catch (error: any) {
        const errorBox = boxen(chalk.red(`Error: ${error.message}`), {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "red",
        });
        console.log(errorBox);
        resetTools();
        process.exit(1);
    }
}