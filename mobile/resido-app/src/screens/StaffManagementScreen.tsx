import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { communityApi } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

const CATEGORIES = [
    {
        label: 'Security',
        role: 'SECURITY_STAFF',
        icon: 'shield-checkmark' as const,
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.25)',
    },
    {
        label: 'Maintenance',
        role: 'MAINTENANCE_STAFF',
        icon: 'construct' as const,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.25)',
    },
    {
        label: 'Cleaning',
        role: 'CLEANING_STAFF',
        icon: 'sparkles' as const,
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.25)',
    },
    {
        label: 'Caretaker',
        role: 'CARETAKER',
        icon: 'heart' as const,
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.12)',
        border: 'rgba(139, 92, 246, 0.25)',
    },
    {
        label: 'Accounts',
        role: 'ACCOUNTS_STAFF',
        icon: 'calculator' as const,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
    },
    {
        label: 'Admin Staff',
        role: 'ADMIN_STAFF',
        icon: 'people' as const,
        color: '#6366f1',
        bg: 'rgba(99, 102, 241, 0.12)',
        border: 'rgba(99, 102, 241, 0.25)',
    },
    {
        label: 'Other Staff',
        role: 'STAFF',
        icon: 'briefcase' as const,
        color: '#64748b',
        bg: 'rgba(100, 116, 139, 0.12)',
        border: 'rgba(100, 116, 139, 0.25)',
    },
];

const ALL_STAFF_ROLES = CATEGORIES.map(c => c.role);

type Category = typeof CATEGORIES[0];

