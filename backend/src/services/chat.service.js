



export class ChatService {

    /**
     * Create a new Conversation
     * @param { string } userId - User ID
     * @param { string } mode - chat, tool, or agent
     * @param { string } title - Optional Conversation Title
     */

    async createConversation( userId, mode = "chat", title = null) {

        return await prisma.conversation.create({
            data: {
                userId,
                mode,
                title: title || `New ${mode} conversation`
            }
        })
    }

    /**
     * Get or create a conversation for user
     * @param { string } userId - UserId
     * @param { string } conversationId - Optional Conversation ID
     * @param { string } mode - chat, tool, or agent
     */

    async getOrCreateConversation(userId, conversationId, mode = "chat") {
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

    async addMessage(conversationId, role, content) {
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

    async getMessages(conversationId) {
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
            content: typeof message.content === "string" ? JSON.parse(message.content) : message.content
        }))
    }

    /**
     * Get all conversations for a user
     * @param { string } userId - User ID
     */

    async getUserConversations(userId) {
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
    async deleteConversation(conversationId, userId) {
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

    async updateTitle(conversationId, title) {
        return await prisma.conversation.findFirst({
            where: { id: conversationId } ,
            data: { title }
        })
    }

    /**
     * helper tp parse Content {Json to  string}
     */

    parseContent(content) {
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

    formatMessagesForAI(messages) {
        return messages.map((message) => ({
            role: message.role,
            content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
        }))
    }
}
