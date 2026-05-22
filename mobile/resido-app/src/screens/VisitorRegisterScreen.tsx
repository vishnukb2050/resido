import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
    const [printing, setPrinting] = useState(false);

    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

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

    const handleExportPDF = async () => {
        if (entries.length === 0) {
            Alert.alert('No Entries', 'There are no visitor entries to export for the selected date range.');
            return;
        }

        setPrinting(true);
        try {
            const htmlContent = `
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; background-color: #ffffff; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
    .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
    .meta-grid { display: flex; justify-content: space-between; margin-top: 15px; font-size: 13px; color: #475569; }
    .meta-item { background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 10px; font-weight: 600; }
    td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
    .badge-inside { background-color: #dcfce7; color: #15803d; }
    .badge-exited { background-color: #f1f5f9; color: #475569; }
    .badge-category { background-color: #dbeafe; color: #1d4ed8; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
    .detail-notes { font-size: 11px; color: #64748b; margin-top: 4px; background: #f1f5f9; padding: 4px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">Resido - Visitor Register Report</h1>
    <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>
    <div class="meta-grid">
      <div class="meta-item"><strong>Date Range:</strong> ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</div>
      <div class="meta-item"><strong>Category:</strong> ${category}</div>
      <div class="meta-item"><strong>Total Records:</strong> ${entries.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">No.</th>
        <th style="width: 30%;">Visitor Details</th>
        <th style="width: 35%;">Purpose & Notes</th>
        <th style="width: 20%;">Timestamps</th>
        <th style="width: 10%;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map((item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${item.visitorName}</strong><br/>
            ${item.phone || 'No phone'}<br/>
            Unit: ${item.unitToVisit}<br/>
            ${item.vehicleNumber ? `<span style="font-size:10px; color:#475569; background:#e2e8f0; padding:1px 4px; border-radius:3px;">Vehicle: ${item.vehicleNumber}</span>` : ''}
          </td>
          <td>
            <span class="badge badge-category">${item.category || 'General'}</span><br/>
            <strong>Purpose:</strong> ${item.purpose || 'N/A'}<br/>
            ${item.description ? `<div class="detail-notes"><strong>Notes:</strong> ${item.description}</div>` : ''}
            <span style="font-size: 10px; color: #94a3b8; display: block; margin-top: 4px;">
              Logged by: ${item.loggedBy} ${item.gatepassId ? `• GP Ref: ${item.gatepassId}` : ''}
            </span>
          </td>
          <td>
            <strong>In:</strong> ${new Date(item.inTime).toLocaleString()}<br/>
            <strong>Out:</strong> ${item.outTime ? new Date(item.outTime).toLocaleString() : '—'}
          </td>
          <td>
            <span class="badge ${item.outTime ? 'badge-exited' : 'badge-inside'}">
              ${item.outTime ? 'EXITED' : 'INSIDE'}
            </span>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">
    <p>Confidential - Resido Security Management System © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Visitor_Register_Report_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`,
                UTI: 'com.adobe.pdf'
            });
        } catch (e) {
            console.error('Failed to export PDF', e);
            Alert.alert('Export Failed', 'An error occurred while generating the PDF.');
        } finally {
            setPrinting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visitor Register</Text>
                <View style={styles.headerActions}>
                    {isAdmin && (
                        <TouchableOpacity 
                            style={styles.pdfBtn} 
                            onPress={handleExportPDF}
                            disabled={printing}
                        >
                            {printing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="download-outline" size={22} color="#fff" />
                            )}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-visitor')}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
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
                <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isExpanded = expandedEntryId === item.id;
                        return (
                            <TouchableOpacity 
                                style={[styles.entryCard, isExpanded && styles.entryCardExpanded]}
                                onPress={() => setExpandedEntryId(isExpanded ? null : item.id)}
                                activeOpacity={0.7}
                            >
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
                                        <View style={styles.statusRow}>
                                            <Text style={styles.statusText}>{item.outTime ? 'EXITED' : 'INSIDE'}</Text>
                                            <Ionicons 
                                                name={isExpanded ? "chevron-up" : "chevron-down"} 
                                                size={12} 
                                                color="#94a3b8" 
                                                style={{ marginLeft: 4 }}
                                            />
                                        </View>
                                    </View>
                                </View>
                                
                                {item.vehicleNumber && !isExpanded && (
                                    <View style={styles.entryExtra}>
                                        <Ionicons name="car-outline" size={14} color="#64748b" />
                                        <Text style={styles.extraText}>{item.vehicleNumber}</Text>
                                    </View>
                                )}

                                {isExpanded && (
                                    <View style={styles.expandedDetails}>
                                        <View style={styles.divider} />
                                        
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Category</Text>
                                            <Text style={styles.detailValue}>{item.category || 'General Visitor'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Destination</Text>
                                            <Text style={styles.detailValue}>{item.unitToVisit || 'N/A'}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Vehicle No.</Text>
                                            <Text style={styles.detailValue}>{item.vehicleNumber || 'No vehicle logged'}</Text>
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

                                        {item.description && (
                                            <View style={styles.detailRowCol}>
                                                <Text style={styles.detailLabel}>Description / Notes</Text>
                                                <Text style={styles.detailDesc}>{item.description}</Text>
                                            </View>
                                        )}

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Security Staff ID</Text>
                                            <Text style={styles.detailValue}>{item.loggedBy}</Text>
                                        </View>

                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Gatepass Ref</Text>
                                            <Text style={styles.detailValue}>{item.gatepassId || 'Manual Entry'}</Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    }}
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
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    pdfBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
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
    entryCardExpanded: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
    entryMain: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    entryInfo: { flex: 1, marginLeft: 15 },
    visitorName: { fontSize: 16, fontWeight: '800', color: '#fff' },
    entrySub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    entryPurpose: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    timeBox: { alignItems: 'flex-end' },
    timeText: { fontSize: 14, fontWeight: '900', color: '#fff' },
    statusText: { fontSize: 9, fontWeight: '900', color: '#10b981', letterSpacing: 1 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    entryExtra: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 10 },
    extraText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
    
    expandedDetails: { marginTop: 15 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 12 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    detailRowCol: { flexDirection: 'column', paddingVertical: 6 },
    detailLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    detailValue: { fontSize: 13, color: '#f8fafc', fontWeight: '700' },
    detailDesc: { fontSize: 13, color: '#cbd5e1', marginTop: 4, lineHeight: 18 },
    
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10 },
});
