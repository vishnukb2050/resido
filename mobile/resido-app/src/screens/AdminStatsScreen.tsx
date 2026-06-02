import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getThemeColors } from '../utils/theme';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

type StatsData = {
    people: {
        totalMembers: number;
        totalFamilies: number;
        occupiedUnits: number;
        emptyUnits: number;
        totalStaff: number;
        staffRoles: {
            SECURITY: number;
            CLEANING: number;
            ADMIN: number;
            MAINTENANCE: number;
        };
    };
    finance: {
        totalInvoiced: number;
        totalCollected: number;
        totalDues: number;
        unitsPaid: number;
        unitsDue: number;
        recentPendingDues: Array<{ unit: string; amount: number }>;
    };
    operations: {
        visitorsToday: number;
        activeComplaints: {
            PENDING: number;
            IN_PROGRESS: number;
            RESOLVED: number;
        };
        gatepasses: {
            totalCreated: number;
            totalApproved: number;
        };
    };
};

export default function AdminStatsScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [activeTab, setActiveTab] = useState<'people' | 'finance' | 'operations'>('people');
    const [data, setData] = useState<StatsData>({
        people: { totalMembers: 0, totalFamilies: 0, occupiedUnits: 0, emptyUnits: 0, totalStaff: 0, staffRoles: { SECURITY: 0, CLEANING: 0, ADMIN: 0, MAINTENANCE: 0 } },
        finance: { totalInvoiced: 0, totalCollected: 0, totalDues: 0, unitsPaid: 0, unitsDue: 0, recentPendingDues: [] },
        operations: { visitorsToday: 0, activeComplaints: { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 }, gatepasses: { totalCreated: 0, totalApproved: 0 } },
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(false);
            const res = await communityApi.getSummaryStats();
            if (res.data) {
                setData(res.data);
            }
        } catch (e) {
            console.error('Failed to load summary stats', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
                <StatusBar barStyle="light-content" />
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loaderText}>Consolidating stats from database...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
                <StatusBar barStyle="light-content" />
                <View style={styles.loaderContainer}>
                    <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
                    <Text style={[styles.loaderText, { marginTop: 16, color: '#ef4444' }]}>Failed to load stats</Text>
                    <Text style={[styles.loaderText, { fontSize: 12, marginTop: 6 }]}>Check your connection or server status</Text>
                    <TouchableOpacity onPress={loadStats} style={styles.retryBtn}>
                        <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Calculations for Circular Metrics
    const totalUnits = data.people.occupiedUnits + data.people.emptyUnits;
    const occupancyRate = totalUnits > 0 ? Math.round((data.people.occupiedUnits / totalUnits) * 100) : 0;

    const collectionRate = data.finance.totalInvoiced > 0 
        ? Math.round((data.finance.totalCollected / data.finance.totalInvoiced) * 100) 
        : 0;

    const totalComplaints = data.operations.activeComplaints.PENDING + 
        data.operations.activeComplaints.IN_PROGRESS + 
        data.operations.activeComplaints.RESOLVED;

    const resolutionRate = totalComplaints > 0 
        ? Math.round((data.operations.activeComplaints.RESOLVED / totalComplaints) * 100) 
        : 0;

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>Unified Stats Hub</Text>
                    <Text style={styles.headerSubtitle}>{activeWorkspace?.tenantName || "Township Operations"}</Text>
                </View>
                <TouchableOpacity onPress={loadStats} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            {/* Premium Sliding Segmented Tabs */}
            <View style={styles.tabsContainer}>
                <View style={[styles.tabsWrapper, { backgroundColor: theme.surface }]}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'people' && styles.activeTab]} 
                        onPress={() => setActiveTab('people')}
                    >
                        <Ionicons name="people" size={16} color={activeTab === 'people' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>People</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'finance' && styles.activeTab]} 
                        onPress={() => setActiveTab('finance')}
                    >
                        <Ionicons name="cash" size={16} color={activeTab === 'finance' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'finance' && styles.activeTabText]}>Finance</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'operations' && styles.activeTab]} 
                        onPress={() => setActiveTab('operations')}
                    >
                        <Ionicons name="shield-checkmark" size={16} color={activeTab === 'operations' ? '#fff' : '#94a3b8'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'operations' && styles.activeTabText]}>Ops</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* 1. PEOPLE & OCCUPANCY DASHBOARD */}
                {activeTab === 'people' && (
                    <View style={styles.section}>
                        {/* Circular Occupancy Meter */}
                        <View style={[styles.glassCard, { backgroundColor: theme.surface }]}>
                            <Text style={styles.cardTitle}>Unit/Address Occupancy Rate</Text>
                            <View style={styles.circleContainer}>
                                <View style={styles.progressCircle}>
                                    <View style={styles.progressInnerCircle}>
                                        <Text style={styles.circleValueText}>{occupancyRate}%</Text>
                                        <Text style={styles.circleLabelText}>Occupied</Text>
                                    </View>
                                </View>
                                <View style={styles.circleDetails}>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.bullet, { backgroundColor: '#10b981' }]} />
                                        <Text style={styles.detailLabel}>Occupied Units/Addresses:</Text>
                                        <Text style={styles.detailValue}>{data.people.occupiedUnits}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.bullet, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                                        <Text style={styles.detailLabel}>Empty Units/Addresses:</Text>
                                        <Text style={styles.detailValue}>{data.people.emptyUnits}</Text>
                                    </View>
                                    <View style={styles.detailDivider} />
                                    <View style={styles.detailRow}>
                                        <Ionicons name="business" size={14} color="#6366f1" style={{ marginRight: 6 }} />
                                        <Text style={styles.detailLabel}>Total Units/Addresses:</Text>
                                        <Text style={styles.detailValue}>{totalUnits}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Metrics Cards Grid */}
                        <View style={styles.gridContainer}>
                            <View style={[styles.gridHalfCard, { backgroundColor: theme.surface }]}>
                                <Ionicons name="home-outline" size={24} color="#6366f1" />
                                <Text style={styles.gridCardValue}>{data.people.totalFamilies}</Text>
                                <Text style={styles.gridCardLabel}>Families</Text>
                            </View>
                            <View style={[styles.gridHalfCard, { backgroundColor: theme.surface }]}>
                                <Ionicons name="people-outline" size={24} color="#10b981" />
                                <Text style={styles.gridCardValue}>{data.people.totalMembers}</Text>
                                <Text style={styles.gridCardLabel}>Residents</Text>
                            </View>
                        </View>

                        {/* Staff Breakdown Horizontal Bar Chart */}
                        <View style={[styles.glassCard, { backgroundColor: theme.surface, marginTop: 20 }]}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>Staff Distribution</Text>
                                <Text style={styles.cardHeaderSide}>{data.people.totalStaff} Total Staff</Text>
                            </View>

                            {/* Pictorial Segmented Bar */}
                            <View style={styles.segmentedBar}>
                                <View style={[styles.segment, { width: `${data.people.totalStaff > 0 ? (data.people.staffRoles.SECURITY / data.people.totalStaff) * 100 : 25}%`, backgroundColor: '#10b981' }]} />
                                <View style={[styles.segment, { width: `${data.people.totalStaff > 0 ? (data.people.staffRoles.CLEANING / data.people.totalStaff) * 100 : 25}%`, backgroundColor: '#0ea5e9' }]} />
                                <View style={[styles.segment, { width: `${data.people.totalStaff > 0 ? (data.people.staffRoles.ADMIN / data.people.totalStaff) * 100 : 25}%`, backgroundColor: '#6366f1' }]} />
                                <View style={[styles.segment, { width: `${data.people.totalStaff > 0 ? (data.people.staffRoles.MAINTENANCE / data.people.totalStaff) * 100 : 25}%`, backgroundColor: '#f59e0b' }]} />
                            </View>

                            {/* Legend Details */}
                            <View style={styles.legendGrid}>
                                <LegendRow color="#10b981" label="Security" count={data.people.staffRoles.SECURITY} total={data.people.totalStaff} />
                                <LegendRow color="#0ea5e9" label="Cleaning" count={data.people.staffRoles.CLEANING} total={data.people.totalStaff} />
                                <LegendRow color="#6366f1" label="Admin" count={data.people.staffRoles.ADMIN} total={data.people.totalStaff} />
                                <LegendRow color="#f59e0b" label="Maintenance" count={data.people.staffRoles.MAINTENANCE} total={data.people.totalStaff} />
                            </View>
                        </View>
                    </View>
                )}

                {/* 2. FINANCE, INCOME & PAYMENT DUES */}
                {activeTab === 'finance' && (
                    <View style={styles.section}>
                        {/* Maintenance Collection Progress */}
                        <View style={[styles.glassCard, { backgroundColor: theme.surface }]}>
                            <Text style={styles.cardTitle}>Dues Collection Performance</Text>
                            <View style={styles.circleContainer}>
                                <View style={[styles.progressCircle, { borderColor: '#10b981' }]}>
                                    <View style={styles.progressInnerCircle}>
                                        <Text style={styles.circleValueText}>{collectionRate}%</Text>
                                        <Text style={styles.circleLabelText}>Collected</Text>
                                    </View>
                                </View>
                                <View style={styles.circleDetails}>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.bullet, { backgroundColor: '#10b981' }]} />
                                        <Text style={styles.detailLabel}>Collected:</Text>
                                        <Text style={styles.detailValue}>₹{data.finance.totalCollected.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.bullet, { backgroundColor: '#ef4444' }]} />
                                        <Text style={styles.detailLabel}>Outstanding:</Text>
                                        <Text style={styles.detailValue}>₹{data.finance.totalDues.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.detailDivider} />
                                    <View style={styles.detailRow}>
                                        <Ionicons name="calculator" size={14} color="#6366f1" style={{ marginRight: 6 }} />
                                        <Text style={styles.detailLabel}>Total Target:</Text>
                                        <Text style={styles.detailValue}>₹{data.finance.totalInvoiced.toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Paid vs Due Grid */}
                        <View style={styles.gridContainer}>
                            <View style={[styles.gridHalfCard, { backgroundColor: theme.surface }]}>
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                <Text style={[styles.gridCardValue, { color: '#10b981' }]}>{data.finance.unitsPaid}</Text>
                                <Text style={styles.gridCardLabel}>Paid Units/Addresses</Text>
                            </View>
                            <View style={[styles.gridHalfCard, { backgroundColor: theme.surface }]}>
                                <Ionicons name="alert-circle" size={24} color="#ef4444" />
                                <Text style={[styles.gridCardValue, { color: '#ef4444' }]}>{data.finance.unitsDue}</Text>
                                <Text style={styles.gridCardLabel}>Pending Units/Addresses</Text>
                            </View>
                        </View>

                        {/* Outstanding Units List Table */}
                        <View style={[styles.glassCard, { backgroundColor: theme.surface, marginTop: 20 }]}>
                            <Text style={styles.cardTitle}>Top Outstanding Payment Dues</Text>
                            {data.finance.recentPendingDues.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="happy" size={32} color="#10b981" style={{ marginBottom: 8 }} />
                                    <Text style={styles.emptyText}>Awesome! All units are fully paid!</Text>
                                </View>
                            ) : (
                                <View style={styles.pendingList}>
                                    {data.finance.recentPendingDues.map((item, idx) => (
                                        <View key={idx} style={styles.pendingItem}>
                                            <View style={styles.pendingIconBox}>
                                                <Ionicons name="warning" size={18} color="#f59e0b" />
                                            </View>
                                            <View style={styles.pendingInfo}>
                                                <Text style={styles.pendingUnit}>{item.unit}</Text>
                                                <Text style={styles.pendingLabel}>Maintenance Levy</Text>
                                            </View>
                                            <Text style={styles.pendingAmount}>₹{item.amount.toLocaleString()}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* 3. OPERATIONS & SECURITY */}
                {activeTab === 'operations' && (
                    <View style={styles.section}>
                        {/* Complaints Status Circular Ring */}
                        <View style={[styles.glassCard, { backgroundColor: theme.surface }]}>
                            <Text style={styles.cardTitle}>Complaints Resolution Performance</Text>
                            <View style={styles.circleContainer}>
                                <View style={[styles.progressCircle, { borderColor: '#6366f1' }]}>
                                    <View style={styles.progressInnerCircle}>
                                        <Text style={styles.circleValueText}>{resolutionRate}%</Text>
                                        <Text style={styles.circleLabelText}>Resolved</Text>
                                    </View>
                                </View>
                                <View style={styles.circleDetails}>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.bullet, { backgroundColor: '#10b981' }]} />
                                        <Text style={styles.detailLabel}>Resolved:</Text>
                                        <Text style={styles.detailValue}>{data.operations.activeComplaints.RESOLVED}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.bullet, { backgroundColor: '#f59e0b' }]} />
                                        <Text style={styles.detailLabel}>In Progress:</Text>
                                        <Text style={styles.detailValue}>{data.operations.activeComplaints.IN_PROGRESS}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <View style={[styles.bullet, { backgroundColor: '#ef4444' }]} />
                                        <Text style={styles.detailLabel}>Pending Action:</Text>
                                        <Text style={styles.detailValue}>{data.operations.activeComplaints.PENDING}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Visitors Grid Metrics */}
                        <View style={styles.gridContainer}>
                            <View style={[styles.gridHalfCard, { backgroundColor: theme.surface }]}>
                                <Ionicons name="walk" size={24} color="#0ea5e9" />
                                <Text style={styles.gridCardValue}>{data.operations.visitorsToday}</Text>
                                <Text style={styles.gridCardLabel}>Visitors Today</Text>
                            </View>
                            <View style={[styles.gridHalfCard, { backgroundColor: theme.surface }]}>
                                <Ionicons name="qr-code" size={24} color="#3b82f6" />
                                <Text style={styles.gridCardValue}>{data.operations.gatepasses.totalApproved}</Text>
                                <Text style={styles.gridCardLabel}>Passes Scanned</Text>
                            </View>
                        </View>

                        {/* Security Entry/Exit Ratio Progress */}
                        <View style={[styles.glassCard, { backgroundColor: theme.surface, marginTop: 20 }]}>
                            <Text style={styles.cardTitle}>Gatepass Verification Rate</Text>
                            
                            {/* Visual Progress Bar */}
                            <View style={styles.progressFillBg}>
                                <View 
                                    style={[styles.progressFillLine, { 
                                        width: `${data.operations.gatepasses.totalCreated > 0 
                                            ? Math.round((data.operations.gatepasses.totalApproved / data.operations.gatepasses.totalCreated) * 100) 
                                            : 0}%` 
                                    }]} 
                                />
                            </View>
                            
                            <View style={styles.ratioLabels}>
                                <Text style={styles.ratioLeft}>Checked In: {data.operations.gatepasses.totalApproved}</Text>
                                <Text style={styles.ratioRight}>Total Created: {data.operations.gatepasses.totalCreated}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
            
            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

