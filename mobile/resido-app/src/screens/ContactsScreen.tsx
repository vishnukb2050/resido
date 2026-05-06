import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    ActivityIndicator, TextInput, Share
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { authApi } from '../services/api';
import { useRouter } from 'expo-router';

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
                        .flatMap(c => c.phoneNumbers?.map(p => p.number) || [])
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

    const filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.phoneNumbers?.[0]?.number.includes(search)
    );

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Contacts</Text>
            <TextInput 
                style={styles.search} 
                placeholder="Search contacts..." 
                placeholderTextColor="#64748b"
                value={search}
                onChangeText={setSearch}
            />

            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20, gap: 12 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.name?.[0]}</Text>
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.phone}>{item.phoneNumbers?.[0]?.number}</Text>
                        </View>
                        {item.residoUser ? (
                            <TouchableOpacity 
                                style={styles.chatBtn}
                                onPress={() => router.push(`/chat/new?userId=${item.residoUser.id}`)}
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
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0', marginTop: 60, paddingHorizontal: 20, marginBottom: 16 },
    search: { backgroundColor: '#1e1e2e', marginHorizontal: 20, borderRadius: 12, padding: 14, color: '#fff', marginBottom: 10 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e2e', padding: 14, borderRadius: 16 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    info: { flex: 1, marginLeft: 12 },
    name: { fontSize: 15, fontWeight: '700', color: '#e2e8f0', marginBottom: 2 },
    phone: { fontSize: 12, color: '#64748b' },
    chatBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    inviteBtn: { borderWidth: 1, borderColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    inviteText: { color: '#6366f1', fontSize: 13, fontWeight: '700' },
});
