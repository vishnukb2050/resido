import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SecurityDashboard() {
    const { activeWorkspace, user } = useAuthStore();
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfd' }}>
            {/* Custom Header */}
            <View style={styles.topHeader}>
                <TouchableOpacity>
                    <Ionicons name="menu-outline" size={28} color="#1e293b" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.headerTitle}>Security Staff</Text>
                    <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.notifBtn}>
                        <Ionicons name="notifications-outline" size={24} color="#1e293b" />
                        <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
                    </TouchableOpacity>
                    <Image 
                        source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/150?u=security' }} 
                        style={styles.avatar} 
                    />
                </View>
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Community Selector Card */}
                <TouchableOpacity style={styles.communityCard}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.wsRow}>
                            <Text style={styles.wsName}>{activeWorkspace?.tenantName || 'Green Valley Residency'}</Text>
                            <Ionicons name="chevron-down" size={18} color="#fff" />
                        </View>
                        <View style={styles.gateRow}>
                            <View style={styles.gateIconBox}>
                                <Ionicons name="business" size={14} color="#fff" />
                            </View>
                            <Text style={styles.gateText}>Gate 1</Text>
                        </View>
                    </View>
                    <View style={styles.commImgBox}>
                        <Image source={require('../../../assets/icon.png')} style={styles.commImg} />
                    </View>
                </TouchableOpacity>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.grid}>
                    <ActionItem icon="qr-code-outline" label="Scan QR" color="#8b5cf6" bg="#f5f3ff" />
                    <ActionItem icon="person-add-outline" label="Visitor Entry" sub="Pre-approved" color="#10b981" bg="#f0fdf4" />
                    <ActionItem icon="bicycle-outline" label="Delivery Entry" color="#f59e0b" bg="#fff7ed" />
                    <ActionItem icon="car-outline" label="Cab Entry" color="#3b82f6" bg="#eff6ff" />
                    <ActionItem icon="create-outline" label="Manual Entry" color="#6366f1" bg="#f5f3ff" />
                    <ActionItem icon="list-outline" label="Today's Entries" color="#10b981" bg="#f0fdf4" onPress={() => router.push('/entries')} />
                </View>

                {/* Today's Summary */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Summary</Text>
                    <TouchableOpacity><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
                    <SummaryCard label="Visitors" count="28" color="#3b82f6" icon="people" />
                    <SummaryCard label="Deliveries" count="16" color="#f59e0b" icon="bicycle" />
                    <SummaryCard label="Cabs" count="12" color="#3b82f6" icon="car" />
                </ScrollView>

                {/* Recent Entries */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Entries</Text>
                    <TouchableOpacity><Text style={styles.viewAll}>View all</Text></TouchableOpacity>
                </View>
                <View style={styles.recentList}>
                    <EntryItem 
                        name="Rahul Sharma" 
                        sub="Flat A-203 • Visitor" 
                        time="10:30 AM" 
                        status="IN" 
                        photo="https://i.pravatar.cc/100?u=1" 
                    />
                    <EntryItem 
                        name="Swiggy Delivery" 
                        sub="KL07CS1234 - Delivery" 
                        time="10:22 AM" 
                        status="IN" 
                        icon="bicycle" 
                    />
                    <EntryItem 
                        name="Uber - White Swift" 
                        sub="KL07CP4567 - Cab" 
                        time="10:15 AM" 
                        status="IN" 
                        icon="car" 
                    />
                </View>

                <TouchableOpacity style={styles.viewAllBtn}>
                    <Text style={styles.viewAllBtnText}>View All Entries</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <NavItem icon="home" label="Home" active />
                <NavItem icon="log-in-outline" label="Entries" />
                <NavItem icon="people-outline" label="Residents" />
                <NavItem icon="document-text-outline" label="Logs" />
                <NavItem icon="ellipsis-horizontal" label="More" />
            </View>
        </SafeAreaView>
    );
}

function ActionItem({ icon, label, sub, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.actionItem} onPress={onPress}>
            <View style={[styles.actionIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
            {sub && <Text style={styles.actionSub}>{sub}</Text>}
        </TouchableOpacity>
    );
}

function SummaryCard({ label, count, color, icon }: any) {
    return (
        <View style={styles.summaryCard}>
            <View>
                <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
                <Text style={styles.summaryCount}>{count}</Text>
                <Text style={styles.summarySub}>Entries</Text>
            </View>
            <View style={[styles.summaryIconBox, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
        </View>
    );
}

function EntryItem({ name, sub, time, status, photo, icon }: any) {
    return (
        <View style={styles.entryItem}>
            <View style={styles.entryAvatar}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.entryAvatarImg} />
                ) : (
                    <View style={styles.entryIconBox}>
                        <Ionicons name={icon} size={20} color="#64748b" />
                    </View>
                )}
            </View>
            <View style={styles.entryContent}>
                <Text style={styles.entryName}>{name}</Text>
                <Text style={styles.entrySub}>{sub}</Text>
            </View>
            <View style={styles.entryRight}>
                <View style={styles.inBadge}><Text style={styles.inBadgeText}>{status}</Text></View>
                <Text style={styles.entryTime}>{time}</Text>
            </View>
        </View>
    );
}

function NavItem({ icon, label, active }: any) {
    return (
        <TouchableOpacity style={styles.navItem}>
            <Ionicons name={icon} size={22} color={active ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 110 },
    
    topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
    onlineText: { fontSize: 11, color: '#10b981', fontWeight: '700' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    notifBtn: { position: 'relative' },
    badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    badgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
    avatar: { width: 36, height: 36, borderRadius: 18 },

    communityCard: { backgroundColor: '#6366f1', borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    wsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    wsName: { fontSize: 18, fontWeight: '800', color: '#fff' },
    gateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    gateIconBox: { width: 24, height: 24, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    gateText: { fontSize: 13, color: '#fff', fontWeight: '600' },
    commImgBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    commImg: { width: 40, height: 40 },

    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
    actionItem: { width: '31.5%', backgroundColor: '#fff', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    actionIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    actionLabel: { fontSize: 12, fontWeight: '800', color: '#1e293b', textAlign: 'center' },
    actionSub: { fontSize: 8, color: '#94a3b8', textAlign: 'center', marginTop: 2, fontWeight: '600' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    viewAll: { fontSize: 12, color: '#6366f1', fontWeight: '800' },

    summaryScroll: { marginBottom: 25 },
    summaryCard: { width: 140, backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', marginRight: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    summaryLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
    summaryCount: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    summarySub: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
    summaryIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    recentList: { gap: 12, marginBottom: 20 },
    entryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    entryAvatar: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
    entryAvatarImg: { width: '100%', height: '100%' },
    entryIconBox: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    entryContent: { flex: 1, marginLeft: 12 },
    entryName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    entrySub: { fontSize: 11, color: '#64748b', marginTop: 2 },
    entryRight: { alignItems: 'flex-end', gap: 6 },
    inBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    inBadgeText: { fontSize: 9, color: '#10b981', fontWeight: '900' },
    entryTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

    viewAllBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', marginBottom: 20 },
    viewAllBtnText: { fontSize: 14, fontWeight: '800', color: '#6366f1' },

    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 85, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 20 },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    navLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: '700' },
    navLabelActive: { color: '#6366f1' },
});
