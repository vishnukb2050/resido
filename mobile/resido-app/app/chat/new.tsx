import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { chatApi, authApi } from '../../src/services/api';

/**
 * Entry point for "start a new direct chat with user :userId". Creates (or
 * resumes) the DIRECT conversation on the backend, then replaces the route
 * with the real `/chat/:id` view. Lives at /chat/new?userId=… and is
 * navigated to from the contacts list, search results, and profile screens.
 */
export default function NewChatRoute() {
    const router = useRouter();
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const startedRef = useRef(false);

    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        const start = async () => {
            if (!userId) {
                Alert.alert('Missing user', 'No user id provided.');
                router.back();
                return;
            }
            try {
                const { data } = await chatApi.startDirect(String(userId));
                if (data?.id) {
                    router.replace(`/chat/${data.id}`);
                } else {
                    Alert.alert('Could not start chat', 'The server returned an unexpected response. Please try again.');
                    router.back();
                }
            } catch (e: any) {
                const status = e?.response?.status;
                const data = e?.response?.data || {};
                const reason = data?.reason;
                const serverMessage = data?.message || data?.error;

                // Restricted profile: the target only accepts messages from
                // approved followers. Offer to send a follow request.
                if (status === 403 && reason === 'FOLLOW_REQUIRED') {
                    const alreadyRequested = data?.followStatus === 'REQUESTED';
                    Alert.alert(
                        alreadyRequested ? 'Request pending' : 'Follow to chat',
                        alreadyRequested
                            ? 'Your follow request is waiting to be accepted. You can chat once they approve it.'
                            : 'This user only accepts messages from approved followers. Send a follow request?',
                        alreadyRequested
                            ? [{ text: 'OK', onPress: () => router.back() }]
                            : [
                                { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
                                {
                                    text: 'Send request',
                                    onPress: async () => {
                                        try {
                                            await authApi.follow(String(userId));
                                            Alert.alert('Request sent', 'You can chat once they accept your follow request.');
                                        } catch {
                                            Alert.alert('Could not send request', 'Please try again later.');
                                        } finally {
                                            router.back();
                                        }
                                    },
                                },
                            ],
                    );
                    return;
                }

                const message = serverMessage || e?.message || 'Unknown error';
                console.error('[new chat] failed', status, message, data || '');
                Alert.alert('Could not start chat', `${message}${status ? ` (HTTP ${status})` : ''}`);
                router.back();
            }
        };
        start();
    }, [userId]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.text}>Opening chat…</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5FF' },
    text: { marginTop: 16, color: '#7A6B9C', fontSize: 14, fontWeight: '600' },
});
