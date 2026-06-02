import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi, residentApi, authApi } from '../services/api';

export default function AddResidentScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [units, setUnits] = useState([]);
    const [filteredUnits, setFilteredUnits] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [addressQuery, setAddressQuery] = useState('');
    const [showUnits, setShowUnits] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
    });

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            const res = await residentApi.getUnits();
            setUnits(res.data);
        } catch (e) {
            console.error('Fetch units failed', e);
        }
    };

    const handleSearch = (text: string) => {
        setAddressQuery(text);
        if (text.length > 0) {
            const filtered = units.filter((u: any) => 
                u.number.toLowerCase().includes(text.toLowerCase()) || 
                u.block?.name.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredUnits(filtered);
            setShowUnits(true);
        } else {
            setShowUnits(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.phone || !selectedUnit) {
            Alert.alert('Error', 'Name, Phone, and Address are required');
            return;
        }

        setLoading(true);
        try {
            // In Resido, residents are members linked to a family which is linked to a unit
            // We pass the unitId so that the backend can link this member to a Family of this Unit
            await residentApi.createMember({
                ...formData,
                role: 'RESIDENT',
                tenantId: activeWorkspace?.tenantId,
                unitId: selectedUnit.id,
            });

            await authApi.syncMembership({
                phone: formData.phone,
                tenantId: activeWorkspace?.tenantId,
                tenantName: activeWorkspace?.tenantName,
                role: 'RESIDENT',
                name: formData.name,
            });

            try {
                const res = await authApi.getWorkspaces();
                useAuthStore.getState().setWorkspaces(res.data);
                if (activeWorkspace) {
                    const swRes = await authApi.switchWorkspace(activeWorkspace.tenantId, activeWorkspace.role);
                    useAuthStore.getState().setActiveWorkspace(swRes.data.workspace, swRes.data.accessToken);
                }
            } catch (err) {
                console.log('Failed to refresh workspaces', err);
            }

            Alert.alert('Success', 'Resident added successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to add resident');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Resident</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Search Unit / Address</Text>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color="#64748b" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="e.g. 1A, Block B..."
                                placeholderTextColor="#64748b"
                                value={addressQuery}
                                onChangeText={handleSearch}
                                onFocus={() => addressQuery.length > 0 && setShowUnits(true)}
                            />
                        </View>
                        
                        {showUnits && (
                            <View style={styles.dropdown}>
                                {filteredUnits.length > 0 ? (
                                    filteredUnits.map((u: any) => (
                                        <TouchableOpacity 
                                            key={u.id} 
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedUnit(u);
                                                setAddressQuery(`${u.number} (${u.block?.name || 'Main'})`);
                                                setShowUnits(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownItemText}>{u.number}</Text>
                                            <Text style={styles.dropdownSubText}>{u.block?.name}</Text>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <View style={styles.dropdownItem}><Text style={styles.dropdownSubText}>No matches found</Text></View>
                                )}
                            </View>
                        )}

                        {selectedUnit && (
                            <View style={styles.selectedBadge}>
                                <Ionicons name="home" size={16} color="#10b981" />
                                <Text style={styles.selectedText}>Selected: {selectedUnit.number}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Resident Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#64748b"
                            value={formData.name}
                            onChangeText={(t) => setFormData({...formData, name: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Mobile Number"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={formData.phone}
                            onChangeText={(t) => setFormData({...formData, phone: t})}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Resident</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24 },
    form: { gap: 20 },
    inputGroup: { gap: 10 },
    label: { fontSize: 12, color: '#9A8EBA', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', paddingHorizontal: 15, height: 56 },
    searchInput: { flex: 1, marginLeft: 10, color: '#2D2445', fontSize: 16, fontWeight: '600' },
    dropdown: { backgroundColor: '#ffffff', borderRadius: 16, marginTop: 4, padding: 8, borderWidth: 1, borderColor: '#C4B5DC', zIndex: 1000 },
    dropdownItem: { padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownItemText: { color: '#2D2445', fontSize: 15, fontWeight: '700' },
    dropdownSubText: { color: '#7A6B9C', fontSize: 12, fontWeight: '600' },
    selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 12, marginTop: 5 },
    selectedText: { color: '#10b981', fontSize: 13, fontWeight: '800' },
    input: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', color: '#2D2445', padding: 18, fontSize: 16, fontWeight: '600' },
    submitBtn: { backgroundColor: '#10b981', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 20 },
    submitText: { color: '#2D2445', fontWeight: '900', fontSize: 16 }
});
