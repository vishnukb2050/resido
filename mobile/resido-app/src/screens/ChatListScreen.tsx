import React, { useEffect, useState, useMemo } from 'react';
import * as Contacts from 'expo-contacts';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Image, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { chatApi, authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useConversations } from '../hooks/useConversations';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const CHAT_FILTERS = ['All', 'Community', 'Contacts', 'Groups'];

export default function ChatListScreen() {
    const user = useAuthStore((s) => s.user);
    const token = useAuthStore((s) => s.token);
    const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
    const { forwardContent } = useLocalSearchParams();
    const { data: conversations = [], isLoading: loading, refetch: refetchConversations } = useConversations();
    const [activeFilter, setActiveFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userCache, setUserCache] = useState<Record<string, any>>({});
    const [registeredContacts, setRegisteredContacts] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        if (conversations.length > 0) {
            resolveMemberNames(conversations);
        }
    }, [conversations]);

    useEffect(() => {
        syncRegisteredContacts();
    }, []);

    // When the user is in a community, make sure they're in its default group
    // chat (creates it on first use), then refresh so it shows under Community.
    useEffect(() => {
        if (!activeWorkspace?.tenantId || !token) return;
        let cancelled = false;
        (async () => {
            try {
                await chatApi.ensureCommunityGroup(activeWorkspace.tenantName);
                if (!cancelled) refetchConversations();
            } catch (e) {
                console.warn('[chat] ensure community group failed', e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeWorkspace?.tenantId, token]);

    // Note: this screen no longer opens its own chat socket. The app-wide
    // `useChatNotifications` hook holds the single shared chat connection and
    // invalidates the `['conversations']` query on every incoming message, which
    // re-renders this list automatically. (Its old `new_message` listener never
    // fired here anyway — the server only emits `new_message` to a conversation
    // room this screen never joined.)

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

    const resolveMemberNames = async (convs: any[]) => {
        const directConvs = convs.filter((c) => c.type === 'DIRECT');
        const ids = Array.from(
            new Set(
                directConvs
                    .map((conv) => conv.members?.find((m: any) => m.memberId !== user?.id)?.memberId)
                    .filter((id): id is string => !!id),
            ),
        ).filter((id) => !userCache[id]);

        if (ids.length === 0) return;

        // Single batched request instead of one getUser call per conversation.
        try {
            const { data } = await authApi.getChatIdentitiesBatch(ids);
            const map = data || {};
            if (Object.keys(map).length > 0) {
                setUserCache((prev) => ({ ...prev, ...map }));
            }
        } catch (e) {
            console.error('Failed to resolve chat identities', e);
        }
    };

    const getOtherMemberName = (conv: any) => {
        const otherMemberId = conv.members?.find((m: any) => m.memberId !== user?.id)?.memberId;
        return userCache[otherMemberId]?.name || userCache[otherMemberId]?.phone || 'User';
    };

    const filteredConversations = useMemo(() => conversations.filter((conv: any) => {
        if (search.length >= 3) return false; // Hide main list while searching users

        if (activeFilter === 'All') return true;
        // Community conversations are GROUP rows created automatically with a "comm-"
        // groupId, OR any group whose name starts with "Community" as a friendly fallback.
        if (activeFilter === 'Community') {
            return (
                conv.type === 'GROUP' &&
                (conv.groupId?.startsWith('comm-') ||
                    (conv.name || '').toLowerCase().includes('community'))
            );
        }
        if (activeFilter === 'Contacts') return conv.type === 'DIRECT';
        if (activeFilter === 'Groups') return conv.type === 'GROUP';
        return true;
    }), [conversations, search, activeFilter]);

    const displayContacts = useMemo(() => registeredContacts.filter(contact => {
        if (activeFilter !== 'Contacts') return false;
        // Don't show if already in conversations list
        return !conversations.some((c: any) => 
            c.type === 'DIRECT' && 
            c.members?.some((m: any) => m.memberId === contact.id)
        );
    }), [registeredContacts, conversations, activeFilter]);

    // Flattened, typed rows for the virtualized list: conversations, then an
    // optional "Suggestions" section header followed by contact suggestions.
    const listData = useMemo(() => {
        const rows: any[] = filteredConversations.map((conv: any) => ({ kind: 'conv', conv }));
        if (activeFilter === 'Contacts' && displayContacts.length > 0) {
            rows.push({ kind: 'section', title: 'Suggestions' });
            displayContacts.forEach((contact) => rows.push({ kind: 'contact', contact }));
        }
        return rows;
    }, [filteredConversations, displayContacts, activeFilter]);

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
                    <Ionicons name="person-add-outline" size={24} color="#1d4ed8" />
                </TouchableOpacity>
            </View>

            <FlatList
                style={styles.content}
                data={listData}
                keyExtractor={(item, index) =>
                    item.kind === 'conv'
                        ? `conv-${item.conv.id}`
                        : item.kind === 'contact'
                            ? `contact-${item.contact.id}`
                            : `section-${index}`
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={10}
                removeClippedSubviews
                ListHeaderComponent={
                    <>
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
                                {isSearching && <ActivityIndicator size="small" color="#1d4ed8" />}
                            </View>
                        </View>

                        {/* Search Results */}
                        {search.length >= 3 && (
                            <View style={styles.searchResultsContainer}>
                                <Text style={styles.resultsTitle}>Search Results</Text>
                                {searchResults.length > 0 ? (
                                    searchResults.map(u => (
                                        <TouchableOpacity 
                                            key={u.id} 
                                            style={styles.searchItem}
                                            onPress={() => router.push(`/chat/new?userId=${u.id}`)}
                                        >
                                            <View style={styles.userAvatar}>
                                                <Text style={styles.avatarText}>{u.name?.[0] || '?'}</Text>
                                            </View>
                                            <View style={styles.userInfo}>
                                                <Text style={styles.userName}>{u.name || 'Anonymous'}</Text>
                                                <Text style={styles.userPhone}>{u.phone}</Text>
                                            </View>
                                            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1d4ed8" />
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

                        {/* Create Group Button (Only for Groups filter) */}
                        {activeFilter === 'Groups' && (
                            <TouchableOpacity 
                                style={styles.createGroupBtn}
                                onPress={() => router.push('/chat/create-group')}
                            >
                                <View style={styles.createGroupIcon}>
                                    <Ionicons name="add" size={24} color="#fff" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.createGroupTitle}>New Group</Text>
                                    <Text style={styles.createGroupSub}>Add members from contacts, community or followers</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                            </TouchableOpacity>
                        )}
                    </>
                }
                renderItem={({ item }) => {
                    if (item.kind === 'section') {
                        return (
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{item.title}</Text>
                            </View>
                        );
                    }
                    if (item.kind === 'contact') {
                        const contact = item.contact;
                        return (
                            <ChatItem
                                item={{
                                    id: contact.id,
                                    name: contact.name || contact.profileName || contact.phone,
                                    sub: 'Resido Contact',
                                    online: false,
                                }}
                                onPress={() => router.push(`/chat/new?userId=${contact.id}`)}
                            />
                        );
                    }
                    const conv = item.conv;
                    return (
                        <ChatItem
                            item={{
                                id: conv.id,
                                name: conv.name || (conv.type === 'DIRECT' ? getOtherMemberName(conv) : 'Group Chat'),
                                sub: conv.messages?.[0]?.content || 'No messages yet',
                                time: conv.messages?.[0] ? dayjs(conv.messages[0].createdAt).format('hh:mm A') : '',
                                icon: conv.type === 'GROUP' ? 'people' : undefined,
                                online: conv.type === 'DIRECT',
                                unread: conv.unreadCount || 0,
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
                                    router.push({
                                        pathname: `/chat/${conv.id}`,
                                        params: {
                                            convName: conv.name || getOtherMemberName(conv),
                                            convType: conv.type,
                                            otherMemberId:
                                                conv.type === 'DIRECT'
                                                    ? conv.members?.find((m: any) => m.memberId !== user?.id)?.memberId
                                                    : undefined,
                                        },
                                    });
                                }
                            }}
                        />
                    );
                }}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubble-outline" size={48} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No conversations found in {activeFilter}</Text>
                        </View>
                    )
                }
            />

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
                        <Ionicons name={item.icon as any} size={24} color="#1d4ed8" />
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
                    <Text style={[styles.chatName, item.unread > 0 && styles.chatNameUnread]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeUnread]}>{item.time}</Text>
                </View>
                <View style={styles.chatBottomRow}>
                    <Text style={[styles.chatSub, item.unread > 0 && styles.chatSubUnread]} numberOfLines={1}>{item.sub}</Text>
                    {item.unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    content: { flex: 1, backgroundColor: '#fff' },
    searchContainer: { paddingHorizontal: 20, marginTop: 15 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '500' },
    
    filtersContainer: { marginTop: 15, marginBottom: 10 },
    filtersContent: { paddingHorizontal: 20, gap: 10 },
    filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#f1f5f9' },
    filterPillActive: { backgroundColor: '#1d4ed8' },
    filterText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    filterTextActive: { color: '#2D2445' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 10 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1d4ed8' },
    viewAllText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },

    chatCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    avatarContainer: { position: 'relative' },
    iconAvatar: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
    chatInfo: { flex: 1, marginLeft: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc', paddingBottom: 10 },
    chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    chatName: { fontSize: 15, fontWeight: '800', color: '#1e293b', flex: 1 },
    chatNameUnread: { color: '#0f172a' },
    chatTime: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginLeft: 8 },
    chatTimeUnread: { color: '#ef4444', fontWeight: '800' },
    chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatSub: { fontSize: 13, color: '#64748b', fontWeight: '500', flex: 1 },
    chatSubUnread: { color: '#1e293b', fontWeight: '700' },
    unreadBadge: { backgroundColor: '#ef4444', borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
    unreadText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
    
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
    createGroupBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 18, 
        backgroundColor: '#fff', 
        borderBottomWidth: 1, 
        borderBottomColor: '#f8fafc' 
    },
    createGroupIcon: { 
        width: 44, 
        height: 44, 
        borderRadius: 14, 
        backgroundColor: '#1d4ed8', 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: '#1d4ed8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    createGroupTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    createGroupSub: { fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 },
});
