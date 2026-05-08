import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const DATES = [
    { day: 'Mon', date: 16 },
    { day: 'Tue', date: 17 },
    { day: 'Wed', date: 18, active: true },
    { day: 'Thu', date: 19 },
    { day: 'Fri', date: 20 },
    { day: 'Sat', date: 21 },
    { day: 'Sun', date: 22 },
];

const SCHEDULE = [
    {
        id: '1',
        time: '09:00 AM',
        title: 'Meeting with Design Team',
        range: '09:00 AM - 10:30 AM',
        color: '#8b5cf6', // Purple
        icon: 'color-palette-outline'
    },
    {
        id: '2',
        time: '11:00 AM',
        title: 'Review with Client',
        range: '11:00 AM - 12:30 PM',
        color: '#f59e0b', // Orange
        icon: 'people-outline'
    },
    {
        id: '3',
        time: '02:00 PM',
        title: 'Daily Standup',
        range: '02:00 PM - 02:30 PM',
        color: '#10b981', // Green
        icon: 'sync-outline'
    },
    {
        id: '4',
        time: '04:00 PM',
        title: 'Project Kickoff',
        range: '04:00 PM - 05:30 PM',
        color: '#3b82f6', // Blue
        icon: 'rocket-outline'
    }
];

export default function CalendarScreen() {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState(18);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calendar</Text>
                <View style={styles.monthNav}>
                    <TouchableOpacity><Ionicons name="chevron-back" size={20} color="#1e293b" /></TouchableOpacity>
                    <Text style={styles.monthText}>October 2023</Text>
                    <TouchableOpacity><Ionicons name="chevron-forward" size={20} color="#1e293b" /></TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Date Selection */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.dateContainer}
                    contentContainerStyle={styles.dateContent}
                >
                    {DATES.map(item => (
                        <TouchableOpacity 
                            key={item.date} 
                            style={[styles.dateCard, selectedDate === item.date && styles.dateCardActive]}
                            onPress={() => setSelectedDate(item.date)}
                        >
                            <Text style={[styles.dayText, selectedDate === item.date && styles.dayTextActive]}>{item.day}</Text>
                            <Text style={[styles.dateText, selectedDate === item.date && styles.dateTextActive]}>{item.date}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Schedule List */}
                <View style={styles.scheduleContainer}>
                    {SCHEDULE.map(item => (
                        <View key={item.id} style={styles.scheduleRow}>
                            <View style={styles.timeCol}>
                                <Text style={styles.timeText}>{item.time}</Text>
                                <View style={styles.timeline} />
                            </View>
                            <TouchableOpacity style={[styles.eventCard, { backgroundColor: `${item.color}15` }]}>
                                <View style={[styles.eventIconBox, { backgroundColor: item.color }]}>
                                    <Ionicons name={item.icon as any} size={20} color="#fff" />
                                </View>
                                <View style={styles.eventInfo}>
                                    <Text style={styles.eventTitle}>{item.title}</Text>
                                    <Text style={styles.eventRange}>{item.range}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#fff' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    monthNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    monthText: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    content: { flex: 1 },
    dateContainer: { marginVertical: 20 },
    dateContent: { paddingHorizontal: 20, gap: 12 },
    dateCard: { width: 60, height: 80, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    dateCardActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    dayText: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginBottom: 4 },
    dayTextActive: { color: 'rgba(255,255,255,0.8)' },
    dateText: { fontSize: 18, color: '#1e293b', fontWeight: '900' },
    dateTextActive: { color: '#fff' },
    scheduleContainer: { paddingHorizontal: 20, marginTop: 10 },
    scheduleRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
    timeCol: { alignItems: 'center', width: 65 },
    timeText: { fontSize: 12, color: '#94a3b8', fontWeight: '800', marginBottom: 10 },
    timeline: { flex: 1, width: 2, backgroundColor: '#f1f5f9', borderRadius: 1 },
    eventCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, gap: 12 },
    eventIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    eventRange: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
    fab: { position: 'absolute', bottom: 100, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
});
