import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CleaningDashboard() {
    const { activeWorkspace, user } = useAuthStore();
    const router = useRouter();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfd' }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header Row */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <View style={styles.logoCircle}>
                            <Image source={require('../../../assets/icon.png')} style={styles.logoMini} />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.residoBrand}>Resido</Text>
                            <Text style={styles.welcomeText}>Welcome, {user?.name || 'Anil'}</Text>
                            <Text style={styles.roleSubtext}>Cleaning Staff</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.headerIconBtn}>
                        <Ionicons name="notifications-outline" size={24} color="#1e293b" />
                    </TouchableOpacity>
                </View>

                {/* My Community Selector Card */}
                <View style={styles.communityCard}>
                    <View style={styles.commCardHeader}>
                        <View>
                            <Text style={styles.commCardTitle}>My Community</Text>
                            <Text style={styles.commCardSub}>Select a community to see your tasks & updates</Text>
                        </View>
                        <Image source={require('../../../assets/icon.png')} style={styles.commBuildingImg} />
                    </View>
                    
                    <TouchableOpacity style={styles.wsSelector}>
                        <Text style={styles.wsName}>{activeWorkspace?.tenantName || 'Green Meadows'}</Text>
                        <Ionicons name="chevron-down" size={20} color="#1e293b" />
                    </TouchableOpacity>

                    <View style={styles.roleBadgeContainer}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text style={styles.roleBadgeText}>You are a Cleaning Staff</Text>
                    </View>
                </View>

                {/* Community Workplace Section */}
                <TouchableOpacity style={styles.workplaceSection}>
                    <View style={styles.workplaceHeader}>
                        <View style={styles.workplaceIconBox}>
                            <Ionicons name="business" size={24} color="#6366f1" />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.workplaceName}>{activeWorkspace?.tenantName || 'Green Meadows'}</Text>
                            <Text style={styles.workplaceLabel}>Community Workplace</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#64748b" />
                    </View>

                    <View style={styles.taskGrid}>
                        <TouchableOpacity style={styles.taskItem}>
                            <View style={[styles.taskIconBox, { backgroundColor: '#f5f3ff' }]}>
                                <Ionicons name="clipboard-outline" size={24} color="#6366f1" />
                            </View>
                            <Text style={styles.taskItemTitle}>Update Cleaning Register</Text>
                            <Text style={styles.taskItemSub}>Mark daily cleaning tasks & status</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.taskItem}>
                            <View style={[styles.taskIconBox, { backgroundColor: '#f0fdf4' }]}>
                                <Ionicons name="images-outline" size={24} color="#10b981" />
                            </View>
                            <Text style={styles.taskItemTitle}>Update Photos</Text>
                            <Text style={styles.taskItemSub}>Upload cleaning photos</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.taskItem}>
                            <View style={[styles.taskIconBox, { backgroundColor: '#fff7ed' }]}>
                                <Ionicons name="warning-outline" size={24} color="#f59e0b" />
                            </View>
                            <Text style={styles.taskItemTitle}>Raise Complaint</Text>
                            <Text style={styles.taskItemSub}>Report issues & request support</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* Restricted Banner */}
                <View style={styles.restrictedBanner}>
                    <View style={styles.lockIconBox}>
                        <Ionicons name="lock-closed" size={18} color="#6366f1" />
                    </View>
                    <Text style={styles.restrictedText}>
                        Other community features like Announcements, Community Chat, Noticeboard, Gallery, etc. are restricted for Cleaning Staff.
                    </Text>
                </View>

                {/* Quick Access */}
                <Text style={styles.sectionTitle}>Quick Access</Text>
                <View style={styles.quickAccessGrid}>
                    <QuickAccessItem icon="chatbubbles-outline" label="Global Chat" sub="Connect with residents" color="#6366f1" />
                    <QuickAccessItem icon="calendar-outline" label="Calendar" sub="Stay updated on events" color="#ef4444" />
                    <QuickAccessItem icon="construct-outline" label="Services" sub="Raise requests & get help" color="#3b82f6" />
                    <QuickAccessItem icon="person-outline" label="Contacts" sub="Directory of community members" color="#2563eb" />
                </View>

                {/* All Features */}
                <Text style={styles.sectionTitle}>All Features</Text>
                <View style={styles.featuresList}>
                    <FeatureItem icon="print-outline" label="Scanner" sub="Scan documents on the go" color="#64748b" />
                    <FeatureItem icon="folder-open-outline" label="Documents" sub="Access important documents" color="#f59e0b" />
                    <FeatureItem icon="create-outline" label="Notes" sub="Keep your notes handy" color="#3b82f6" />
                    <FeatureItem icon="settings-outline" label="Settings" sub="Manage your preferences" color="#8b5cf6" />
                </View>
            </ScrollView>

            {/* Bottom Nav */}
            <View style={styles.bottomNav}>
                <NavItem icon="home" label="Home" active />
                <NavItem icon="chatbubble-ellipses-outline" label="Chat" />
                <NavItem icon="people-outline" label="Contacts" />
                <NavItem icon="newspaper-outline" label="Blog" />
                <NavItem icon="person-outline" label="Account" />
            </View>
        </SafeAreaView>
    );
}

