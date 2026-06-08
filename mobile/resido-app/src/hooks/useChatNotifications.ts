import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, InteractionManager } from 'react-native';
import type { Audio as AudioType } from 'expo-av';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getActiveConversation } from '../services/chatPresence';
import { getSessionId } from '../utils/jwt';

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

    const soundRef = useRef<AudioType.Sound | null>(null);

    // Defer all chat-presence work until after the first screen has painted and
    // interactions settle. Connecting the socket, importing `expo-av`, and
    // decoding the notification WAV are not needed for the first frame, and doing
    // them during boot competes with hydration + the dashboard's lazy chunk.
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => setReady(true));
        return () => task.cancel();
    }, []);

    // Lazily preload the notification sound (pulls in `expo-av` off the boot path).
    useEffect(() => {
        if (!ready) return;
        let mounted = true;
        (async () => {
            try {
                const { Audio } = await import('expo-av');
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
    }, [ready]);

    useEffect(() => {
        if (!ready || !token || !userId) return;

        let cleanup: (() => void) | null = null;
        let cancelled = false;

        // Dynamic import keeps `socket.io-client` out of the boot bundle; it loads
        // only once we're past first paint and the user is actually signed in.
        (async () => {
            const { acquireChatSocket, releaseChatSocket } = await import(
                '../services/chatSocket'
            );
            if (cancelled) return;

            const socket = acquireChatSocket({ token, tenantId, dbName, memberId: userId });

            const onInbox = (payload: { conversationId: string; message: any }) => {
                const msg = payload?.message;
                if (!msg) return;

                let found = false;
                queryClient.setQueriesData<any[]>({ queryKey: ['conversations'] }, (oldData) => {
                    if (!oldData) return [];
                    const targetIdx = oldData.findIndex((c) => c.id === payload.conversationId);
                    if (targetIdx === -1) {
                        return oldData;
                    }
                    found = true;
                    const next = [...oldData];
                    const [target] = next.splice(targetIdx, 1);

                    const isMine = msg.senderId === userId;
                    const isActive = payload.conversationId === getActiveConversation();
                    const newUnreadCount = (!isMine && !isActive)
                        ? (target.unreadCount || 0) + 1
                        : (target.unreadCount || 0);

                    const remainingMessages = (target.messages || []).filter((m: any) => m.id !== msg.id);

                    const updated = {
                        ...target,
                        messages: [msg, ...remainingMessages],
                        unreadCount: newUnreadCount,
                    };
                    return [updated, ...next];
                });

                if (!found) {
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }

                // Only chime for messages from other people, when the app is in the
                // foreground, and not for the conversation already open on screen.
                const isMine = msg?.senderId === userId;
                const isActive = payload?.conversationId === getActiveConversation();
                if (isMine || isActive) return;
                if (AppState.currentState !== 'active') return;
                soundRef.current?.replayAsync().catch(() => undefined);
            };
            socket.on('inbox_message', onInbox);

            // Single-device policy: the server tells us when this account has
            // logged in on another device. If the now-active session id differs
            // from the one in our token, this device is the old one → sign out.
            const onForceLogout = (payload: { activeSid?: string }) => {
                const mySid = getSessionId(useAuthStore.getState().token);
                if (payload?.activeSid && mySid && payload.activeSid === mySid) return;
                try {
                    useAuthStore.getState().logout();
                } finally {
                    Alert.alert(
                        'Signed out',
                        'Your account was used to sign in on another device. Only one device can be active at a time.',
                    );
                }
            };
            socket.on('force_logout', onForceLogout);

            cleanup = () => {
                socket.off('inbox_message', onInbox);
                socket.off('force_logout', onForceLogout);
                releaseChatSocket();
            };
        })();

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [ready, token, userId, tenantId, dbName, queryClient]);
}
