import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, StatusBar, Image, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={sharing}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
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
                    <ActivityIndicator color="#8b5cf6" style={{ marginTop: 20 }} />
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
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    
    searchSection: { padding: 20, paddingTop: 0 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', borderRadius: 16, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 10, color: '#2D2445', fontSize: 15 },

    contactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    contactName: { fontSize: 16, fontWeight: '700', color: '#2D2445' },
    profileName: { fontSize: 13, color: '#7A6B9C', marginTop: 2 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#C4B5DC', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },

    emptyText: { textAlign: 'center', color: '#9A8EBA', marginTop: 40, fontSize: 15, fontWeight: '600' },
    bottomSummary: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    selectedCount: { color: '#2D2445', fontSize: 15, fontWeight: '800' },
    summaryContent: { flexDirection: 'row', alignItems: 'center' },
    selectedAvatars: { flex: 1 },
    miniAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: '#8b5cf6' },
    shareButton: { backgroundColor: '#8b5cf6', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
    shareButtonText: { color: '#2D2445', fontWeight: '900', fontSize: 15 }
});
