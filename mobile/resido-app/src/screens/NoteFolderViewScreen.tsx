import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');
const columnWidth = (width - 50) / 2;

const NOTES = [
    { id: '1', title: 'Project Brief', body: 'Discuss project objectives, deliverables and timeline with the team before we start the development phase.', date: 'Today, 10:30 AM', color: '#6366f1', pinned: true },
    { id: '2', title: 'Meeting Notes - 12 May', body: '- Discussed about new feature rollout\n- Assigned tasks to...', date: 'May 12, 2025', color: '#fef08a', pinned: false },
    { id: '3', title: 'Client Feedback', body: 'Received positive feedback on the new design. They loved the color scheme and...', date: 'May 11, 2025', color: '#dcfce7', pinned: false },
    { id: '4', title: 'To-Do List', body: '☑ Review design\n☑ Update proposal\n☐ Client call\n☐ Final presentation', date: 'May 10, 2025', color: '#e0e7ff', pinned: false },
    { id: '5', title: 'Budget Planning', body: 'Q2 Budget breakdown and planning for upcoming marketing campaign.', date: 'May 9, 2025', color: '#fee2e2', pinned: false },
    { id: '6', title: 'Ideas Brainstorm', body: 'Ideas for the new campaign:\n- Social media focus\n- Influencer collab...', date: 'May 8, 2025', color: '#f5f3ff', pinned: false },
];

export default function NoteFolderViewScreen() {
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
                        <Text style={styles.headerSub}>{count || 24} Notes</Text>
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
                            placeholder={`Search notes in ${name || 'Work'}`} 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity><Ionicons name="options-outline" size={20} color="#64748b" /></TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View style={styles.gridContainer}>
                    {NOTES.map((note) => (
                        <TouchableOpacity 
                            key={note.id} 
                            style={[styles.noteCard, { backgroundColor: note.color === '#6366f1' ? '#6366f1' : note.color }]}
                            onPress={() => router.push({ pathname: '/create-note', params: { id: note.id, title: note.title, body: note.body } })}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={[styles.noteTitle, note.color === '#6366f1' && { color: '#fff' }]}>{note.title}</Text>
                                {note.pinned && <MaterialCommunityIcons name="pin" size={16} color={note.color === '#6366f1' ? '#fff' : '#6366f1'} />}
                            </View>
                            <Text 
                                style={[styles.noteBody, note.color === '#6366f1' && { color: 'rgba(255,255,255,0.8)' }]} 
                                numberOfLines={5}
                            >
                                {note.body}
                            </Text>
                            <Text style={[styles.noteDate, note.color === '#6366f1' && { color: 'rgba(255,255,255,0.6)' }]}>{note.date}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-note')}>
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

    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 15, gap: 15 },
    noteCard: { width: columnWidth, padding: 16, borderRadius: 20, minHeight: 180, justifyContent: 'space-between' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    noteTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 8 },
    noteBody: { fontSize: 13, color: '#475569', lineHeight: 18 },
    noteDate: { fontSize: 11, color: '#64748b', marginTop: 12, fontWeight: '600' },

    fab: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
});
