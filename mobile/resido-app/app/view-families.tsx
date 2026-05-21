import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { communityApi, residentApi, authApi } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

export default function ViewFamiliesScreen() {
    const router = useRouter();
    const activeWorkspace = useAuthStore(state => state.activeWorkspace);
    const [loadingBlocks, setLoadingBlocks] = useState(true);
    const [blocks, setBlocks] = useState<any[]>([]);
    
    // Maps blockId -> units list
    const [unitsCache, setUnitsCache] = useState<{ [key: string]: any[] }>({});
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
    const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
    const [loadingUnits, setLoadingUnits] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            setLoadingBlocks(true);
            const { data } = await communityApi.getBlocks();
            setBlocks(data || []);
        } catch (error) {
            console.error('Failed to fetch blocks:', error);
        } finally {
            setLoadingBlocks(false);
        }
    };

    const toggleBlock = async (blockId: string) => {
        if (expandedBlockId === blockId) {
            setExpandedBlockId(null);
            setExpandedUnitId(null);
            return;
        }
        
        setExpandedBlockId(blockId);
        setExpandedUnitId(null); // Reset unit expansion when changing blocks

        // Fetch units if not cached
        if (!unitsCache[blockId]) {
            try {
                setLoadingUnits(prev => ({ ...prev, [blockId]: true }));
                const { data } = await communityApi.getUnits(blockId);
                setUnitsCache(prev => ({ ...prev, [blockId]: data || [] }));
            } catch (error) {
                console.error('Failed to fetch units:', error);
            } finally {
                setLoadingUnits(prev => ({ ...prev, [blockId]: false }));
            }
        }
    };

    const toggleUnit = (unitId: string) => {
        if (expandedUnitId === unitId) {
            setExpandedUnitId(null);
        } else {
            setExpandedUnitId(unitId);
        }
    };

    const handleEditBlock = (block: any) => {
        Alert.prompt("Edit Block", "Enter new block name:", [
            { text: "Cancel", style: "cancel" },
            { text: "Save", onPress: async (newName) => {
                if (!newName?.trim()) return;
                try { await communityApi.updateBlock(block.id, { name: newName }); fetchBlocks(); } 
                catch (error) { Alert.alert("Error", "Failed to update block."); }
            }}
        ], "plain-text", block.name);
    };

    const handleDeleteBlock = (block: any) => {
        Alert.alert("Delete Block", `Delete ${block.name}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                try { await communityApi.deleteBlock(block.id); fetchBlocks(); } 
                catch (error: any) { Alert.alert("Error", error?.response?.data?.message || "Failed to delete block."); }
            }}
        ]);
    };

    const handleEditUnit = (unit: any, blockId: string) => {
        Alert.prompt("Edit Unit", "Enter new unit number:", [
            { text: "Cancel", style: "cancel" },
            { text: "Save", onPress: async (newNum) => {
                if (!newNum?.trim()) return;
                try { 
                    await communityApi.updateUnit(unit.id, { number: newNum }); 
                    const { data } = await communityApi.getUnits(blockId);
                    setUnitsCache(prev => ({ ...prev, [blockId]: data || [] }));
                } catch (error) { Alert.alert("Error", "Failed to update unit."); }
            }}
        ], "plain-text", unit.number);
    };

    const handleDeleteUnit = (unit: any, blockId: string) => {
        Alert.alert("Delete Unit", `Delete Unit ${unit.number}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                try { 
                    await communityApi.deleteUnit(unit.id); 
                    const { data } = await communityApi.getUnits(blockId);
                    setUnitsCache(prev => ({ ...prev, [blockId]: data || [] }));
                } catch (error: any) { Alert.alert("Error", error?.response?.data?.message || "Failed to delete unit."); }
            }}
        ]);
    };

    const handleEditMember = (member: any, blockId: string) => {
        Alert.prompt("Edit Resident", "Enter new name:", [
            { text: "Cancel", style: "cancel" },
            { text: "Save", onPress: async (newName) => {
                if (!newName?.trim()) return;
                try { 
                    await residentApi.updateMember(member.id, { name: newName }); 
                    const { data } = await communityApi.getUnits(blockId);
                    setUnitsCache(prev => ({ ...prev, [blockId]: data || [] }));
                } catch (error) { Alert.alert("Error", "Failed to update resident."); }
            }}
        ], "plain-text", member.name);
    };

    const handleDeleteMember = (member: any, blockId: string) => {
        Alert.alert("Remove Resident", `Remove ${member.name}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: async () => {
                try { 
                    await residentApi.deleteMember(member.id); 

                    if (member.phone && activeWorkspace?.tenantId && member.role) {
                        try {
                            await authApi.syncMembershipDeactivation({
                                phone: member.phone,
                                tenantId: activeWorkspace.tenantId,
                                role: member.role
                            });
                            const res = await authApi.getWorkspaces();
                            useAuthStore.getState().setWorkspaces(res.data);
                        } catch (syncError) {
                            console.error('Failed to sync resident deactivation:', syncError);
                        }
                    }

                    const { data } = await communityApi.getUnits(blockId);
                    setUnitsCache(prev => ({ ...prev, [blockId]: data || [] }));
                } catch (error: any) { Alert.alert("Error", "Failed to remove resident."); }
            }}
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Families</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.subtitle}>Browse blocks, units, and resident details.</Text>

                {loadingBlocks ? (
                    <ActivityIndicator size="large" color="#4c1d95" style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.blocksList}>
                        {blocks.map(block => {
                            const isBlockExpanded = expandedBlockId === block.id;
                            const isUnitsLoading = loadingUnits[block.id];
                            const blockUnits = unitsCache[block.id] || [];

                            return (
                                <View key={block.id} style={styles.blockContainer}>
                                    <TouchableOpacity 
                                        style={[styles.blockHeader, isBlockExpanded && styles.blockHeaderActive]}
                                        onPress={() => toggleBlock(block.id)}
                                    >
                                        <View style={styles.blockIconBox}>
                                            <Ionicons name="business" size={20} color={isBlockExpanded ? '#fff' : '#4c1d95'} />
                                        </View>
                                        <View style={styles.blockInfo}>
                                            <Text style={[styles.blockTitle, isBlockExpanded && styles.blockTitleActive]}>{block.name}</Text>
                                            <Text style={[styles.blockSub, isBlockExpanded && styles.blockSubActive]}>{block._count?.units || 0} Units</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleEditBlock(block)} style={{ padding: 8 }}>
                                            <Ionicons name="pencil" size={18} color={isBlockExpanded ? '#e2e8f0' : '#64748b'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteBlock(block)} style={{ padding: 8 }}>
                                            <Ionicons name="trash" size={18} color={isBlockExpanded ? '#fca5a5' : '#ef4444'} />
                                        </TouchableOpacity>
                                        <Ionicons name={isBlockExpanded ? "chevron-up" : "chevron-down"} size={20} color={isBlockExpanded ? '#fff' : '#94a3b8'} style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>

                                    {isBlockExpanded && (
                                        <View style={styles.unitsContainer}>
                                            {isUnitsLoading ? (
                                                <ActivityIndicator size="small" color="#4c1d95" style={{ marginVertical: 15 }} />
                                            ) : blockUnits.length === 0 ? (
                                                <Text style={styles.emptyText}>No units found in this block.</Text>
                                            ) : (
                                                blockUnits.map(unit => {
                                                    const isUnitExpanded = expandedUnitId === unit.id;
                                                    
                                                    // Aggregate all members from all families in this unit
                                                    const allMembers = unit.families?.flatMap((f: any) => f.members || []) || [];

                                                    return (
                                                        <View key={unit.id} style={styles.unitContainer}>
                                                            <TouchableOpacity 
                                                                style={[styles.unitHeader, isUnitExpanded && styles.unitHeaderActive]}
                                                                onPress={() => toggleUnit(unit.id)}
                                                            >
                                                                <View style={styles.unitInfoRow}>
                                                                    <Ionicons name="home" size={16} color="#4c1d95" style={{ marginRight: 8 }} />
                                                                    <Text style={styles.unitTitle}>Unit {unit.number}</Text>
                                                                </View>
                                                                <View style={styles.unitInfoRow}>
                                                                    <Text style={styles.unitSub}>{allMembers.length} Members</Text>
                                                                    <TouchableOpacity onPress={() => handleEditUnit(unit, block.id)} style={{ padding: 6, marginLeft: 8 }}>
                                                                        <Ionicons name="pencil" size={16} color="#64748b" />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity onPress={() => handleDeleteUnit(unit, block.id)} style={{ padding: 6 }}>
                                                                        <Ionicons name="trash" size={16} color="#ef4444" />
                                                                    </TouchableOpacity>
                                                                    <Ionicons name={isUnitExpanded ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" style={{ marginLeft: 8 }} />
                                                                </View>
                                                            </TouchableOpacity>

                                                            {isUnitExpanded && (
                                                                <View style={styles.membersContainer}>
                                                                    {allMembers.length === 0 ? (
                                                                        <Text style={styles.emptyText}>No residents registered here.</Text>
                                                                    ) : (
                                                                        allMembers.map((member: any) => (
                                                                            <View key={member.id} style={styles.memberCard}>
                                                                                <View style={styles.memberAvatar}>
                                                                                    <Text style={styles.memberAvatarText}>{member.name.substring(0, 1).toUpperCase()}</Text>
                                                                                </View>
                                                                                <View style={styles.memberInfo}>
                                                                                    <Text style={styles.memberName}>{member.name}</Text>
                                                                                    <Text style={styles.memberPhone}>{member.phone}</Text>
                                                                                </View>
                                                                                <View style={styles.memberRoleBadge}>
                                                                                    <Text style={styles.memberRoleText}>{member.role}</Text>
                                                                                </View>
                                                                                <TouchableOpacity onPress={() => handleEditMember(member, block.id)} style={{ padding: 8, marginLeft: 8 }}>
                                                                                    <Ionicons name="pencil" size={16} color="#64748b" />
                                                                                </TouchableOpacity>
                                                                                <TouchableOpacity onPress={() => handleDeleteMember(member, block.id)} style={{ padding: 8 }}>
                                                                                    <Ionicons name="trash" size={16} color="#ef4444" />
                                                                                </TouchableOpacity>
                                                                            </View>
                                                                        ))
                                                                    )}
                                                                </View>
                                                            )}
                                                        </View>
                                                    );
                                                })
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {blocks.length === 0 && (
                            <View style={styles.emptyState}>
                                <Ionicons name="folder-open-outline" size={48} color="#e2e8f0" />
                                <Text style={styles.emptyText}>No blocks available.</Text>
                            </View>
                        )}
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, padding: 20 },
    subtitle: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 25 },
    
    blocksList: { gap: 12 },
    
    blockContainer: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    blockHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
    blockHeaderActive: { backgroundColor: '#4c1d95' },
    blockIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3e8ff', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    blockInfo: { flex: 1 },
    blockTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    blockTitleActive: { color: '#fff' },
    blockSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    blockSubActive: { color: '#e2e8f0' },
    
    unitsContainer: { backgroundColor: '#f8fafc', padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    unitContainer: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    unitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
    unitHeaderActive: { backgroundColor: '#f1f5f9' },
    unitInfoRow: { flexDirection: 'row', alignItems: 'center' },
    unitTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    unitSub: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    
    membersContainer: { padding: 12, paddingTop: 4, backgroundColor: '#f1f5f9' },
    memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    memberAvatarText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    memberPhone: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },
    memberRoleBadge: { backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    memberRoleText: { color: '#4c1d95', fontSize: 10, fontWeight: '800' },
    
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 10 }
});