function QuickAccessItem({ icon, label, sub, color }: any) {
    return (
        <TouchableOpacity style={styles.qaItem}>
            <View style={styles.qaIconContainer}>
                <Ionicons name={icon} size={28} color={color} />
            </View>
            <Text style={styles.qaLabel}>{label}</Text>
            <Text style={styles.qaSub}>{sub}</Text>
        </TouchableOpacity>
    );
}

function FeatureItem({ icon, label, sub, color }: any) {
    return (
        <TouchableOpacity style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: `${color}10` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.featureLabel}>{label}</Text>
                <Text style={styles.featureSub}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

function NavItem({ icon, label, active }: any) {
    return (
        <TouchableOpacity style={styles.navItem}>
            <Ionicons name={icon} size={24} color={active ? '#6366f1' : '#94a3b8'} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 120 },
    
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    logoCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
    logoMini: { width: 28, height: 28 },
    residoBrand: { fontSize: 28, fontWeight: '900', color: '#6366f1' },
    welcomeText: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginTop: 2 },
    roleSubtext: { fontSize: 13, color: '#64748b' },
    headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },

    communityCard: { backgroundColor: '#f5f3ff', borderRadius: 24, padding: 20, marginBottom: 30 },
    commCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    commCardTitle: { fontSize: 18, fontWeight: '800', color: '#4338ca' },
    commCardSub: { fontSize: 12, color: '#6366f1', width: '70%', marginTop: 4 },
    commBuildingImg: { width: 50, height: 50 },
    wsSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 15 },
    wsName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    roleBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    roleBadgeText: { fontSize: 11, color: '#10b981', fontWeight: '800' },

    workplaceSection: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
    workplaceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    workplaceIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    workplaceName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    workplaceLabel: { fontSize: 12, color: '#6366f1', fontWeight: '700' },
    taskGrid: { gap: 12 },
    taskItem: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, backgroundColor: '#fcfcfd', padding: 12, borderRadius: 16 },
    taskIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    taskItemTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', flex: 1 },
    taskItemSub: { fontSize: 11, color: '#64748b', width: '100%', marginLeft: 56, marginTop: -15 },

    restrictedBanner: { backgroundColor: '#f5f3ff', padding: 16, borderRadius: 16, flexDirection: 'row', gap: 12, marginBottom: 30 },
    lockIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    restrictedText: { flex: 1, fontSize: 11, color: '#4338ca', fontWeight: '600', lineHeight: 16 },

    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
    quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
    qaItem: { width: '48.5%', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    qaIconContainer: { marginBottom: 12 },
    qaLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    qaSub: { fontSize: 9, color: '#64748b', textAlign: 'center', fontWeight: '500' },

    featuresList: { gap: 12 },
    featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    featureIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    featureLabel: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    featureSub: { fontSize: 11, color: '#64748b', marginTop: 2 },

    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 25, borderTopWidth: 1, borderTopColor: '#f1f5f9', borderTopLeftRadius: 35, borderTopRightRadius: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 15, elevation: 20 },
    navItem: { alignItems: 'center', justifyContent: 'center' },
    navLabel: { fontSize: 11, color: '#94a3b8', marginTop: 6, fontWeight: '700' },
    navLabelActive: { color: '#6366f1' },
});
