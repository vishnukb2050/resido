import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

export default function ComplaintsListScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const { data } = await communityApi.getComplaints(user?.id || '');
            setComplaints(data);
        } catch (e) {
            console.error('Fetch complaints failed', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RESOLVED': return '#10b981';
            case 'IN_PROGRESS': return '#3b82f6';
            case 'OPEN': return '#f59e0b';
            default: return '#64748b';
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'URGENT': return '#ef4444';
            case 'HIGH': return '#f97316';
            default: return '#3b82f6';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Requests & Complaints</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-complaint')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4c1d95" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={complaints}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isExpanded = expandedComplaintId === item.id;
                        return (
                            <TouchableOpacity 
                                style={styles.card}
                                onPress={() => setExpandedComplaintId(isExpanded ? null : item.id)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.categoryBadge, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                        <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.description}>{item.description}</Text>

                                {isExpanded && (
                                    <View style={styles.expandedSection}>
                                        {/* Original request photos */}
                                        {item.mediaUrls && item.mediaUrls.length > 0 && (
                                            <View style={styles.sectionGroup}>
                                                <Text style={styles.sectionTitle}>Attached Photos</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                                                    {item.mediaUrls.map((url: string, idx: number) => (
                                                        <Image key={idx} source={{ uri: url }} style={styles.complaintImage} />
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}

                                        {/* Progress updates timeline */}
                                        <Text style={styles.sectionTitle}>Progress Timeline</Text>
                                        {(!item.progressNotes || (Array.isArray(item.progressNotes) ? item.progressNotes.length : JSON.parse(item.progressNotes || '[]').length) === 0) ? (
                                            <Text style={styles.noProgressText}>No progress updates logged yet.</Text>
                                        ) : (
                                            <View style={styles.timelineContainer}>
                                                {(Array.isArray(item.progressNotes) ? item.progressNotes : JSON.parse(item.progressNotes || '[]')).map((note: any, idx: number) => {
                                                    const progressList = Array.isArray(item.progressNotes) ? item.progressNotes : JSON.parse(item.progressNotes || '[]');
                                                    return (
                                                        <View key={note.id || idx} style={styles.timelineItem}>
                                                            <View style={styles.timelineLineWrapper}>
                                                                <View style={styles.timelineDot} />
                                                                {idx !== progressList.length - 1 && (
                                                                    <View style={styles.timelineLine} />
                                                                )}
                                                            </View>
                                                            <View style={styles.timelineContent}>
                                                                <View style={styles.timelineHeader}>
                                                                    <Text style={styles.timelineUpdater}>{note.updatedBy}</Text>
                                                                    <Text style={styles.timelineDate}>{new Date(note.createdAt).toLocaleDateString()}</Text>
                                                                </View>
                                                                <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(note.status) + '15' }]}>
                                                                    <Text style={[styles.statusTextSmall, { color: getStatusColor(note.status) }]}>{note.status}</Text>
                                                                </View>
                                                                <Text style={styles.timelineMessage}>{note.message}</Text>
                                                                {note.photos && note.photos.length > 0 && (
                                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                                                                        {note.photos.map((photoUrl: string, pIdx: number) => (
                                                                            <Image key={pIdx} source={{ uri: photoUrl }} style={styles.timelineImage} />
                                                                        ))}
                                                                    </ScrollView>
                                                                )}
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                )}
 
                                <View style={styles.cardFooter}>
                                    <View style={styles.footerItem}>
                                        <Ionicons name="flag" size={14} color={getPriorityColor(item.priority)} />
                                        <Text style={[styles.footerText, { color: getPriorityColor(item.priority) }]}>{item.priority}</Text>
                                    </View>
                                    <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="construct-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Requests Yet</Text>
                            <Text style={styles.emptySub}>Raise a request or complaint for any issues in your apartment.</Text>
                            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-complaint')}>
                                <Text style={styles.createBtnText}>Raise New Request</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    categoryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    categoryText: { fontSize: 11, fontWeight: '800', color: '#4c1d95', textTransform: 'uppercase' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    description: { fontSize: 15, color: '#e2e8f0', fontWeight: '500', lineHeight: 22, marginBottom: 15 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 12, fontWeight: '800' },
    dateText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 22 },
    createBtn: { backgroundColor: '#4c1d95', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 30 },
    createBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // Expanded Section & Timeline Styling
    expandedSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    sectionGroup: { marginBottom: 15 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
    complaintImage: { width: 100, height: 100, borderRadius: 12, marginRight: 8 },
    noProgressText: { fontSize: 13, color: '#64748b', fontStyle: 'italic', marginBottom: 10, marginLeft: 4 },
    
    timelineContainer: { paddingLeft: 10, marginVertical: 10 },
    timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    timelineLineWrapper: { alignItems: 'center', width: 16 },
    timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginTop: 6 },
    timelineLine: { width: 2, flex: 1, backgroundColor: 'rgba(99, 102, 241, 0.15)', marginTop: 4, marginBottom: -10 },
    
    timelineContent: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    timelineUpdater: { fontSize: 13, fontWeight: '700', color: '#fff' },
    timelineDate: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    timelineMessage: { fontSize: 13, color: '#cbd5e1', lineHeight: 18, marginTop: 4 },
    timelineImage: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
    
    statusBadgeSmall: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
    statusTextSmall: { fontSize: 9, fontWeight: '800' }
});
