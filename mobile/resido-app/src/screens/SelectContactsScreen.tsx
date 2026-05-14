import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Image, FlatList,
    ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mySpaceApi, authApi } from '../services/api';

export default function SelectContactsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [contacts, setContacts] = useState<any[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadContacts();
    }, []);

    const loadContacts = async () => {
        try {
            setLoading(true);
            // Fetch followers as contacts
            const { data } = await authApi.getProfile();
            setContacts(data.followers || []);
        } catch (error) {
            console.error('Failed to load contacts', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        if (selected.includes(id)) setSelected(selected.filter(i => i !== id));
        else setSelected([...selected, id]);
    };

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
                    targetType: 'CONTACT',
                    targetId: targetId,
                    isFolder: isFolder
                });
            }

            Alert.alert('Success', 'Shared successfully');
            router.back();
        } catch (error) {
            console.error('Sharing failed', error);
            Alert.alert('Error', 'Sharing failed');
        } finally {
            setSharing(false);
        }
    };

    const filteredContacts = contacts.filter(c => 
        c.profileName?.toLowerCase().includes(search.toLowerCase()) ||
        c.fullName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={sharing}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Contacts</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" />
                    <TextInput 
                        placeholder="Search by profile name..." 
                        style={styles.searchInput}
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {loading ? (
                    <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
                ) : filteredContacts.length === 0 ? (
                    <Text style={styles.emptyText}>No contacts found</Text>
                ) : (
                    filteredContacts.map(contact => (
                        <ContactItem 
                            key={contact.id} 
                            contact={contact} 
                            isSelected={selected.includes(contact.id)} 
                            onPress={() => toggleSelect(contact.id)}
                        />
                    ))
                )}
            </ScrollView>

            {/* Selection Summary */}
            {selected.length > 0 && (
                <View style={styles.bottomSummary}>
                    <View style={styles.summaryTop}>
                        <Text style={styles.selectedCount}>{selected.length} Selected</Text>
                        <TouchableOpacity onPress={() => setSelected([])}><Ionicons name="close" size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                    <View style={styles.summaryContent}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedAvatars}>
                            {selected.map(id => {
                                const contact = contacts.find(c => c.id === id);
                                return <Image key={id} source={{ uri: contact?.profileImage || 'https://i.pravatar.cc/100?u=' + id }} style={styles.miniAvatar} />;
                            })}
                        </ScrollView>
                        <TouchableOpacity style={styles.shareButton} onPress={handleShare} disabled={sharing}>
                            {sharing ? <ActivityIndicator color="#fff" /> : <Text style={styles.shareButtonText}>Share</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const ContactItem = ({ contact, isSelected, onPress }: any) => (
    <TouchableOpacity style={styles.contactItem} onPress={onPress}>
        <Image source={{ uri: contact.profileImage || 'https://i.pravatar.cc/100?u=' + contact.id }} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.contactName}>{contact.fullName || contact.profileName}</Text>
            <Text style={styles.profileName}>@{contact.profileName}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    
    searchSection: { padding: 20, paddingTop: 0 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 15 },

    contactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    contactName: { fontSize: 16, fontWeight: '700', color: '#fff' },
    profileName: { fontSize: 13, color: '#64748b', marginTop: 2 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },

    emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15, fontWeight: '600' },
    bottomSummary: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    selectedCount: { color: '#fff', fontSize: 15, fontWeight: '800' },
    summaryContent: { flexDirection: 'row', alignItems: 'center' },
    selectedAvatars: { flex: 1 },
    miniAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: '#6366f1' },
    shareButton: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
    shareButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 }
});
