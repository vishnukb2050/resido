import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { chatApi } from '../services/api';
import dayjs from 'dayjs';

export default function ChatListScreen() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        chatApi.getConversations().then((r) => setConversations(r.data)).finally(() => setLoading(false));
    }, []);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Messages</Text>
            <FlatList
                data={conversations}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ gap: 12, padding: 16 }}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => router.push(`/chat/${item.id}`)}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.name?.[0] || 'C'}</Text>
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name || 'Conversation'}</Text>
                            <Text style={styles.lastMsg} numberOfLines={1}>
                                {item.messages?.[0]?.content || 'No messages yet'}
                            </Text>
                        </View>
                        <Text style={styles.time}>
                            {item.messages?.[0] ? dayjs(item.messages[0].createdAt).format('HH:mm') : ''}
                        </Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No conversations yet</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0', marginTop: 60, paddingHorizontal: 16, marginBottom: 10 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', padding: 14, borderRadius: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    info: { flex: 1, marginLeft: 12 },
    name: { fontSize: 16, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 },
    lastMsg: { fontSize: 13, color: '#94a3b8' },
    time: { fontSize: 11, color: '#475569' },
    empty: { textAlign: 'center', color: '#475569', marginTop: 48 },
});
