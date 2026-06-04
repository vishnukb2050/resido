import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Audio } from 'expo-av';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { acquireChatSocket, releaseChatSocket } from '../services/chatSocket';
import { getActiveConversation } from '../services/chatPresence';

/**
 * App-wide chat presence: keeps one socket open while the user is signed in so
 * incoming messages update unread badges (via the cached `conversations` query)
 * and play a notification sound — even when the user is not on the chat screen.
 *
 * The chat gateway emits a per-member `inbox_message` to each conversation
 * member's personal room, so this listener receives messages for every
 * conversation the user belongs to without joining each room.
 */
export function useChatNotifications() {
    const token = useAuthStore((s) => s.token);
    const userId = useAuthStore((s) => s.user?.id);
    const tenantId = useAuthStore((s) => s.activeWorkspace?.tenantId);
    const dbName = useAuthStore((s) => s.activeWorkspace?.dbName);
    const queryClient = useQueryClient();

    const soundRef = useRef<Audio.Sound | null>(null);

    // Preload the notification sound once.
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                });
                const { sound } = await Audio.Sound.createAsync(
                    require('../../assets/sounds/notification.wav'),
                );
                if (mounted) {
                    soundRef.current = sound;
                } else {
                    sound.unloadAsync().catch(() => undefined);
                }
            } catch {
                // Sound is best-effort; badges still work without it.
            }
        })();
        return () => {
            mounted = false;
            soundRef.current?.unloadAsync().catch(() => undefined);
            soundRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!token || !userId) return;

        const socket = acquireChatSocket({ token, tenantId, dbName, memberId: userId });

        const onInbox = (payload: { conversationId: string; message: any }) => {
            const msg = payload?.message;
            // Refresh the conversation list (and therefore unread counts + the
            // chat-tab badge) for every inbox event.
            queryClient.invalidateQueries({ queryKey: ['conversations'] });

            // Only chime for messages from other people, when the app is in the
            // foreground, and not for the conversation already open on screen.
            const isMine = msg?.senderId === userId;
            const isActive = payload?.conversationId === getActiveConversation();
            if (isMine || isActive) return;
            if (AppState.currentState !== 'active') return;
            soundRef.current?.replayAsync().catch(() => undefined);
        };
        socket.on('inbox_message', onInbox);

        return () => {
            socket.off('inbox_message', onInbox);
            releaseChatSocket();
        };
    }, [token, userId, tenantId, dbName, queryClient]);
}
