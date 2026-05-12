import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const GROUPS = [
    { id: '1', name: 'Design Team', members: 8, color: '#3b82f6' },
    { id: '2', name: 'Marketing Team', members: 12, color: '#6366f1' },
    { id: '3', name: 'Project Alpha', members: 6, color: '#ef4444' },
    { id: '4', name: 'Family Group', members: 5, color: '#ec4899' },
    { id: '5', name: 'Friends Circle', members: 9, color: '#8b5cf6' },
    { id: '6', name: 'Work Buddies', members: 7, color: '#f59e0b' },
    { id: '7', name: 'Resido Community', members: 24, color: '#10b981' },
];

export default function SelectGroupsScreen() {
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
                    />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {GROUPS.map(group => (
                    <TouchableOpacity 
                        key={group.id} 
                        style={styles.groupItem}
                        onPress={() => toggleSelect(group.id)}
                    >
                        <View style={[styles.groupIconBox, { backgroundColor: group.color }]}>
                            <Ionicons name="people" size={22} color="#fff" />
                        </View>
                        <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>{group.name}</Text>
                            <Text style={styles.groupSub}>{group.members} Members</Text>
                        </View>
                        <View style={[styles.checkbox, selected.includes(group.id) && styles.checkboxActive]}>
                            {selected.includes(group.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Action Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.shareButton} onPress={() => router.back()}>
                    <Text style={styles.shareButtonText}>Share with Group</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginLeft: 16 },
    
    searchSection: { padding: 20, paddingTop: 0 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 15 },

    groupItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    groupIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    groupInfo: { flex: 1, marginLeft: 16 },
    groupName: { fontSize: 16, fontWeight: '700', color: '#fff' },
    groupSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },

    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 20, paddingBottom: 30, backgroundColor: '#0f172a' },
    shareButton: { backgroundColor: '#6366f1', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    shareButtonText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
