import React, { useEffect, useState } from 'react';
import * as Contacts from 'expo-contacts';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, TextInput, ScrollView, Image, StatusBar, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { chatApi, authApi, API_URL } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import BottomNav from '../components/BottomNav';

const CHAT_FILTERS = ['All', 'Community', 'Contacts', 'Groups'];

export default function ChatListScreen() {
    const { user } = useAuthStore();
    const { forwardContent } = useLocalSearchParams();
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userCache, setUserCache] = useState<Record<string, any>>({});
    const [registeredContacts, setRegisteredContacts] = useState<any[]>([]);
    const { activeWorkspace } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        fetchConversations();
        syncRegisteredContacts();
        const cleanup = connectSocket();
        return cleanup;
    }, []);

    const connectSocket = () => {
        if (!activeWorkspace) return;

        const socket = io(`${API_URL}/chat`, {
            auth: {
                tenantId: activeWorkspace.tenantId,
                dbName: activeWorkspace.dbName,
                memberId: user?.id
            }
        });

        socket.on('new_message', (message: any) => {
            setConversations(prev => {
                const existing = prev.find(c => c.id === message.conversationId);
                if (existing) {
                    // Update conversation and move to top
                    const updated = { 
                        ...existing, 
                        messages: [message, ...(existing.messages || [])] 
                    };
                    return [updated, ...prev.filter(c => c.id !== message.conversationId)];
                }
                // If it's a completely new conversation we don't have yet
                return prev; 
            });
        });

        return () => {
            socket.disconnect();
        };
    };

    const syncRegisteredContacts = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers],
                });
                
                const phones = data
                    .flatMap(c => c.phoneNumbers?.map(p => p.number?.replace(/\D/g, '')) || [])
                    .filter(Boolean) as string[];

                if (phones.length > 0) {
                    const res = await authApi.syncContacts(phones);
                    setRegisteredContacts(res.data || []);
                }
            }
        } catch (e) {
            console.error('Contact sync in chat failed', e);
        }
    };

    const fetchConversations = async () => {
        try {
            setLoading(true);
            const { data } = await chatApi.getConversations();
            setConversations(data || []);
            resolveMemberNames(data || []);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const resolveMemberNames = async (convs: any[]) => {
        const directConvs = convs.filter(c => c.type === 'DIRECT');
        for (const conv of directConvs) {
            const otherMemberId = conv.members?.find((m: any) => m.memberId !== user?.id)?.memberId;
            if (otherMemberId && !userCache[otherMemberId]) {
                try {
                    const { data } = await authApi.getUser(otherMemberId);
                    setUserCache(prev => ({ ...prev, [otherMemberId]: data }));
                } catch (e) {
                    console.error('Failed to fetch user:', otherMemberId, e);
                }
            }
        }
    };

    const getOtherMemberName = (conv: any) => {
        const otherMemberId = conv.members?.find((m: any) => m.memberId !== user?.id)?.memberId;
        return userCache[otherMemberId]?.name || userCache[otherMemberId]?.phone || 'User';
    };

    const filteredConversations = conversations.filter(conv => {
        if (search.length >= 3) return false; // Hide main list while searching users

        if (activeFilter === 'All') return true;
        if (activeFilter === 'Community') return conv.type === 'GROUP' && conv.groupId?.startsWith('comm-');
        if (activeFilter === 'Contacts') return conv.type === 'DIRECT';
        if (activeFilter === 'Groups') return conv.type === 'GROUP';
        return true;
    });

    const displayContacts = registeredContacts.filter(contact => {
        if (activeFilter !== 'Contacts') return false;
        // Don't show if already in conversations list
        return !conversations.some(c => 
            c.type === 'DIRECT' && 
            c.members?.some((m: any) => m.memberId === contact.id)
        );
    });

    const handleSearch = async (text: string) => {
        setSearch(text);
        if (text.length >= 3) {
            setIsSearching(true);
            try {
                const { data } = await authApi.searchUsers(text);
                setSearchResults(data);
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chat</Text>
                <TouchableOpacity onPress={() => router.push('/contacts')}>
                    <Ionicons name="person-add-outline" size={24} color="#6366f1" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Search name or number..." 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                            value={search}
                            onChangeText={handleSearch}
                        />
                        {isSearching && <ActivityIndicator size="small" color="#6366f1" />}
                    </View>
                </View>

                {/* Search Results */}
                {search.length >= 3 && (
                    <View style={styles.searchResultsContainer}>
                        <Text style={styles.resultsTitle}>Search Results</Text>
                        {searchResults.length > 0 ? (
                            searchResults.map(user => (
                                <TouchableOpacity 
                                    key={user.id} 
                                    style={styles.searchItem}
                                    onPress={() => router.push(`/chat/new?userId=${user.id}`)}
                                >
                                    <View style={styles.userAvatar}>
                                        <Text style={styles.avatarText}>{user.name?.[0] || '?'}</Text>
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName}>{user.name || 'Anonymous'}</Text>
                                        <Text style={styles.userPhone}>{user.phone}</Text>
                                    </View>
                                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6366f1" />
                                </TouchableOpacity>
                            ))
                        ) : !isSearching ? (
                            <Text style={styles.noResults}>No users found</Text>
                        ) : null}
                        <View style={styles.searchDivider} />
                    </View>
                )}

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer} contentContainerStyle={styles.filtersContent}>
                    {CHAT_FILTERS.map(filter => (
                        <TouchableOpacity 
                            key={filter} 
                            style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Ionicons 
                                name={filter === 'All' ? 'chatbubbles' : filter === 'Community' ? 'business' : filter === 'Contacts' ? 'person' : 'people'} 
                                size={18} 
                                color={activeFilter === filter ? '#fff' : '#64748b'} 
                            />
                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Conversations List */}
                {loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {filteredConversations.length > 0 || displayContacts.length > 0 ? (
                            <>
                                {filteredConversations.map(conv => (
                                    <ChatItem 
                                        key={conv.id} 
                                        item={{
                                            id: conv.id,
                                            name: conv.name || (conv.type === 'DIRECT' ? getOtherMemberName(conv) : 'Group Chat'),
                                            sub: conv.messages?.[0]?.content || 'No messages yet',
                                            time: conv.messages?.[0] ? dayjs(conv.messages[0].createdAt).format('hh:mm A') : '',
                                            icon: conv.type === 'GROUP' ? 'people' : undefined,
                                            online: conv.type === 'DIRECT' // Mock online status
                                        }} 
                                        onPress={() => {
                                            if (forwardContent) {
                                                Alert.alert('Forward', 'Forward this content to this chat?', [
                                                    { text: 'Cancel', style: 'cancel' },
                                                    { text: 'Send', onPress: async () => {
                                                        try {
                                                            await chatApi.sendMessage(conv.id, { content: forwardContent as string });
                                                            Alert.alert('Success', 'Forwarded successfully!');
                                                            router.back();
                                                        } catch (e) {
                                                            Alert.alert('Error', 'Failed to forward');
                                                        }
                                                    }}
                                                ]);
                                            } else {
                                                router.push(`/chat/${conv.id}`);
                                            }
                                        }} 
                                    />
                                ))}

                                {activeFilter === 'Contacts' && displayContacts.length > 0 && (
                                    <>
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>Suggestions</Text>
                                        </View>
                                        {displayContacts.map(contact => (
                                            <ChatItem 
                                                key={contact.id}
                                                item={{
                                                    id: contact.id,
                                                    name: contact.name || contact.profileName || contact.phone,
                                                    sub: 'Resido Contact',
                                                    online: false
                                                }}
                                                onPress={() => router.push(`/chat/new?userId=${contact.id}`)}
                                            />
                                        ))}
                                    </>
                                )}
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="chatbubble-outline" size={48} color="#cbd5e1" />
                                <Text style={styles.emptyText}>No conversations found in {activeFilter}</Text>
                            </View>
                        )}
                    </>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav activeTab="Chats" />
        </SafeAreaView>
    );
}

function ChatItem({ item, onPress }: any) {
    return (
        <TouchableOpacity style={styles.chatCard} onPress={onPress}>
            <View style={styles.avatarContainer}>
                {item.icon ? (
                    <View style={styles.iconAvatar}>
                        <Ionicons name={item.icon as any} size={24} color="#6366f1" />
                    </View>
                ) : (
                    <View style={styles.userAvatar}>
                        <Ionicons name="person" size={24} color="#94a3b8" />
                    </View>
                )}
                {item.online && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    <Text style={styles.chatTime}>{item.time}</Text>
                </View>
                <View style={styles.chatBottomRow}>
                    <Text style={styles.chatSub} numberOfLines={1}>{item.sub}</Text>
                    {item.unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 65, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    content: { flex: 1, backgroundColor: '#fff' },
    searchContainer: { paddingHorizontal: 20, marginTop: 15 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '500' },
    
    filtersContainer: { marginTop: 15, marginBottom: 10 },
    filtersContent: { paddingHorizontal: 20, gap: 10 },
    filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#f1f5f9' },
    filterPillActive: { backgroundColor: '#6366f1' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    filterTextActive: { color: '#fff' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 10 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#6366f1' },
    viewAllText: { fontSize: 12, fontWeight: '700', color: '#6366f1' },

    chatCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    avatarContainer: { position: 'relative' },
    iconAvatar: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
    chatInfo: { flex: 1, marginLeft: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc', paddingBottom: 10 },
    chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chatName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    chatTime: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatSub: { fontSize: 13, color: '#64748b', fontWeight: '500', flex: 1 },
    unreadBadge: { backgroundColor: '#6366f1', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
    unreadText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    
    // Search Styles
    searchResultsContainer: { paddingHorizontal: 20, marginTop: 10, paddingBottom: 10 },
    resultsTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 15 },
    searchItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    userPhone: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    avatarText: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    noResults: { textAlign: 'center', color: '#94a3b8', fontSize: 13, paddingVertical: 10 },
    searchDivider: { height: 1, backgroundColor: '#f1f5f9', marginTop: 15, marginBottom: 5 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12 },
});
