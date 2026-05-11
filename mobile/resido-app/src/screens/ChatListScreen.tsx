import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, TextInput, ScrollView, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { chatApi, authApi } from '../services/api';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const CHAT_FILTERS = ['All', 'Community', 'Contacts', 'Groups'];

const PINNED_CHATS = [
    { id: 'p1', name: 'Greenwood Residency', sub: 'Water supply will be interrupted on...', time: '10:30 AM', unread: 3, icon: 'business' },
    { id: 'p2', name: 'Society Announcements', sub: 'Annual maintenance update...', time: 'Yesterday', unread: 1, icon: 'megaphone' },
];

const COMMUNITY_CHATS = [
    { id: 'c1', name: 'Greenwood Residency', sub: 'Neha: Guys, please note the parking...', time: '10:30 AM', unread: 3, icon: 'business' },
    { id: 'c2', name: 'Tower A - Residents', sub: 'Ramesh: Thanks everyone!', time: '9:15 AM', unread: 5, icon: 'people' },
    { id: 'c3', name: 'Club House Committee', sub: 'Meeting tomorrow at 6 PM', time: 'Yesterday', unread: 0, icon: 'home' },
];

const CONTACTS = [
    { id: 'u1', name: 'Priya Sharma', sub: 'Great, thank you!', time: '10:20 AM', online: true },
    { id: 'u2', name: 'Arjun Mehta', sub: "Let's connect later", time: '9:45 AM', online: true },
    { id: 'u3', name: 'Suresh Patil', sub: 'Okay 👍', time: 'Yesterday', online: false },
    { id: 'u4', name: 'Anita Verma', sub: 'See you then!', time: 'Yesterday', online: false },
    { id: 'u5', name: 'Vikram Singh', sub: 'Sent a sticker', time: 'May 21', online: false },
];

export default function ChatListScreen() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // chatApi.getConversations().then((r) => setConversations(r.data)).finally(() => setLoading(false));
    }, []);

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

                {/* Pinned Section */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="pin" size={14} color="#6366f1" />
                    <Text style={styles.sectionTitle}>Pinned</Text>
                </View>
                {PINNED_CHATS.map(item => (
                    <ChatItem key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}`)} />
                ))}

                {/* Community Chats */}
                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                    <Text style={styles.sectionTitle}>Community Chats</Text>
                    <TouchableOpacity><Text style={styles.viewAllText}>View all</Text></TouchableOpacity>
                </View>
                {COMMUNITY_CHATS.map(item => (
                    <ChatItem key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}`)} />
                ))}

                {/* Contacts Section */}
                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                    <Text style={styles.sectionTitle}>Contacts on Resido</Text>
                    <TouchableOpacity><Text style={styles.viewAllText}>View all</Text></TouchableOpacity>
                </View>
                {CONTACTS.map(item => (
                    <ChatItem key={item.id} item={item} onPress={() => router.push(`/chat/${item.id}`)} />
                ))}

                {/* Other Contacts */}
                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                    <Text style={styles.sectionTitle}>Other Contacts</Text>
                </View>
                <ChatItem item={{ id: 'o1', name: 'Rahul Kapoor', sub: 'Hey, how are you?', time: 'May 20', online: false }} onPress={() => {}} />
                <ChatItem item={{ id: 'o2', name: 'Meera Iyer', sub: 'Let me know', time: 'May 19', online: false }} onPress={() => {}} />

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
});
