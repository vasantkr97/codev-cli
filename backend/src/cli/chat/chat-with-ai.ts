import chalk from "chalk";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { AIService } from "../ai/google-service";
import { ChatService } from "../../services/chat.service";
import { getStoredToken } from "../commands/auth/login";
import yoctoSpinner from "yocto-spinner";
import prisma from "../../lib/db";
import boxen from "boxen";
import { text, isCancel, cancel, intro, outro } from "@clack/prompts";




// Configure marked to use terminal renderer
marked.use(
    markedTerminal({
        // Styling options for terminal output
        code: chalk.cyan,
        blockquote: chalk.gray.italic,
        heading: chalk.green.bold,
        firstHeading: chalk.magenta.underline.bold,
        hr: chalk.reset,
        listitem: chalk.reset,
        list: chalk.reset,
        paragraph: chalk.reset,
        strong: chalk.bold,
        em: chalk.italic,
        codespan: chalk.yellow.bgBlack,
        del: chalk.dim.gray.strikethrough,
        link: chalk.blue.underline,
        href: chalk.blue.underline,
    })
);

const aiService = new AIService();
const chatService = new ChatService();

async function getUserfromToken() {
    const token = await getStoredToken()

    if (!token?.access_token) {
        throw new Error("Not authenticated. Please run 'orbit login first.");
    }

    const spinner = yoctoSpinner({ text: "Authenticating..." }).start();

    const user = await prisma.user.findFirst({
        where: {
            sessions: {
                some: { token: token.access_token }
            },
        },
    });

    if (!user) {
        spinner.error("User not found");
        throw new Error("User not found. Please login again")
    }

    spinner.success(`Welcome back, ${user.name}!`)

    return user
}

//@ts-ignore
async function initConversation(userId, conversationId, mode) {
    const spinner = yoctoSpinner({ text: "Loading Conversation..." }).start();

    const conversation = await chatService.getOrCreateConversation(userId, conversationId, mode);

    spinner.success(`Conversation loaded.`)

    //Display conversation info in a box
    const conversationInfo = boxen(
        `${chalk.bold("Conversation")}: ${conversation.title}\n${chalk.gray("ID: " + conversation.id)}\n${chalk.gray("Mode: " + conversation.mode)}`,
        {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "cyan",
            title: "💬 Chat Session",
            titleAlignment: "center",
        }
    )

    console.log(conversationInfo)

    //Display existing messages if any
    if (conversation.messages?.length > 0) {
        console.log(chalk.yellow("Previous messages:\n"))
        displayMessages(conversation.messages)
    }

    return conversation
}

function displayMessages(messages: any[]) {
    messages.forEach((msg) => {
        if (msg.role === "user") {
            const userBox = boxen(chalk.white(msg.content), {
                padding: 1,
                margin: { left: 2, bottom: 1 },
                borderStyle: "round",
                borderColor: "blue",
                title: "👤 You",
                titleAlignment: "left",
            });
            console.log(userBox);
        } else {
            // Render markdown for assistant messages
            const renderedContent = marked.parse(msg.content) as string;
            const assistantBox = boxen(renderedContent.trim(), {
                padding: 1,
                margin: { left: 2, bottom: 1 },
                borderStyle: "round",
                borderColor: "green",
                title: "🤖 Assistant",
                titleAlignment: "left",
            });
            console.log(assistantBox);
        }
    });
}

async function saveMessage(conversationId: any, role: any, content: any) {
    return await chatService.addMessage(conversationId, role, content)
}


async function getAIResponse(conversationId: any) {
    const spinner = yoctoSpinner({ text: "AI is thinking...", color: "yellow" }).start();

    const dbMessages = await chatService.getMessages(conversationId)
    const aiMessages = chatService.formatMessagesForAI(dbMessages)

    let fullResponse = ""
    let isFirstChunk = true

    try {
        const result = await aiService.sendMessage(aiMessages, (chunk: any) => {
            //Stop Spinner on First chunk and show header
            if (isFirstChunk) {
                spinner.stop();
                console.log("\n")
                const header = chalk.green.bold("🤖 Assistant:")
                console.log(header);
                console.log(chalk.gray("-".repeat(60)));
                isFirstChunk = false;
            }

            // Real-time streaming: print each chunk immediately as it arrives
            //process.stdout.write(chunk);

            fullResponse += chunk;

        }, undefined, null);

        console.log("\n");
        const renderedMarkdown = marked.parse(fullResponse);
        console.log(renderedMarkdown);
        console.log(chalk.gray("─".repeat(60)));
        console.log("\n");  

        // Add newline after streaming completes, then show closing divider
        // console.log("\n");
        // console.log(chalk.gray("-".repeat(60)));
        // console.log("\n");

        return result.content;
    } catch (error) {
        spinner.error("failed to get Ai response");
        throw error
    }
}


async function updateConversationTitle(conversationId: any, userInput: any, messageCount: any) {
    if (messageCount === 1) {
        const title = userInput.slice(0, 50) + (userInput.length > 50 ? "..." : "")
        await chatService.updateTitle(conversationId, title)
    }
}

async function chatLoop(conversation: any) {
    const helpBox = boxen(
        `${chalk.gray('• Type your message and press Enter')}\n${chalk.gray('• Markdown formatting is supported in responses')}\n${chalk.gray('• Type "exit" to end conversation')}\n${chalk.gray('• Press Ctrl+C to quit anytime')}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: "round",
      borderColor: "gray",
      dimBorder: true,
    })

    console.log(helpBox)

    while (true) {
        const userInput = await text({
            message: chalk.blue.bold("You:"),
            placeholder: "Type your message here...",
            validate(value) {
                if (!value || value.trim().length === 0) {
                    return "Please enter a message"
                }
            }
        })

        //Handle cancellation (Ctrl + C) 
        if (isCancel(userInput)) {
            const exitBox = boxen(
                `${chalk.yellow.bold("Conversation ended.")}`,
                {
                    padding: 1,
                    margin: { bottom: 1 },
                    borderStyle: "round",
                    borderColor: "yellow",
                }
            )
            console.log(exitBox)
            process.exit(0)
        }

        //Handle exit command
        if (userInput.toLowerCase() === "exit") {
            const exitBox = boxen(chalk.yellow("Chat session ended."), {
                padding: 1,
                margin: { bottom: 1 },
                borderStyle: "round",
                borderColor: "yellow",
            })
            console.log(exitBox)
            break;
        }

        //Save user message to db
        await saveMessage(conversation.id, "user", userInput) 

        //Get messages count before AI response
        const messages = await chatService.getMessages(conversation.id)

        //Get AI response with streaming and markdown rendering
        const aiResponse = await getAIResponse(conversation.id)

        //Save AI response to db
        await saveMessage(conversation.id, "assistant", aiResponse);

        //Update title if first exchange
        await updateConversationTitle(conversation.id, userInput, messages.length)
    }
}

//main entry point
export async function startChat(mode: "chat", conversationId = null) {
    try {
        //Display intro banner
        intro(
            boxen(chalk.bold.cyan("Codev AI Chat"), {
                padding: 1,
                margin: 1,
                borderStyle: "double",
                borderColor: "cyan",
            })
        )

        const user = await getUserfromToken();
        const conversation = await initConversation(user.id, conversationId, mode);
        await chatLoop(conversation);
    } catch (error: any) {
        const errorBox = boxen(chalk.red(`Error: ${error.message}`), {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "red",
        });
        console.log(errorBox);
        process.exit(1);
    }
}