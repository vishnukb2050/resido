import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, StatusBar, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { mySpaceApi, chatApi } from '../services/api';

export default function SelectGroupsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [groups, setGroups] = useState<any[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);
            const { data } = await chatApi.getConversations();
            // Filter for groups (conversations with names or many members)
            const groupList = data.filter((c: any) => c.isGroup || c.name);
            setGroups(groupList);
        } catch (error) {
            console.error('Failed to load groups', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = useCallback((id: string) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const handleShare = async () => {
        if (selected.length === 0) return;

        try {
            setSharing(true);
            const shareType = params.shareType as 'NOTE' | 'DOC';
            const itemId = params.itemId as string;
            const isFolder = params.isFolder === 'true';

            for (const targetId of selected) {
                await mySpaceApi.shareItem({
                    type: shareType,
                    itemId: itemId,
                    targetType: 'GROUP',
                    targetId: targetId,
                    isFolder: isFolder
                });
            }

            Alert.alert('Success', 'Shared with groups successfully');
            router.back();
        } catch (error) {
            console.error('Sharing failed', error);
            Alert.alert('Error', 'Sharing failed');
        } finally {
            setSharing(false);
        }
    };

    const filteredGroups = groups.filter(g => 
        g.name?.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = useCallback(({ item }: { item: any }) => (
        <GroupItem
            group={item}
            isSelected={selected.includes(item.id)}
            onPress={toggleSelect}
        />
    ), [selected, toggleSelect]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={sharing}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Group</Text>
            </View>

            {/* Search */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" />
                    <TextInput 
                        placeholder="Search groups" 
                        style={styles.searchInput}
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <FlatList
                data={filteredGroups}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                extraData={selected}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={11}
                ListEmptyComponent={loading
                    ? <ActivityIndicator color="#8b5cf6" style={{ marginTop: 20 }} />
                    : <Text style={styles.emptyText}>No groups found</Text>
                }
            />

            {/* Action Button */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    style={[styles.shareButton, selected.length === 0 && { opacity: 0.5 }]} 
                    onPress={handleShare}
                    disabled={selected.length === 0 || sharing}
                >
                    {sharing ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareButtonText}>Share with Group ({selected.length})</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const GroupItem = React.memo(({ group, isSelected, onPress }: any) => (
    <TouchableOpacity
        style={styles.groupItem}
        onPress={() => onPress(group.id)}
    >
        <View style={[styles.groupIconBox, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="people" size={22} color="#fff" />
        </View>
        <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{group.name || 'Unnamed Group'}</Text>
            <Text style={styles.groupSub}>{group.memberCount || group.members?.length || 0} Members</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
    </TouchableOpacity>
));

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445', marginLeft: 16 },
    
    searchSection: { padding: 20, paddingTop: 0 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', borderRadius: 16, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 10, color: '#2D2445', fontSize: 15 },

    groupItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    groupIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    groupInfo: { flex: 1, marginLeft: 16 },
    groupName: { fontSize: 16, fontWeight: '700', color: '#2D2445' },
    groupSub: { fontSize: 12, color: '#7A6B9C', marginTop: 4 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C4B5DC', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },

    emptyText: { textAlign: 'center', color: '#9A8EBA', marginTop: 40, fontSize: 15, fontWeight: '600' },
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, paddingBottom: 30, backgroundColor: '#F8F5FF' },
    shareButton: { backgroundColor: '#8b5cf6', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    shareButtonText: { color: '#2D2445', fontWeight: '900', fontSize: 16 }
});
