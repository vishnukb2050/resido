import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { chatApi } from '../../src/services/api';

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
                    Alert.alert('Error', 'Could not start chat.');
                    router.back();
                }
            } catch (e: any) {
                console.error('[new chat] failed', e?.response?.data || e?.message);
                Alert.alert('Error', 'Could not start chat. Please try again.');
                router.back();
            }
        };
        start();
    }, [userId]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#1d4ed8" />
            <Text style={styles.text}>Opening chat…</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    text: { marginTop: 16, color: '#64748b', fontSize: 14, fontWeight: '600' },
});
