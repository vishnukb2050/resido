import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const TAGS = ['All', 'Work', 'Personal', 'Project', 'Finance', 'Ideas'];

const NOTES = [
    {
        id: '1',
        title: 'Meeting with Client',
        content: 'Discuss the project requirements and timeline for the new website development.',
        date: '12 Oct, 2023',
        tag: 'Work',
        color: '#f59e0b', // Yellow
    },
    {
        id: '2',
        title: 'Project Ideas',
        content: 'Exploration of new features for the mobile application including AI integration.',
        date: '10 Oct, 2023',
        tag: 'Personal',
        color: '#3b82f6', // Blue
    },
    {
        id: '3',
        title: 'Grocery List',
        content: 'Milk, Eggs, Bread, Fruits, Vegetables, and Chicken for the weekend dinner.',
        date: '08 Oct, 2023',
        tag: 'Personal',
        color: '#10b981', // Green
    },
    {
        id: '4',
        title: 'Finance Review',
        content: 'Review the monthly budget and expenses for the month of September.',
        date: '05 Oct, 2023',
        tag: 'Finance',
        color: '#ef4444', // Red
    },
];

export default function NotesScreen() {
    const router = useRouter();
    const [selectedTag, setSelectedTag] = useState('All');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notes</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="add" size={28} color="#1e293b" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Search Bar */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={20} color="#94a3b8" />
                        <TextInput 
                            placeholder="Search Notes..." 
                            style={styles.searchInput}
                            placeholderTextColor="#94a3b8"
                        />
                    </View>
                    <TouchableOpacity style={styles.filterBtn}>
                        <Ionicons name="options-outline" size={22} color="#1e293b" />
                    </TouchableOpacity>
                </View>

                {/* Tags */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.tagsContainer}
                    contentContainerStyle={styles.tagsContent}
                >
                    {TAGS.map(tag => (
                        <TouchableOpacity 
                            key={tag} 
                            style={[styles.tagPill, selectedTag === tag && styles.tagPillActive]}
                            onPress={() => setSelectedTag(tag)}
                        >
                            <Text style={[styles.tagText, selectedTag === tag && styles.tagTextActive]}>{tag}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Notes List */}
                <View style={styles.notesList}>
                    {NOTES.map(note => (
                        <TouchableOpacity key={note.id} style={styles.noteCard}>
                            <View style={[styles.noteStrip, { backgroundColor: note.color }]} />
                            <View style={styles.noteContent}>
                                <Text style={styles.noteTitle}>{note.title}</Text>
                                <Text style={styles.notePreview} numberOfLines={2}>{note.content}</Text>
                                <View style={styles.noteFooter}>
                                    <Text style={styles.noteDate}>{note.date}</Text>
                                    <View style={[styles.tagBadge, { backgroundColor: `${note.color}15` }]}>
                                        <Text style={[styles.tagBadgeText, { color: note.color }]}>{note.tag}</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav activeTab="Thread" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1 },
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12, marginVertical: 15 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 50, borderRadius: 25, paddingHorizontal: 15, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1e293b', fontWeight: '500' },
    filterBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    tagsContainer: { marginBottom: 20 },
    tagsContent: { paddingHorizontal: 20, gap: 10 },
    tagPill: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9' },
    tagPillActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    tagText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    tagTextActive: { color: '#fff' },
    notesList: { paddingHorizontal: 20, gap: 15 },
    noteCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
    noteStrip: { width: 6, height: '100%' },
    noteContent: { flex: 1, padding: 16 },
    noteTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
    notePreview: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 12 },
    noteFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    noteDate: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagBadgeText: { fontSize: 10, fontWeight: '800' },
});
