import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function ThreadScreen() {
    const [threads, setThreads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();

    useEffect(() => {
        fetchThreads();
    }, [activeWorkspace]);

    const fetchThreads = async () => {
        try {
            const { data } = await api.get('/blogs'); // Using /blogs endpoint as backend for threads
            setThreads(data);
        } catch (error) {
            console.error('Failed to fetch threads', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.title}>Community Threads</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-blog')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={threads}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.threadCard} onPress={() => {}}>
                        <View style={styles.threadInfo}>
                            <View style={styles.userRow}>
                                <View style={styles.avatarMini}>
                                    <Text style={styles.avatarTextMini}>{(item.authorName || 'U')[0]}</Text>
                                </View>
                                <Text style={styles.authorName}>{item.authorName || 'Resident'}</Text>
                                <Text style={styles.dot}>•</Text>
                                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <Text style={styles.threadTitle}>{item.title}</Text>
                            <Text style={styles.threadContent} numberOfLines={4}>{item.content}</Text>
                            {item.mediaUrls?.[0] && (
                                <Image source={{ uri: item.mediaUrls[0] }} style={styles.threadImage} />
                            )}
                            <View style={styles.threadMeta}>
                                <TouchableOpacity style={styles.metaItem}>
                                    <Ionicons name="chatbubble-outline" size={16} color="#64748b" />
                                    <Text style={styles.metaText}>12</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.metaItem}>
                                    <Ionicons name="heart-outline" size={16} color="#64748b" />
                                    <Text style={styles.metaText}>24</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.metaItem}>
                                    <Ionicons name="share-social-outline" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No threads yet. Start a conversation!</Text>}
                onRefresh={fetchThreads}
                refreshing={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    addBtn: { backgroundColor: '#6366f1', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    threadCard: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
    threadInfo: { padding: 16 },
    userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarMini: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    avatarTextMini: { color: '#3b82f6', fontSize: 10, fontWeight: '700' },
    authorName: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    dot: { marginHorizontal: 6, color: '#94a3b8' },
    date: { fontSize: 11, color: '#94a3b8' },
    threadTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    threadContent: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
    threadImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#f8fafc', marginBottom: 12 },
    threadMeta: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 100 },
});
