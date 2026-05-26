import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function PollsScreen() {
    const { data: polls = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['polls'],
        queryFn: async () => {
            const res = await communityApi.getPolls();
            return res.data;
        }
    });
    const [voting, setVoting] = useState<string | null>(null);
    const { user } = useAuthStore();

    const vote = async (pollId: string, optionId: string) => {
        if (!user?.id) return;
        setVoting(optionId);
        try {
            await communityApi.votePoll(user.id, optionId);
            refetch();
        } catch (e: any) {
            Alert.alert('Error', e.response?.data?.message || 'Vote failed');
        } finally { setVoting(null); }
    };

    if (isLoading) return <ActivityIndicator style={{ flex: 1 }} color="#8b5cf6" />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Polls</Text>
            <FlatList
                data={polls}
                keyExtractor={(p) => p.id}
                contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
                onRefresh={refetch}
                refreshing={isRefetching}
                renderItem={({ item: poll }) => {
                    const totalVotes = poll.options.reduce((s: number, o: any) => s + (o.votes?.length || 0), 0);
                    return (
                        <View style={styles.card}>
                            <Text style={styles.question}>{poll.question}</Text>
                            {poll.options.map((opt: any) => {
                                const count = opt.votes?.length || 0;
                                const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                                return (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={styles.option}
                                        onPress={() => vote(poll.id, opt.id)}
                                        disabled={!!voting}
                                    >
                                        <View style={[styles.progress, { width: `${pct}%` }]} />
                                        <Text style={styles.optionText}>{opt.text}</Text>
                                        <Text style={styles.pct}>{pct}%</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            <Text style={styles.total}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Text>
                        </View>
                    );
                }}
                ListEmptyComponent={<Text style={styles.empty}>No active polls</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF', padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#9A8EBA', marginTop: 40, marginBottom: 20 },
    card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#D4C9E8' },
    question: { fontSize: 16, fontWeight: '700', color: '#9A8EBA', marginBottom: 16 },
    option: { position: 'relative', backgroundColor: '#F4EEFC', borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    progress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(37,99,235,0.2)', borderRadius: 10 },
    optionText: { flex: 1, color: '#9A8EBA', fontSize: 14, fontWeight: '500' },
    pct: { color: '#8b5cf6', fontWeight: '700', fontSize: 13 },
    total: { color: '#7A6B9C', fontSize: 12, marginTop: 8 },
    empty: { textAlign: 'center', color: '#5B4B8A', marginTop: 48 },
});
