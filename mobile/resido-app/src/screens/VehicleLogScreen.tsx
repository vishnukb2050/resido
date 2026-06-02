import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../store/authStore';
import { visitorApi } from '../services/api';
import { getThemeColors } from '../utils/theme';

export default function VehicleLogScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

    useEffect(() => {
        fetchVehicleLogs();
    }, [startDate, endDate]);

    const fetchVehicleLogs = async () => {
        setLoading(true);
        try {
            const params: any = {};
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            
            params.startDate = start.toISOString();
            params.endDate = end.toISOString();

            const { data } = await visitorApi.getEntries(params);
            
            // Filter only entries that have a vehicle number logged
            const vehicleOnly = (data || []).filter((item: any) => 
                item.vehicleNumber && item.vehicleNumber.trim() !== ''
            );
            
            setEntries(vehicleOnly);
        } catch (e) {
            console.error('Fetch vehicle logs failed', e);
            Alert.alert('Error', 'Failed to retrieve vehicle logs.');
        } finally {
            setLoading(false);
        }
    };

    // Filter by search query (vehicle number, destination, or visitor name)
    const filteredEntries = entries.filter((item: any) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        return (
            (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(query)) ||
            (item.unitToVisit && item.unitToVisit.toLowerCase().includes(query)) ||
            (item.visitorName && item.visitorName.toLowerCase().includes(query))
        );
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Vehicle Log</Text>
                <View style={{ width: 44 }} />
            </View>

            {/* Date Filters Row */}
            <View style={styles.filterBar}>
                <View style={styles.dateFilters}>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => setShowStartDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={15} color={theme.primary} />
                        <Text style={styles.filterText}>{startDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#64748b', fontSize: 13, fontWeight: '600' }}>to</Text>
                    <TouchableOpacity style={styles.filterBtn} onPress={() => setShowEndDatePicker(true)}>
                        <Ionicons name="calendar-outline" size={15} color={theme.primary} />
                        <Text style={styles.filterText}>{endDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search vehicle number or unit..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="characters"
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={18} color="#64748b" />
                    </TouchableOpacity>
                )}
            </View>

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
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredEntries}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isExpanded = expandedEntryId === item.id;
                        return (
                            <TouchableOpacity 
                                style={[styles.entryCard, isExpanded && styles.entryCardExpanded]}
                                onPress={() => setExpandedEntryId(isExpanded ? null : item.id)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.entryMain}>
                                    {/* Vehicle Plate Badge */}
                                    <View style={styles.plateContainer}>
                                        <View style={styles.plateIndicator} />
                                        <Text style={styles.plateText}>
                                            {item.vehicleNumber ? item.vehicleNumber.toUpperCase() : 'N/A'}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.entryInfo}>
                                        <Text style={styles.destinationText}>{item.unitToVisit || 'N/A'}</Text>
                                        <Text style={styles.visitorName}>{item.visitorName}</Text>
                                    </View>

                                    <View style={styles.timeBox}>
                                        <Text style={styles.timeText}>
                                            {new Date(item.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <View style={styles.statusRow}>
                                            <View style={[
                                                styles.statusDot, 
                                                { backgroundColor: item.outTime ? '#64748b' : '#10b981' }
                                            ]} />
                                            <Text style={[
                                                styles.statusText, 
                                                { color: item.outTime ? '#64748b' : '#10b981' }
                                            ]}>
                                                {item.outTime ? 'EXITED' : 'INSIDE'}
                                            </Text>
                                            <Ionicons 
                                                name={isExpanded ? "chevron-up" : "chevron-down"} 
                                                size={12} 
                                                color="#64748b" 
                                                style={{ marginLeft: 6 }}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {isExpanded && (
                                    <View style={styles.expandedDetails}>
                                        <View style={styles.divider} />
                                        
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Category</Text>
                                            <Text style={styles.detailValue}>{item.category || 'General Visitor'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Phone Number</Text>
                                            <Text style={styles.detailValue}>{item.phone || 'Not Provided'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>In-Time</Text>
                                            <Text style={styles.detailValue}>{new Date(item.inTime).toLocaleString()}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Out-Time</Text>
                                            <Text style={[styles.detailValue, !item.outTime && { color: '#10b981', fontWeight: 'bold' }]}>
                                                {item.outTime ? new Date(item.outTime).toLocaleString() : 'Still inside'}
                                            </Text>
                                        </View>

                                        {item.purpose && (
                                            <View style={styles.detailRow}>
                                                <Text style={styles.detailLabel}>Purpose</Text>
                                                <Text style={styles.detailValue}>{item.purpose}</Text>
                                            </View>
                                        )}

                                        {item.description && (
                                            <View style={styles.detailRowCol}>
                                                <Text style={styles.detailLabel}>Description / Notes</Text>
                                                <Text style={styles.detailDesc}>{item.description}</Text>
                                            </View>
                                        )}

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Gatepass ID</Text>
                                            <Text style={styles.detailValue}>{item.gatepassId || 'Manual Entry'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Security Staff</Text>
                                            <Text style={styles.detailValue}>{item.loggedBy}</Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="car-sport-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Vehicle Logs</Text>
                            <Text style={styles.emptySub}>No vehicle entries recorded for the selected dates.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 15 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    
    filterBar: { paddingHorizontal: 20, marginBottom: 15 },
    dateFilters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    filterText: { color: '#2D2445', fontSize: 13, fontWeight: '700' },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 20, paddingHorizontal: 15, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 15 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 50, color: '#2D2445', fontSize: 14, fontWeight: '600' },

    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    entryCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    entryCardExpanded: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' },
    entryMain: { flexDirection: 'row', alignItems: 'center' },
    
    // License Plate style
    plateContainer: { backgroundColor: '#1e293b', borderLeftWidth: 4, borderLeftColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    plateIndicator: { position: 'absolute', left: 4, top: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: '#f59e0b' },
    plateText: { color: '#f8fafc', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    
    entryInfo: { flex: 1, marginLeft: 16 },
    destinationText: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    visitorName: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    
    timeBox: { alignItems: 'flex-end' },
    timeText: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    
    expandedDetails: { marginTop: 15 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    detailRowCol: { flexDirection: 'column', paddingVertical: 6 },
    detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    detailValue: { fontSize: 13, color: '#f8fafc', fontWeight: '700' },
    detailDesc: { fontSize: 13, color: '#cbd5e1', marginTop: 4, lineHeight: 18 },
    
    emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445', marginTop: 15 },
    emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 8 },
});
