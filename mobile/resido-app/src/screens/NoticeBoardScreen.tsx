import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../services/api';
import dayjs from 'dayjs';

export default function NoticeBoardScreen() {
    const { data: notices = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['notices'],
        queryFn: async () => {
            const res = await communityApi.getNotices();
            return res.data;
        }
    });

    if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Notice Board</Text>
            <FlatList
                data={notices}
                keyExtractor={(n) => n.id}
                contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
                onRefresh={refetch}
                refreshing={isRefetching}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.noticeTitle}>{item.title}</Text>
                            {item.sendWhatsApp && <Text style={styles.wpBadge}>📱 WhatsApp</Text>}
                        </View>
                        <Text style={styles.noticeBody}>{item.body}</Text>
                        <Text style={styles.date}>{dayjs(item.createdAt).format('DD MMM YYYY, HH:mm')}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No notices yet</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0', marginTop: 40, marginBottom: 20 },
    card: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    noticeTitle: { fontSize: 15, fontWeight: '700', color: '#e2e8f0', flex: 1 },
    wpBadge: { fontSize: 11, color: '#22c55e', fontWeight: '600', backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
    noticeBody: { fontSize: 14, color: '#94a3b8', lineHeight: 20, marginBottom: 10 },
    date: { fontSize: 11, color: '#475569' },
    empty: { textAlign: 'center', color: '#475569', marginTop: 48 },
});
