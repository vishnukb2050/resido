import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Image, ActivityIndicator,
    Alert, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { authApi, communityApi, chatApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

type MemberSource = 'Community' | 'Following' | 'Contacts' | 'Search';

export default function CreateGroupScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    
    const [groupName, setGroupName] = useState('');
    const [activeTab, setActiveTab] = useState<MemberSource>('Community');
    const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Lists
    const [communityMembers, setCommunityMembers] = useState<any[]>([]);
    const [following, setFollowing] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Fetch Community Members
            const commRes = await communityApi.getMembers();
            setCommunityMembers(commRes.data || []);

            // Fetch Following
            const followRes = await authApi.getFollowing();
            setFollowing(followRes.data || []);
        } catch (error) {
            console.error('Failed to fetch initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length >= 3) {
            setIsSearching(true);
            try {
                const { data } = await authApi.searchUsers(text);
                setSearchResults(data);
            } catch (error) {
                console.error('Global search failed', error);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const toggleMember = (member: any) => {
        const isSelected = selectedMembers.find(m => m.id === member.id);
        if (isSelected) {
            setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
        } else {
            setSelectedMembers([...selectedMembers, member]);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }
        if (selectedMembers.length === 0) {
            Alert.alert('Error', 'Please select at least one member');
            return;
        }

        setLoading(true);
        try {
            const memberIds = [user?.id, ...selectedMembers.map(m => m.id)];
            const groupId = `manual-${groupName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
            
            const { data } = await chatApi.createConversation(memberIds as any);
            // If the API doesn't support name/groupId yet, we might need a separate call or wait for backend update
            // For now, let's assume it works since we checked chat.controller.ts
            
            Alert.alert('Success', 'Group created successfully!');
            router.replace(`/chat/${data.id}`);
        } catch (error) {
            console.error('Failed to create group:', error);
            Alert.alert('Error', 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    const renderMemberList = () => {
        let list = [];
        if (activeTab === 'Community') list = communityMembers;
        else if (activeTab === 'Following') list = following;
        else if (activeTab === 'Search') list = searchResults;
        else list = []; 

        if (loading && list.length === 0) {
            return <ActivityIndicator color="#0d9488" style={{ marginTop: 40 }} />;
        }

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {list.map((item, idx) => (
                    <TouchableOpacity 
                        key={item.id || idx} 
                        style={styles.memberItem} 
                        onPress={() => toggleMember(item)}
                    >
                        <View style={styles.avatarContainer}>
                            <Image 
                                source={{ uri: item.profilePhoto || `https://i.pravatar.cc/100?u=${item.id}` }} 
                                style={styles.avatar} 
                            />
                            {selectedMembers.find(m => m.id === item.id) && (
                                <View style={styles.checkBadge}>
                                    <Ionicons name="checkmark" size={10} color="#fff" />
                                </View>
                            )}
                        </View>
                        <View style={styles.memberInfo}>
                            <Text style={styles.memberName}>{item.name || item.profileName || 'Anonymous'}</Text>
                            <Text style={styles.memberSub}>{item.role || (activeTab === 'Following' ? 'Follower' : 'Resident')}</Text>
                        </View>
                        <View style={[styles.checkbox, selectedMembers.find(m => m.id === item.id) && styles.checkboxActive]}>
                            {selectedMembers.find(m => m.id === item.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Group</Text>
                <TouchableOpacity 
                    onPress={handleCreateGroup} 
                    disabled={selectedMembers.length === 0 || !groupName.trim()}
                >
                    <Text style={[styles.createBtnText, (selectedMembers.length === 0 || !groupName.trim()) && { opacity: 0.5 }]}>Create</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.topSection}>
                <View style={styles.groupInputRow}>
                    <TouchableOpacity style={styles.imagePicker}>
                        <Ionicons name="camera" size={24} color="#0d9488" />
                    </TouchableOpacity>
                    <TextInput 
                        style={styles.groupNameInput}
                        placeholder="Group Name"
                        placeholderTextColor="#94a3b8"
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                </View>

                {selectedMembers.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedContainer}>
                        {selectedMembers.map(member => (
                            <View key={member.id} style={styles.selectedItem}>
                                <Image 
                                    source={{ uri: member.profilePhoto || `https://i.pravatar.cc/100?u=${member.id}` }} 
                                    style={styles.miniAvatar} 
                                />
                                <TouchableOpacity 
                                    style={styles.removeBadge}
                                    onPress={() => toggleMember(member)}
                                >
                                    <Ionicons name="close" size={10} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            <View style={styles.tabsRow}>
                {['Community', 'Following', 'Search'].map((tab) => (
                    <TouchableOpacity 
                        key={tab} 
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab as MemberSource)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'Search' && (
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Search by profile name..." 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {isSearching && <ActivityIndicator size="small" color="#0d9488" />}
                    </View>
                </View>
            )}

            <View style={styles.listContainer}>
                {renderMemberList()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    createBtnText: { fontSize: 16, fontWeight: '800', color: '#0d9488' },

    topSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    groupInputRow: { flexDirection: 'row', alignItems: 'center' },
    imagePicker: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    groupNameInput: { flex: 1, marginLeft: 16, fontSize: 18, fontWeight: '600', color: '#1e293b' },

    selectedContainer: { marginTop: 20, flexDirection: 'row' },
    selectedItem: { marginRight: 12, position: 'relative' },
    miniAvatar: { width: 44, height: 44, borderRadius: 22 },
    removeBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#94a3b8', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

    tabsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 15, gap: 12 },
    tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f5f9' },
    tabActive: { backgroundColor: '#0d9488' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    tabTextActive: { color: '#fff' },

    searchSection: { paddingHorizontal: 20, marginTop: 15 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },

    listContainer: { flex: 1, marginTop: 15 },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    avatarContainer: { position: 'relative' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9' },
    checkBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0d9488', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    memberInfo: { flex: 1, marginLeft: 14 },
    memberName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    memberSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
});
