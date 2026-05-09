import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { threadApi } from '../services/api';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import BottomNav from '../components/BottomNav';

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
            const { data } = await threadApi.getThreads();
            setThreads(data);
        } catch (e) {
            console.error('Failed to fetch threads', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Threads</Text>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color="#1e293b" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <FlatList
                    data={threads}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.threadCard}
                            onPress={() => router.push(`/thread/${item.id}`)}
                        >
                            <Text style={styles.threadTitle}>{item.title}</Text>
                            <Text style={styles.threadSnippet} numberOfLines={3}>
                                {item.content}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}

            <TouchableOpacity 
                style={styles.fab}
                onPress={() => router.push('/create-thread')}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Thread" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    listContent: { padding: 16, paddingBottom: 110 },
    threadCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    threadTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    threadSnippet: { fontSize: 14, color: '#64748b', lineHeight: 20 },
    fab: { position: 'absolute', bottom: 100, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
});
