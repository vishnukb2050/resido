import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, TextInput, Share, SafeAreaView
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { authApi } from '../services/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

export default function ContactsScreen() {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        (async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
                });

                if (data.length > 0) {
                    const phones = data
                        .flatMap(c => c.phoneNumbers?.map(p => p.number?.replace(/\D/g, '')) || [])
                        .filter(Boolean) as string[];

                    try {
                        const res = await authApi.syncContacts(phones);
                        const registeredMap = new Map(res.data.map((u: any) => [u.phone, u]));

                        const enriched = data.map(c => {
                            const mainPhone = c.phoneNumbers?.[0]?.number?.replace(/\D/g, '') || '';
                            return {
                                ...c,
                                residoUser: registeredMap.get(mainPhone) || null
                            };
                        });

                        setContacts(enriched.sort((a, b) => (a.residoUser ? -1 : 1)));
                    } catch (e) {
                        console.error('Sync failed', e);
                    }
                }
            }
            setLoading(false);
        })();
    }, []);

    const handleInvite = async (phone: string) => {
        try {
            await Share.share({
                message: `Hey! I'm using Resido to manage my apartment and chat with neighbors. Download it here: https://residoapp.com/download`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const [globalResults, setGlobalResults] = useState<any[]>([]);
    const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

    const handleSearch = async (text: string) => {
        setSearch(text);
        if (text.length >= 3) {
            setIsSearchingGlobal(true);
            try {
                const { data } = await authApi.searchUsers(text);
                setGlobalResults(data);
            } catch (error) {
                console.error('Global search failed', error);
            } finally {
                setIsSearchingGlobal(false);
            }
        } else {
            setGlobalResults([]);
        }
    };

    const filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.phoneNumbers?.[0]?.number.includes(search)
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Contacts</Text>
                <TouchableOpacity>
                    <Ionicons name="person-add-outline" size={24} color="#4c1d95" />
                </TouchableOpacity>
            </View>

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
                    {isSearchingGlobal && <ActivityIndicator size="small" color="#4c1d95" />}
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#4c1d95" />
                </View>
            ) : (
                <FlatList
                    data={search.length >= 3 ? [...filtered, ...globalResults.filter(g => !filtered.some(f => f.residoUser?.id === g.id))] : filtered}
                    keyExtractor={(item) => item.id || item.phone}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isGlobal = !item.name && item.phone;
                        const residoUser = item.residoUser || (isGlobal ? item : null);
                        
                        return (
                            <View style={styles.card}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{(item.name || residoUser?.name || '?')[0]}</Text>
                                </View>
                                <View style={styles.info}>
                                    <Text style={styles.name}>{item.name || residoUser?.name || 'Resido User'}</Text>
                                    <Text style={styles.phone}>{item.phoneNumbers?.[0]?.number || residoUser?.phone}</Text>
                                    {isGlobal && <Text style={styles.globalBadge}>Global Search Result</Text>}
                                </View>
                                {residoUser ? (
                                    <TouchableOpacity 
                                        style={styles.chatBtn}
                                        onPress={() => router.push(`/chat/new?userId=${residoUser.id}`)}
                                    >
                                        <Text style={styles.btnText}>Chat</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity 
                                        style={styles.inviteBtn}
                                        onPress={() => handleInvite(item.phoneNumbers?.[0]?.number)}
                                    >
                                        <Text style={styles.inviteText}>Invite</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }}
                    ListEmptyComponent={<Text style={styles.empty}>No contacts found</Text>}
                />
            )}
            <BottomNav />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 65, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    searchContainer: { padding: 20, backgroundColor: '#fff' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b', fontWeight: '500' },
    listContent: { padding: 16, paddingBottom: 110, gap: 12 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#1e293b', fontSize: 18, fontWeight: '800' },
    info: { flex: 1, marginLeft: 14 },
    name: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
    phone: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    chatBtn: { backgroundColor: '#4c1d95', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    inviteBtn: { borderWidth: 1, borderColor: '#4c1d95', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    btnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    inviteText: { color: '#4c1d95', fontSize: 13, fontWeight: '800' },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48, fontSize: 15, fontWeight: '600' },
    globalBadge: { fontSize: 10, color: '#4c1d95', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
});
