import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { chatApi } from '../services/api';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

export default function ChatListScreen() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        chatApi.getConversations().then((r) => setConversations(r.data)).finally(() => setLoading(false));
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <TouchableOpacity>
                    <Ionicons name="create-outline" size={24} color="#6366f1" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={20} color="#94a3b8" />
                    <TextInput 
                        placeholder="Search chats..." 
                        style={styles.searchInput}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(c) => c.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.card} 
                            onPress={() => router.push(`/chat/${item.id}`)}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{(item.profileName || item.name)?.[0] || 'C'}</Text>
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.name}>{item.profileName || item.name || 'Conversation'}</Text>
                                <Text style={styles.lastMsg} numberOfLines={1}>
                                    {item.messages?.[0]?.content || 'No messages yet'}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.time}>
                                    {item.messages?.[0] ? dayjs(item.messages[0].createdAt).format('HH:mm') : ''}
                                </Text>
                                {item.unreadCount > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>No conversations yet</Text>}
                />
            )}
            <BottomNav activeTab="Chat" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    searchContainer: { padding: 20, backgroundColor: '#fff' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '500' },
    listContent: { padding: 16, paddingBottom: 110, gap: 12 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
    info: { flex: 1, marginLeft: 14 },
    name: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    lastMsg: { fontSize: 13, color: '#64748b', fontWeight: '500' },
    time: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginBottom: 6 },
    unreadBadge: { backgroundColor: '#6366f1', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    unreadText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48, fontSize: 15, fontWeight: '600' },
});