// Inline Subcomponents
function LegendRow({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <View style={styles.legendRow}>
            <View style={styles.legendLeft}>
                <View style={[styles.bullet, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
            </View>
            <View style={styles.legendRight}>
                <Text style={styles.legendCount}>{count} staff</Text>
                <Text style={styles.legendPercent}>{percent}%</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loaderText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginTop: 16 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 14 },

    // Header styling
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    headerTitleBox: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    headerSubtitle: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
    refreshBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },

    // Premium sliding tabs
    tabsContainer: { paddingHorizontal: 20, marginBottom: 15 },
    tabsWrapper: { flexDirection: 'row', borderRadius: 14, padding: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    activeTab: { backgroundColor: '#6366f1' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    activeTabText: { color: '#2D2445' },

    // Content container
    scrollContent: { paddingBottom: 120 },
    section: { paddingHorizontal: 20 },

    // Custom circular indicators and cards
    glassCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTitle: { fontSize: 14, fontWeight: '800', color: '#2D2445', marginBottom: 15 },
    circleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    
    progressCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 10, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    progressInnerCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
    circleValueText: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    circleLabelText: { fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2 },

    circleDetails: { flex: 1, marginLeft: 25, gap: 10 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    bullet: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    detailLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', flex: 1 },
    detailValue: { fontSize: 12, color: '#2D2445', fontWeight: '800' },
    detailDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 4 },

    // Metric cards grid
    gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    gridHalfCard: { width: '48%', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    gridCardValue: { fontSize: 22, fontWeight: '900', color: '#2D2445', marginTop: 10 },
    gridCardLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 },

    // Staff horizontal breakdown bar
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardHeaderSide: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
    segmentedBar: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', overflow: 'hidden', marginBottom: 20 },
    segment: { height: '100%' },

    // Staff legend rows
    legendGrid: { gap: 12 },
    legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    legendLeft: { flexDirection: 'row', alignItems: 'center' },
    legendText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    legendRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    legendCount: { fontSize: 12, color: '#2D2445', fontWeight: '700' },
    legendPercent: { fontSize: 11, color: '#64748b', fontWeight: '700' },

    // Outstanding Dues List Table
    emptyContainer: { alignItems: 'center', paddingVertical: 20 },
    emptyText: { fontSize: 12, color: '#10b981', fontWeight: '700' },
    pendingList: { gap: 14 },
    pendingItem: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', paddingBottom: 12 },
    pendingIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.1)', alignItems: 'center', justifyContent: 'center' },
    pendingInfo: { flex: 1, marginLeft: 12 },
    pendingUnit: { fontSize: 13, fontWeight: '800', color: '#2D2445' },
    pendingLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 2 },
    pendingAmount: { fontSize: 13, fontWeight: '900', color: '#ef4444' },

    // Gatepass Ratio fills
    progressFillBg: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginVertical: 12 },
    progressFillLine: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
    ratioLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    ratioLeft: { fontSize: 11, color: '#3b82f6', fontWeight: '700' },
    ratioRight: { fontSize: 11, color: '#94a3b8', fontWeight: '600' }
});
