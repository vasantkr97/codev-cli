import chalk from "chalk";
import boxen from "boxen";
import { text, isCancel, intro, outro, confirm } from "@clack/prompts";
import { getStoredToken } from "../commands/auth/login.js";
import prisma from "../../lib/db.js";
import { AIService } from "../../services/google.service.js";
import { ChatService } from "../../services/chat.service.js";
import { generateApplication } from "../../config/agent.config.js";

const aiService = new AIService();
const chatService = new ChatService();

async function getUserFromToken() {
  const token = await getStoredToken();
  
  if (!token?.access_token) {
    throw new Error("Not authenticated. Please run 'codev login' first.");
  }

  const user = await prisma.user.findFirst({
    where: {
      sessions: {
        some: { token: token.access_token },
      },
    },
  });

  if (!user) {
    throw new Error("User not found. Please login again.");
  }

  console.log(chalk.green(`\n✓ Welcome back, ${user.name}!\n`));
  return user;
}


async function initConversation(userId: any, conversationId: any, mode: any) {
    const conversation = await chatService.getOrCreateConversation(userId, conversationId, mode);

    const conversationInfo = boxen(
    `${chalk.bold("Conversation")}: ${conversation.title}\n` +
    `${chalk.gray("ID:")} ${conversation.id}\n` +
    `${chalk.gray("Mode:")} ${chalk.magenta("Agent (Code Generator)")}\n` +
    `${chalk.cyan("Working Directory:")} ${process.cwd()}`,
    {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "magenta",
      title: "Agent Mode",
      titleAlignment: "center",
    }
  );

  console.log(conversationInfo);
  
  return conversation;


}

async function saveMessage(conversationId: any, role: any, content: any) {
  return await chatService.addMessage(conversationId, role, content);
}

async function agentLoop(conversation: any) {

    const helpBox = boxen(
    `${chalk.cyan.bold("What can the agent do?")}\n\n` +
    `${chalk.gray('• Generate complete applications from descriptions')}\n` +
    `${chalk.gray('• Create all necessary files and folders')}\n` +
    `${chalk.gray('• Include setup instructions and commands')}\n` +
    `${chalk.gray('• Generate production-ready code')}\n\n` +
    `${chalk.yellow.bold("Examples:")}\n` +
    `${chalk.white('• "Build a todo app with React and Tailwind"')}\n` +
    `${chalk.white('• "Create a REST API with Express and MongoDB"')}\n` +
    `${chalk.white('• "Make a weather app using OpenWeatherMap API"')}\n\n` +
    `${chalk.gray('Type "exit" to end the session')}`,
    {
      padding: 1,
      margin: { bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
      title: "Agent Instructions",
    }
  );
  
  console.log(helpBox);

  while (true) {
    const userInput = await text({
        message: chalk.magenta("What would you like to do?"),
        placeholder: "Describe your application...",
        validate(value) {
            if (!value || value.trim().length === 0) {
                return "Description cannot empty";
            }
            if (value.trim().length < 10) {
                return "Please provide details (at least 10 characters)";
            }
        }
    })

    if (isCancel(userInput)) {
      console.log(chalk.yellow("\n Agent session cancelled\n"));
      process.exit(0);
    }

    if (userInput.toLowerCase() === "exit") {
      console.log(chalk.yellow("\n Agent session ended\n"));
      break;
    }

    const userBox = boxen(chalk.white(userInput), {
      padding: 1,
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "blue",
      title: "Your Request",
      titleAlignment: "left",
    });
    console.log(userBox);

    //Save User Message
    await saveMessage(conversation.id, "user", userInput);

    try {
        // Generate application using structured output
        const result = await generateApplication(
            userInput,
            aiService,
            process.cwd()
        );

        if (result && result.success) {
            //Save Successfull generation details
            const responseMessage = `Generated application: ${result.folderName}\n` +
                `Files created: ${result.files.length}\n` +
                `Location: ${result.appDir}\n\n` +
                `Setup commands:\n${result.commands.join('\n')}`;

            await saveMessage(conversation.id, "assistant", responseMessage);

            //Ask if User wants to generate another application
            const continuePrompt = await confirm({
                message: chalk.cyan("Do you want to generate another application?"),
                initialValue: false
            });

            if (isCancel(continuePrompt) || !continuePrompt) {
                 console.log(chalk.yellow("\nGreat! Check your new application.\n"));
                 break;
            }
        } else {
            throw new Error("Something went wrong in Generation");
        }
    } catch (error: any) {
        console.log(chalk.red(`\n Error: ${error.message}\n`));
      
        await saveMessage(conversation.id, "assistant", `Error: ${error.message}`);
      
        const retry = await confirm({
            message: chalk.cyan("Would you like to try again?"),
            initialValue: true,
        });

        if (isCancel(retry) || !retry) {
            break;
        }
    }
  }
}


export async function startAgentChat(conversationId: null) {
    try {
        intro(
            boxen(
                chalk.bold.magenta("Codev CLI - Agent Mode\n\n") + 
                chalk.gray("Autonomous Application Generator"),
                {
                padding: 1,
                borderStyle: "double",
                borderColor: "magenta",
                }
            )
        );

        const user = await getUserFromToken();

        const shouldContinue = await confirm({
            message: chalk.yellow("The agent will create files and folders in the current directory. Do you want to continue?"),
            initialValue: true
        })

        if (isCancel(shouldContinue) || !shouldContinue) {
            console.log(chalk.yellow("\nAgent session cancelled\n"));
            process.exit(0);
        }

        const conversation = await initConversation(user.id, conversationId, "agent");

        await agentLoop(conversation);

        outro(chalk.green.bold("\nThanks for using Agent Mode!"));
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