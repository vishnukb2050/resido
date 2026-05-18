import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../services/api';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

export default function NoticeBoardScreen() {
    const router = useRouter();
    const { data: notices = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['notices'],
        queryFn: async () => {
            const res = await communityApi.getNotices();
            return res.data;
        }
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notice Board</Text>
                <TouchableOpacity>
                    <Ionicons name="filter-outline" size={24} color="#1e293b" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#0d9488" />
                </View>
            ) : (
                <FlatList
                    data={notices}
                    keyExtractor={(n) => n.id}
                    contentContainerStyle={styles.listContent}
                    onRefresh={refetch}
                    refreshing={isRefetching}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={styles.titleRow}>
                                    <View style={styles.iconBox}>
                                        <Ionicons name="megaphone" size={20} color="#0d9488" />
                                    </View>
                                    <Text style={styles.noticeTitle}>{item.title}</Text>
                                </View>
                                {item.sendWhatsApp && (
                                    <View style={styles.wpBadge}>
                                        <Ionicons name="logo-whatsapp" size={12} color="#22c55e" />
                                        <Text style={styles.wpBadgeText}>WhatsApp</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.noticeBody}>{item.body}</Text>
                            <View style={styles.cardFooter}>
                                <Text style={styles.date}>{dayjs(item.createdAt).format('DD MMM YYYY, HH:mm')}</Text>
                                <TouchableOpacity style={styles.detailsBtn}>
                                    <Text style={styles.detailsBtnText}>Details</Text>
                                    <Ionicons name="chevron-forward" size={14} color="#0d9488" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>No notices yet</Text>}
                />
            )}
            <BottomNav />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    listContent: { padding: 16, paddingBottom: 110, gap: 16 },
    card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    noticeTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1 },
    wpBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    wpBadgeText: { fontSize: 10, color: '#22c55e', fontWeight: '800' },
    noticeBody: { fontSize: 14, color: '#64748b', lineHeight: 22, marginBottom: 16, fontWeight: '500' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: 12 },
    date: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailsBtnText: { fontSize: 13, color: '#0d9488', fontWeight: '800' },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48, fontSize: 15, fontWeight: '600' },
});
