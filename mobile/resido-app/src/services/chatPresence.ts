/**
 * Tracks which conversation (if any) the user is currently viewing. The global
 * chat-notification listener uses this to suppress the notification sound for
 * messages that arrive in the conversation already open on screen.
 */
let activeConversationId: string | null = null;

export function setActiveConversation(id: string | null) {
    activeConversationId = id;
}

export function getActiveConversation(): string | null {
    return activeConversationId;
}
