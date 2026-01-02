import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateObject } from "ai";
import { config } from "../config/google.config";
import chalk from "chalk";


// Interfaces
export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ToolCall {
    name: string;
    args: Record<string, unknown>;
}

export interface SendMessageResponse {
    content: string;
    toolCalls?: ToolCall[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}


export class AIService {
    private model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;

    constructor() {
        if (!config.googleApiKey) {
            throw new Error("GOOGLE_API_KEY is not set in .env file")
        }

        // Create a custom Google provider with the API key
        const google = createGoogleGenerativeAI({
            apiKey: config.googleApiKey,
        });

        // Now use the provider to get the model
        this.model = google(config.model);
    }

    /**
     *Send a message and get streaming response
     * @param {Array} messages - Array of messages objects {role, content}
     * @param {Function} onChunk - Callback for each text chunk
     * @param {Object} tools - Optional tools object
     * @param {Function} onToolCall - Callback for each tool call
     * @returns {Promise<Object>} Full response with content, tool calls, and usage
     */

    async sendMessage(
        messages: any,
        onChunk: any,
        tools: any,
        onToolCall: any,
    ) {
        try {
            const streamConfig = {
                model: this.model,
                messages: messages,
                tools: tools,
            };

            //Add tools if provided with maxSteps for multi-step tool calling
            if (tools && Object.keys(tools).length > 0) {
                streamConfig.tools = tools;
                // streamConfig.maxSteps = 5;
            }

            const result = streamText(streamConfig);

            let fullResponse = "";

            //Stream text chunks
            for await (const chunk of result.textStream) {
                fullResponse += chunk;
                if (onChunk) {
                    onChunk(chunk);
                }
            }

            //IMPORTANT: Await the result to get access to steps, toolcalls, etc.
            const fullResult = result;

            const toolCalls = [];
            const toolResults = [];

            //Collect tool calls from all steps (if they exists)
            if (fullResult.steps && Array.isArray(fullResult.steps)) {
                for (const step of fullResult.steps) {
                    if (step.toolCalls && step.toolCalls.length > 0) {
                        for (const toolCall of step.toolCalls) {
                            toolCalls.push(toolCall);

                            if (onToolCall) {
                                onToolCall(toolCall);
                            }
                        }
                    }

                    //Collect tool results
                    if (step.toolResults && step.toolResults.length > 0) {
                        toolResults.push(...step.toolResults);
                    }
                }
            }

            return {
                content: fullResponse,
                finishReason: fullResult.finishReason,
                usage: fullResult.usage,
                toolCalls,
                toolResults,
                steps: fullResult.steps,
            };
        } catch (error: any) {
            console.error(chalk.red("AI Service Error:"), error.message);
            console.error(chalk.red("Full errror:"), error);
            throw error;
        }
    }

    /**
     * Get a non_streaming response from the model
     * @param {Array} messages - Array of messages objects {role, content}
     * @param {Object} tools - Optional tools object
     * @returns {Promise<Object>} Full response with content, tool calls, and usage
     */

    async getMessage(messages: any, tools = undefined) {
        let fullResponse = "";
        const result = await this.sendMessage(messages, (chunk: any) => {
            fullResponse += chunk;
        }, tools, null);

        return result.content;
    }


    /**
     *Generate structured output using Zod Schema
     *@param {Object} schema - Zod Schema for the output
     *@param {string} prompt - Prompt for generation
     *@returns {Promise<Object>} Parsed objectt matching the Schema
     */

    async generateStructured(schema: any, prompt: string) {
        try {
            const result = await generateObject({
                model: this.model,
                schema: schema,
                prompt: prompt,
            });

            return result.object;
        } catch (error: any) {
            console.error(chalk.red("AI Structured output Generation error:"), error.message);
            console.error(chalk.red("Full errror:"), error);
            throw error;
        }
    }
}