export default function StaffManagementScreen() {
    const [allStaff, setAllStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            fetchStaff();
        }, [])
    );

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await communityApi.getMembers();
            setAllStaff(res.data.filter((m: any) => ALL_STAFF_ROLES.includes(m.role)));
        } catch (e) {
            console.error('Failed to fetch staff', e);
        } finally {
            setLoading(false);
        }
    };

    const getStaffInCategory = (role: string) =>
        allStaff.filter(s => s.role === role);

    // ─── Category Folders View ────────────────────────────────────────────────
    if (!selectedCategory) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Manage Staff</Text>
                        <Text style={styles.headerSub}>
                            {loading ? 'Loading…' : `${allStaff.length} total personnel`}
                        </Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#1d4ed8" />
                        <Text style={styles.loadingText}>Loading staff...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={CATEGORIES}
                        keyExtractor={item => item.role}
                        numColumns={2}
                        contentContainerStyle={styles.gridContent}
                        columnWrapperStyle={{ gap: 14 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const count = getStaffInCategory(item.role).length;
                            return (
                                <TouchableOpacity
                                    style={[
                                        styles.folderCard,
                                        { backgroundColor: item.bg, borderColor: item.border },
                                    ]}
                                    onPress={() => setSelectedCategory(item)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.folderIconBox, { backgroundColor: item.bg }]}>
                                        <Ionicons name={item.icon} size={32} color={item.color} />
                                    </View>
                                    <Text style={[styles.folderLabel, { color: '#fff' }]} numberOfLines={1}>
                                        {item.label}
                                    </Text>
                                    <View style={styles.folderCountRow}>
                                        <Text style={[styles.folderCount, { color: item.color }]}>{count}</Text>
                                        <Text style={styles.folderCountUnit}> staff</Text>
                                    </View>
                                    <View style={styles.folderArrow}>
                                        <Ionicons name="chevron-forward" size={14} color={item.color} />
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </SafeAreaView>
        );
    }

    // ─── Category Detail View ─────────────────────────────────────────────────
    const categoryStaff = getStaffInCategory(selectedCategory.role);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{selectedCategory.label}</Text>
                    <Text style={styles.headerSub}>
                        {categoryStaff.length} {categoryStaff.length === 1 ? 'member' : 'members'}
                    </Text>
                </View>
                {/* Add Staff Button */}
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: selectedCategory.color }]}
                    onPress={() =>
                        router.push(
                            `/add-staff?role=${selectedCategory.role}&category=${encodeURIComponent(selectedCategory.label)}`
                        )
                    }
                >
                    <Ionicons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Category header accent bar */}
            <View style={[styles.categoryAccent, { backgroundColor: selectedCategory.color }]} />

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={selectedCategory.color} />
                </View>
            ) : categoryStaff.length === 0 ? (
                /* Empty State */
                <View style={styles.emptyBox}>
                    <View style={[styles.emptyIconBox, { backgroundColor: selectedCategory.bg }]}>
                        <Ionicons name={selectedCategory.icon} size={48} color={selectedCategory.color} />
                    </View>
                    <Text style={styles.emptyTitle}>No {selectedCategory.label} Yet</Text>
                    <Text style={styles.emptyText}>
                        Tap the button below to add your first{' '}
                        {selectedCategory.label.toLowerCase()} member.
                    </Text>
                    <TouchableOpacity
                        style={[styles.emptyAddBtn, { backgroundColor: selectedCategory.color }]}
                        onPress={() =>
                            router.push(
                                `/add-staff?role=${selectedCategory.role}&category=${encodeURIComponent(selectedCategory.label)}`
                            )
                        }
                    >
                        <Ionicons name="person-add" size={18} color="#fff" />
                        <Text style={styles.emptyAddText}>Add {selectedCategory.label}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* Staff List */
                <FlatList
                    data={categoryStaff}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={styles.staffCard}>
                            {/* Avatar */}
                            <View style={[styles.avatarBox, { backgroundColor: selectedCategory.bg }]}>
                                {item.profilePhoto ? (
                                    <Image source={{ uri: item.profilePhoto }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={[styles.avatarInitial, { color: selectedCategory.color }]}>
                                        {(item.name || '?')[0].toUpperCase()}
                                    </Text>
                                )}
                            </View>

                            {/* Info */}
                            <View style={styles.staffInfo}>
                                <Text style={styles.staffName}>{item.name || 'Unknown'}</Text>
                                {item.jobRole ? (
                                    <Text style={styles.staffDesignation}>{item.jobRole}</Text>
                                ) : null}
                                {item.phone ? (
                                    <View style={styles.phoneRow}>
                                        <Ionicons name="call-outline" size={12} color="#64748b" />
                                        <Text style={styles.staffPhone}>{item.phone}</Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Status */}
                            <View style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: item.isActive
                                        ? 'rgba(16, 185, 129, 0.12)'
                                        : 'rgba(100, 116, 139, 0.12)'
                                }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: item.isActive ? '#10b981' : '#64748b' }
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    { color: item.isActive ? '#10b981' : '#64748b' }
                                ]}>
                                    {item.isActive ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },

    // ─── Header ──────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    addBtn: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    },
    categoryAccent: { height: 3, marginHorizontal: 20, borderRadius: 2, marginBottom: 4, opacity: 0.7 },

    // ─── Loading ─────────────────────────────────────────────────────────────
    loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loadingText: { color: '#64748b', fontSize: 14, fontWeight: '600' },

    // ─── Category Folder Grid ─────────────────────────────────────────────────
    gridContent: { padding: 20, gap: 14 },
    folderCard: {
        flex: 1,
        borderRadius: 22,
        borderWidth: 1,
        padding: 20,
        alignItems: 'center',
        minHeight: 158,
        justifyContent: 'center',
        gap: 6,
    },
    folderIconBox: {
        width: 64, height: 64, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    folderLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
    folderCountRow: { flexDirection: 'row', alignItems: 'baseline' },
    folderCount: { fontSize: 26, fontWeight: '900' },
    folderCountUnit: { fontSize: 12, color: '#64748b', fontWeight: '700' },
    folderArrow: {
        position: 'absolute', right: 14, top: 14,
        opacity: 0.7,
    },

    // ─── Staff List ───────────────────────────────────────────────────────────
    listContent: { padding: 20, gap: 12 },
    staffCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    avatarBox: {
        width: 52, height: 52, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarInitial: { fontSize: 22, fontWeight: '900' },
    staffInfo: { flex: 1, marginLeft: 14 },
    staffName: { fontSize: 16, fontWeight: '800', color: '#fff' },
    staffDesignation: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    staffPhone: { fontSize: 12, color: '#64748b' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '800' },

    // ─── Empty State ──────────────────────────────────────────────────────────
    emptyBox: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        padding: 40, gap: 14,
    },
    emptyIconBox: {
        width: 100, height: 100, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 6,
    },
    emptyTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    emptyText: {
        fontSize: 14, color: '#64748b', textAlign: 'center',
        lineHeight: 21, fontWeight: '500',
    },
    emptyAddBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18, marginTop: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    },
    emptyAddText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
