import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function BlogScreen() {
    const [blogs, setBlogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();

    useEffect(() => {
        fetchBlogs();
    }, [activeWorkspace]);

    const fetchBlogs = async () => {
        try {
            const { data } = await api.get('/blogs');
            setBlogs(data);
        } catch (error) {
            console.error('Failed to fetch blogs', error);
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
                <Text style={styles.title}>Community Blog</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-blog')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={blogs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.blogCard} onPress={() => {}}>
                        {item.mediaUrls?.[0] && (
                            <Image source={{ uri: item.mediaUrls[0] }} style={styles.blogImage} />
                        )}
                        <View style={styles.blogInfo}>
                            <Text style={styles.blogCategory}>{item.category || 'General'}</Text>
                            <Text style={styles.blogTitle}>{item.title}</Text>
                            <Text style={styles.blogSnippet} numberOfLines={2}>{item.content}</Text>
                            <View style={styles.blogMeta}>
                                <Text style={styles.blogDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                <TouchableOpacity style={styles.readMore}>
                                    <Text style={styles.readMoreText}>Read more</Text>
                                    <Ionicons name="chevron-forward" size={12} color="#6366f1" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No blog posts yet. Be the first to post!</Text>}
                onRefresh={fetchBlogs}
                refreshing={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff' },
    title: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    addBtn: { backgroundColor: '#6366f1', width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    list: { padding: 16 },
    blogCard: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    blogImage: { width: '100%', height: 180, backgroundColor: '#f1f5f9' },
    blogInfo: { padding: 16 },
    blogCategory: { fontSize: 10, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
    blogTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
    blogSnippet: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 15 },
    blogMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 12 },
    blogDate: { fontSize: 12, color: '#94a3b8' },
    readMore: { flexDirection: 'row', alignItems: 'center' },
    readMoreText: { fontSize: 13, fontWeight: '700', color: '#6366f1', marginRight: 4 },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 100 },
});
