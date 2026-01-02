import prisma from "../lib/db";





export class ChatService {

    /**
     * Create a new Conversation
     * @param { string } userId - User ID
     * @param { string } mode - chat, tool, or agent
     * @param { string } title - Optional Conversation Title
     */

    async createConversation( userId: string, mode = "chat", title = null) {

        return await prisma.conversation.create({
            data: {
                userId,
                mode,
                title: title || `New ${mode} conversation`
            },
            include: {
                messages: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        })
    }

    /**
     * Get or create a conversation for user
     * @param { string } userId - UserId
     * @param { string } conversationId - Optional Conversation ID
     * @param { string } mode - chat, tool, or agent
     */

    async getOrCreateConversation(userId: any, conversationId: any, mode = "chat") {
        if (conversationId) {
            const conversation = await prisma.conversation.findFirst({
                where: {
                    id: conversationId,
                    userId,
                },
                include: {
                    messages: {
                        orderBy: { 
                            createdAt: 'asc'
                        }
                    }
                }
            })

            if (conversation) {
                return conversation;
            }
        }

        return await this.createConversation(userId, mode);
    }


    /**
     * Add a message to conversation
     * @param { string } conversationId - Conversation ID
     * @param { string } role - user, assistant, system, tool
     * @param { string | Object } content - Message Content
     */

    async addMessage(conversationId: string, role: string, content: string | object) {
        const contentStr = typeof content === "string" ? content : JSON.stringify(content);

        return await prisma.message.create({
            data: {
                conversationId,
                role,
                content: contentStr,
            },
        })
    }

    /**
     * Get conversation messages
     * @param { string } conversationId - Conversation ID
     */

    async getMessages(conversationId: string) {
        const messages = await prisma.message.findMany({
            where: {
                conversationId
            },
            orderBy: {
                createdAt: "asc"
            }
        })

        //Parse JSON content back to objects if needed
        return messages.map((message) => ({
            ...message,
            content: this.parseContent(message.content)
        }))
    }

    /**
     * Get all conversations for a user
     * @param { string } userId - User ID
     */

    async getUserConversations(userId: string) {
        return await prisma.conversation.findMany({
            where: { userId },
            orderBy: {
                updatedAt: "desc"
            },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: "desc" }
                }
            }
        })
    }

    /**
     * Delete a conversation
     * @param { string } ConversationId - ConversationId Id
     * @param { string } userId - User ID (for security)
     */
    async deleteConversation(conversationId: string, userId: string) {
        return await prisma.conversation.findMany({
            where: {
                id: conversationId,
                userId
            }
        })
    }

    /**
     * Update the conversation title
     * @param { string } conversationId - Conversation Id
     * @param { string } title - New Title
     */

    async updateTitle(conversationId: string, title: string) {
        return await prisma.conversation.update({
            where: { id: conversationId } ,
            data: { title }
        })
    }

    /**
     * helper tp parse Content {Json to  string}
     */

    parseContent(content: string) {
        try {
            return JSON.parse(content)
        } catch {
            return content
        }
    }

    /**\
     * Format messages for AI SDK
     * @param { Array } messages - Database messages
     */

    formatMessagesForAI(messages: any[]) {
        return messages.map((message) => ({
            role: message.role,
            content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        }))
    }
}
