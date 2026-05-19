import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../store/authStore';
import { visitorApi } from '../services/api';

const CATEGORIES = ['All', 'Visitor', 'Delivery', 'Maintenance & Repair'];

export default function VisitorRegisterScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [category, setCategory] = useState('All');
    
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    useEffect(() => {
        fetchRegister();
    }, [startDate, endDate, category]);

    const fetchRegister = async () => {
        setLoading(true);
        try {
            const params: any = {};
            // Set start of day and end of day
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();
            
            if (category !== 'All') {
                params.category = category;
            }

            const { data } = await visitorApi.getEntries(params);
            setEntries(data);
        } catch (e) {
            console.error('Fetch register failed', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visitor Register</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-visitor')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.filterBar}>
                <View style={styles.dateFilters}>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => setShowStartDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                        <Text style={styles.filterText}>{startDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#64748b' }}>to</Text>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => setShowEndDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={16} color="#94a3b8" />
                        <Text style={styles.filterText}>{endDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.filterBtn} onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}>
                    <Text style={styles.filterText}>{category}</Text>
                    <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            {showCategoryDropdown && (
                <View style={styles.dropdown}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat} 
                            style={styles.dropdownItem}
                            onPress={() => {
                                setCategory(cat);
                                setShowCategoryDropdown(false);
                            }}
                        >
                            <Text style={[styles.dropdownItemText, category === cat && styles.selectedItemText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {showStartDatePicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={(event: any, date?: Date) => {
                        setShowStartDatePicker(false);
                        if (date) setStartDate(date);
                    }}
                />
            )}

            {showEndDatePicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={(event: any, date?: Date) => {
                        setShowEndDatePicker(false);
                        if (date) setEndDate(date);
                    }}
                />
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#4c1d95" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.entryCard}>
                            <View style={styles.entryMain}>
                                <View style={styles.iconBox}>
                                    <Ionicons 
                                        name={item.category === 'Delivery' ? 'bicycle' : item.category === 'Visitor' ? 'person' : 'construct'} 
                                        size={24} 
                                        color="#fff" 
                                    />
                                </View>
                                <View style={styles.entryInfo}>
                                    <Text style={styles.visitorName}>{item.visitorName}</Text>
                                    <Text style={styles.entrySub}>{item.phone} • {item.unitToVisit}</Text>
                                    <Text style={styles.entryPurpose}>{item.purpose}</Text>
                                </View>
                                <View style={styles.timeBox}>
                                    <Text style={styles.timeText}>{new Date(item.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    <Text style={styles.statusText}>{item.outTime ? 'EXITED' : 'INSIDE'}</Text>
                                </View>
                            </View>
                            {item.vehicleNumber && (
                                <View style={styles.entryExtra}>
                                    <Ionicons name="car-outline" size={14} color="#64748b" />
                                    <Text style={styles.extraText}>{item.vehicleNumber}</Text>
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="id-card-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>Empty Register</Text>
                            <Text style={styles.emptySub}>No visitor entries recorded for today.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
    
    filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10, zIndex: 10 },
    dateFilters: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    filterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    dropdown: { position: 'absolute', top: 150, right: 20, left: 20, backgroundColor: '#1e293b', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 100 },
    dropdownItem: { padding: 15, borderRadius: 10 },
    dropdownItemText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
    selectedItemText: { color: '#10b981' },

    listContent: { padding: 20 },
    entryCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, marginBottom: 15, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    entryMain: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    entryInfo: { flex: 1, marginLeft: 15 },
    visitorName: { fontSize: 16, fontWeight: '800', color: '#fff' },
    entrySub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    entryPurpose: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    timeBox: { alignItems: 'flex-end' },
    timeText: { fontSize: 14, fontWeight: '900', color: '#fff' },
    statusText: { fontSize: 9, fontWeight: '900', color: '#10b981', marginTop: 4, letterSpacing: 1 },
    entryExtra: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 10 },
    extraText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10 },
});
