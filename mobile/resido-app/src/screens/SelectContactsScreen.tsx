import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Image, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CONTACTS = [
    { id: '1', name: 'Priya Singh', image: 'https://i.pravatar.cc/100?u=priya', frequent: true },
    { id: '2', name: 'Aman Verma', image: 'https://i.pravatar.cc/100?u=aman', frequent: true },
    { id: '3', name: 'Rohit Mehta', image: 'https://i.pravatar.cc/100?u=rohit', frequent: true },
    { id: '4', name: 'Neha Sharma', image: 'https://i.pravatar.cc/100?u=neha', frequent: true },
    { id: '5', name: 'Anita Patel', image: 'https://i.pravatar.cc/100?u=anita' },
    { id: '6', name: 'Arjun Das', image: 'https://i.pravatar.cc/100?u=arjun' },
    { id: '7', name: 'Karan Jain', image: 'https://i.pravatar.cc/100?u=karan' },
    { id: '8', name: 'Pooja Nair', image: 'https://i.pravatar.cc/100?u=pooja' },
    { id: '9', name: 'Vikram Shah', image: 'https://i.pravatar.cc/100?u=vikram' },
];

export default function SelectContactsScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>(['1', '2']);

    const toggleSelect = (id: string) => {
        if (selected.includes(id)) setSelected(selected.filter(i => i !== id));
        else setSelected([...selected, id]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Select Contacts</Text>
                <TouchableOpacity onPress={() => router.back()}><Text style={styles.nextText}>Next</Text></TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" />
                    <TextInput 
                        placeholder="Search contacts" 
                        style={styles.searchInput}
                        placeholderTextColor="#94a3b8"
                    />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Frequently Contacted */}
                <Text style={styles.sectionTitle}>Frequently Contacted</Text>
                {CONTACTS.filter(c => c.frequent).map(contact => (
                    <ContactItem 
                        key={contact.id} 
                        contact={contact} 
                        isSelected={selected.includes(contact.id)} 
                        onPress={() => toggleSelect(contact.id)}
                    />
                ))}

                {/* All Contacts */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>All Contacts</Text>
                {CONTACTS.filter(c => !c.frequent).map(contact => (
                    <ContactItem 
                        key={contact.id} 
                        contact={contact} 
                        isSelected={selected.includes(contact.id)} 
                        onPress={() => toggleSelect(contact.id)}
                    />
                ))}
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
                                const contact = CONTACTS.find(c => c.id === id);
                                return <Image key={id} source={{ uri: contact?.image }} style={styles.miniAvatar} />;
                            })}
                        </ScrollView>
                        <TouchableOpacity style={styles.shareButton} onPress={() => router.back()}>
                            <Text style={styles.shareButtonText}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const ContactItem = ({ contact, isSelected, onPress }: any) => (
    <TouchableOpacity style={styles.contactItem} onPress={onPress}>
        <Image source={{ uri: contact.image }} style={styles.avatar} />
        <Text style={styles.contactName}>{contact.name}</Text>
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
    nextText: { fontSize: 16, color: '#6366f1', fontWeight: '700' },
    
    searchSection: { padding: 20, paddingTop: 0 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 15 },

    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748b', paddingHorizontal: 20, marginBottom: 16, textTransform: 'uppercase' },
    contactItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    contactName: { flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '700', color: '#fff' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },

    bottomSummary: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    selectedCount: { color: '#fff', fontSize: 15, fontWeight: '800' },
    summaryContent: { flexDirection: 'row', alignItems: 'center' },
    selectedAvatars: { flex: 1 },
    miniAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8, borderWidth: 2, borderColor: '#6366f1' },
    shareButton: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
    shareButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 }
});
