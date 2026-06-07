import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useFocusEffect } from '@react-navigation/native';
import { residentApi, authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function StaffDocumentsScreen() {
    const router = useRouter();
    const activeWorkspace = useAuthStore(state => state.activeWorkspace);
    const [loading, setLoading] = useState(true);
    const [staffGrouped, setStaffGrouped] = useState<Record<string, any[]>>({});
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    useFocusEffect(
        useCallback(() => {
            fetchStaff();
        }, [])
    );

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const { data } = await residentApi.getMembers({ role: 'STAFF_GROUP' });
            
            // Group staff by their specific role
            const groups: Record<string, any[]> = {};
            data.forEach((staff: any) => {
                const category = staff.role || 'OTHER_STAFF';
                if (!groups[category]) {
                    groups[category] = [];
                }
                groups[category].push(staff);
            });
            
            setStaffGrouped(groups);
        } catch (error) {
            console.error('Failed to fetch staff:', error);
            Alert.alert('Error', 'Could not load staff list');
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleViewDocument = (url: string) => {
        if (!url) {
            Alert.alert('No Document', 'This staff member does not have an ID proof uploaded.');
            return;
        }
        Linking.openURL(url);
    };

    const handleDelete = (staff: any) => {
        Alert.alert(
            'Remove Staff',
            `Are you sure you want to remove ${staff.name}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Remove', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await residentApi.deleteMember(staff.id);
                            
                            if (staff.phone && activeWorkspace?.tenantId && staff.role) {
                                try {
                                    await authApi.syncMembershipDeactivation({
                                        phone: staff.phone,
                                        tenantId: activeWorkspace.tenantId,
                                        role: staff.role
                                    });
                                    const res = await authApi.getWorkspaces();
                                    useAuthStore.getState().setWorkspaces(res.data);
                                } catch (syncError) {
                                    console.error('Failed to sync staff deactivation:', syncError);
                                }
                            }

                            fetchStaff();
                            Alert.alert('Success', 'Staff removed successfully');
                        } catch (error) {
                            console.error('Failed to delete staff:', error);
                            Alert.alert('Error', 'Could not remove staff');
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = (staff: any) => {
        // Quick edit for name and phone
        Alert.prompt(
            'Edit Staff Name',
            'Update the name for this staff member',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: async (newName) => {
                        if (!newName) return;
                        try {
                            await residentApi.updateMember(staff.id, { name: newName });
                            fetchStaff();
                        } catch (error) {
                            console.error('Failed to update staff:', error);
                            Alert.alert('Error', 'Could not update staff');
                        }
                    }
                }
            ],
            'plain-text',
            staff.name
        );
    };

    const formatCategoryName = (code: string) => {
        return code.replace(/_/g, ' ');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Documents</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1d4ed8" />
                </View>
            ) : (
                <SectionList
                    style={styles.content}
                    contentContainerStyle={styles.listContent}
                    sections={Object.keys(staffGrouped).map((category) => ({
                        category,
                        data: expandedCategories.includes(category) ? staffGrouped[category] : [],
                    }))}
                    keyExtractor={(item: any) => String(item.id)}
                    stickySectionHeadersEnabled={false}
                    removeClippedSubviews
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="folder-open-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyStateTitle}>No Staff Found</Text>
                            <Text style={styles.emptyStateSub}>Add staff members to automatically generate category folders.</Text>
                        </View>
                    }
                    renderSectionHeader={({ section }: any) => {
                        const category = section.category;
                        const isExpanded = expandedCategories.includes(category);
                        const staffList = staffGrouped[category] || [];
                        return (
                            <View style={[styles.folderSection, isExpanded ? styles.folderSectionExpanded : styles.folderSectionCollapsed]}>
                                <TouchableOpacity 
                                    style={styles.folderHeader}
                                    onPress={() => toggleCategory(category)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.folderHeaderLeft}>
                                        <Ionicons name={isExpanded ? "folder-open" : "folder"} size={28} color="#1d4ed8" />
                                        <View style={styles.folderTitleWrapper}>
                                            <Text style={styles.folderTitle}>{formatCategoryName(category)}</Text>
                                            <Text style={styles.folderSubtitle}>{staffList.length} member{staffList.length !== 1 ? 's' : ''}</Text>
                                        </View>
                                    </View>
                                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                    renderItem={({ item: staff, index }: any) => (
                        <View style={[styles.folderContentWrap, index === 0 && styles.folderContentWrapFirst]}>
                            <View style={styles.staffCard}>
                                <View style={styles.staffCardHeader}>
                                    {staff.profilePhoto ? (
                                        <Image source={{ uri: staff.profilePhoto }} style={styles.avatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarInitial}>{staff.name.charAt(0)}</Text>
                                        </View>
                                    )}
                                    <View style={styles.staffInfo}>
                                        <Text style={styles.staffName}>{staff.name}</Text>
                                        <Text style={styles.staffPhone}>{staff.phone}</Text>
                                    </View>
                                </View>

                                <View style={styles.staffCardActions}>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, !staff.docUrl && styles.actionBtnDisabled]}
                                        onPress={() => handleViewDocument(staff.docUrl)}
                                        disabled={!staff.docUrl}
                                    >
                                        <Ionicons name="document-text" size={16} color={staff.docUrl ? "#1d4ed8" : "#94a3b8"} />
                                        <Text style={[styles.actionBtnText, !staff.docUrl && styles.actionBtnTextDisabled]}>
                                            {staff.docUrl ? 'View ID' : 'No ID'}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    <View style={styles.adminActions}>
                                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(staff)}>
                                            <Ionicons name="pencil" size={18} color="#64748b" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(staff)}>
                                            <Ionicons name="trash" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                    renderSectionFooter={({ section }: any) => {
                        const isExpanded = expandedCategories.includes(section.category);
                        if (!isExpanded) return null;
                        return <View style={styles.folderContentFooter} />;
                    }}
                />
            )}

            <TouchableOpacity 
                style={styles.fab} 
                onPress={() => router.push('/create-member?mode=STAFF')}
            >
                <Ionicons name="person-add" size={24} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    
    content: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 100 },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#475569', marginTop: 16 },
    emptyStateSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },

    folderContainer: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    // SectionList card-continuation styling for category folders
    folderSection: { backgroundColor: '#fff', borderColor: '#e2e8f0', overflow: 'hidden' },
    folderSectionCollapsed: { borderRadius: 16, borderWidth: 1, marginBottom: 16, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    folderSectionExpanded: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: 1 },
    folderContentWrap: { backgroundColor: '#fcfcfd', paddingHorizontal: 16, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e2e8f0' },
    folderContentWrapFirst: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
    folderContentFooter: { backgroundColor: '#fcfcfd', paddingBottom: 4, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
    folderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff' },
    folderHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    folderTitleWrapper: { marginLeft: 16 },
    folderTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', textTransform: 'capitalize' },
    folderSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },

    folderContent: { padding: 16, backgroundColor: '#fcfcfd', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    
    staffCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    staffCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9' },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: '#1d4ed8' },
    staffInfo: { marginLeft: 12, flex: 1 },
    staffName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    staffPhone: { fontSize: 13, color: '#64748b', marginTop: 2 },

    staffCardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionBtnDisabled: { backgroundColor: '#f1f5f9' },
    actionBtnText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
    actionBtnTextDisabled: { color: '#94a3b8' },
    
    adminActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { padding: 4 },

    fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }
});
