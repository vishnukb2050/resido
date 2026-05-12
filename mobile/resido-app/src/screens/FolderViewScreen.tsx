import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const DOCUMENTS = [
    { id: '1', name: 'Project Brief.pdf', size: '2.4 MB', date: 'Today, 10:30 AM', type: 'PDF', color: '#ef4444' },
    { id: '2', name: 'Design Guidelines.docx', size: '1.8 MB', date: 'Today, 9:15 AM', type: 'WORD', color: '#3b82f6' },
    { id: '3', name: 'Budget Planning.xlsx', size: '980 KB', date: 'Yesterday, 4:45 PM', type: 'EXCEL', color: '#10b981' },
    { id: '4', name: 'Meeting Notes - 12 May.pdf', size: '1.2 MB', date: 'May 12, 2025', type: 'PDF', color: '#ef4444' },
    { id: '5', name: 'Presentation.pptx', size: '5.3 MB', date: 'May 11, 2025', type: 'PPT', color: '#f59e0b' },
    { id: '6', name: 'Client Feedback.docx', size: '1.6 MB', date: 'May 11, 2025', type: 'WORD', color: '#3b82f6' },
    { id: '7', name: 'To-Do List.xlsx', size: '450 KB', date: 'May 10, 2025', type: 'EXCEL', color: '#10b981' },
    { id: '8', name: 'Marketing Strategy.pdf', size: '2.7 MB', date: 'May 9, 2025', type: 'PDF', color: '#ef4444' },
];

export default function FolderViewScreen() {
    const router = useRouter();
    const { name, count } = useLocalSearchParams();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.headerTitle}>{name || 'Work'}</Text>
                        <Text style={styles.headerSub}>{count || 28} Documents</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="search" size={22} color="#fff" /></TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#64748b" />
                        <TextInput 
                            placeholder={`Search documents in ${name || 'Work'}`} 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity><Ionicons name="options-outline" size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View style={styles.listContainer}>
                    {DOCUMENTS.map((doc) => (
                        <TouchableOpacity 
                            key={doc.id} 
                            style={styles.docCard}
                            onPress={() => router.push({ pathname: '/share-doc', params: { name: doc.name, size: doc.size, folder: name } })}
                        >
                            <View style={[styles.typeIconBox, { backgroundColor: doc.color }]}>
                                <Text style={styles.typeText}>{doc.type}</Text>
                            </View>
                            <View style={styles.docInfo}>
                                <Text style={styles.docName}>{doc.name}</Text>
                                <Text style={styles.docSub}>{doc.size} • {doc.date}</Text>
                            </View>
                            <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#64748b" /></TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingTop: 20, backgroundColor: '#0f172a' },
    headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    
    searchSection: { marginTop: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 15 },

    listContainer: { paddingHorizontal: 20, marginTop: 12 },
    docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    typeIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    typeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    docInfo: { flex: 1, marginLeft: 16 },
    docName: { fontSize: 15, fontWeight: '800', color: '#fff' },
    docSub: { fontSize: 12, color: '#64748b', marginTop: 4 },

    fab: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
});
