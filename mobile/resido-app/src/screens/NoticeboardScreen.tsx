import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

export default function NoticeboardScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    
    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

    const [newNotice, setNewNotice] = useState({ title: '', body: '' });

    useEffect(() => {
        fetchNotices();
    }, []);

    const fetchNotices = async () => {
        try {
            const { data } = await communityApi.getNotices();
            setNotices(data);
        } catch (e) {
            console.error('Fetch notices failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newNotice.title || !newNotice.body) return;
        try {
            await communityApi.createNotice({
                ...newNotice,
                postedBy: user?.id
            });
            setShowAdd(false);
            setNewNotice({ title: '', body: '' });
            fetchNotices();
            Alert.alert('Success', 'Notice posted successfully!');
        } catch (e) {
            Alert.alert('Error', 'Failed to post notice');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notice Board</Text>
                {isAdmin ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                ) : <View style={{ width: 44 }} />}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4c1d95" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={notices}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.noticeCard}>
                            <View style={styles.cardAccent} />
                            <View style={styles.cardContent}>
                                <Text style={styles.noticeTitle}>{item.title}</Text>
                                <Text style={styles.noticeBody}>{item.body}</Text>
                                <View style={styles.cardFooter}>
                                    <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                    <View style={styles.tag}>
                                        <Text style={styles.tagText}>OFFICIAL</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="megaphone-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Notices Yet</Text>
                            <Text style={styles.emptySub}>Important community updates will appear here.</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showAdd} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Post New Notice</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Notice Title"
                            placeholderTextColor="#64748b"
                            value={newNotice.title}
                            onChangeText={(t) => setNewNotice({...newNotice, title: t})}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Notice Body"
                            placeholderTextColor="#64748b"
                            multiline
                            value={newNotice.body}
                            onChangeText={(t) => setNewNotice({...newNotice, body: t})}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                                <Text style={styles.submitText}>Post Notice</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#23272a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    noticeCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, marginBottom: 16, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardAccent: { width: 6, backgroundColor: '#4c1d95' },
    cardContent: { flex: 1, padding: 20 },
    noticeTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
    noticeBody: { fontSize: 14, color: '#94a3b8', lineHeight: 22, marginBottom: 15 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    dateText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    tag: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagText: { color: '#4c1d95', fontSize: 10, fontWeight: '900' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 28, padding: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 18, fontSize: 16, fontWeight: '600', marginBottom: 15 },
    textArea: { height: 120, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 15 },
    cancelBtn: { flex: 1, padding: 18, alignItems: 'center' },
    cancelText: { color: '#64748b', fontWeight: '700' },
    submitBtn: { flex: 2, backgroundColor: '#4c1d95', borderRadius: 16, padding: 18, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '900' }
});
