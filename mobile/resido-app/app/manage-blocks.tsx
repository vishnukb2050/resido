import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { communityApi } from '../src/services/api';

export default function ManageBlocksScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const mode = params.mode || 'BLOCK'; // Default to BLOCK

    const [loading, setLoading] = useState(true);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    
    const [selectedBlockForUnit, setSelectedBlockForUnit] = useState<any>(null);

    const [newBlockName, setNewBlockName] = useState('');
    const [newUnitNumber, setNewUnitNumber] = useState('');

    useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            setLoading(true);
            const { data } = await communityApi.getBlocks();
            setBlocks(data || []);
            if (data && data.length > 0) {
                setSelectedBlockForUnit(data[0]); // Default to first block
                fetchUnits(data[0].id);
            }
        } catch (error) {
            console.error('Failed to fetch blocks:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnits = async (blockId: string) => {
        try {
            setLoading(true);
            const { data } = await communityApi.getUnits(blockId);
            setUnits(data || []);
        } catch (error) {
            console.error('Failed to fetch units:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBlock = async () => {
        if (!newBlockName.trim()) {
            Alert.alert('Error', 'Please enter a block name');
            return;
        }
        try {
            setLoading(true);
            await communityApi.createBlock({ name: newBlockName.trim() });
            setNewBlockName('');
            await fetchBlocks();
            Alert.alert('Success', 'Block created successfully');
        } catch (error) {
            console.error('Failed to create block:', error);
            Alert.alert('Error', 'Failed to create block');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUnit = async () => {
        if (!newUnitNumber.trim()) {
            Alert.alert('Error', 'Please enter a unit number');
            return;
        }
        if (!selectedBlockForUnit) {
            Alert.alert('Error', 'Please select a block first');
            return;
        }
        
        try {
            setLoading(true);
            await communityApi.createUnit({ 
                number: newUnitNumber.trim(), 
                blockId: selectedBlockForUnit.id 
            });
            setNewUnitNumber('');
            await fetchUnits(selectedBlockForUnit.id);
            Alert.alert('Success', 'Unit created successfully');
        } catch (error) {
            console.error('Failed to create unit:', error);
            Alert.alert('Error', 'Failed to create unit');
        } finally {
            setLoading(false);
        }
    };

    const handleBlockSelectForUnit = (block: any) => {
        setSelectedBlockForUnit(block);
        fetchUnits(block.id);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {mode === 'BLOCK' ? 'Create Blocks' : 'Create Units / Addresses'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {mode === 'BLOCK' && (
                    <>
                        {/* Section 1: Add Block */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>Add New Block</Text>
                            <View style={styles.addForm}>
                                <TextInput 
                                    style={styles.input} 
                                    value={newBlockName} 
                                    onChangeText={setNewBlockName}
                                    placeholder="Enter block name (e.g. Block A)"
                                    placeholderTextColor="#94a3b8"
                                />
                                <TouchableOpacity style={styles.addBtn} onPress={handleCreateBlock}>
                                    <Text style={styles.addBtnText}>Add Block</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Section 2: List of Blocks */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>Existing Blocks</Text>
                            {loading ? (
                                <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 20 }} />
                            ) : (
                                <View style={styles.list}>
                                    {blocks.map(block => (
                                        <View key={block.id} style={styles.card}>
                                            <View style={styles.cardIconBox}>
                                                <Ionicons name="business" size={24} color="#0d9488" />
                                            </View>
                                            <View style={styles.cardInfo}>
                                                <Text style={styles.cardTitle}>{block.name}</Text>
                                                <Text style={styles.cardSub}>{block._count?.units || 0} Units</Text>
                                            </View>
                                        </View>
                                    ))}
                                    {blocks.length === 0 && (
                                        <View style={styles.empty}>
                                            <Text style={styles.emptyText}>No blocks added yet.</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </>
                )}

                {mode === 'UNIT' && (
                    <>
                        {/* Section 1: Add Unit under Block */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>Select Block & Add Units</Text>
                            
                            <Text style={styles.label}>Select Block</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                {blocks.map(block => (
                                    <TouchableOpacity 
                                        key={block.id} 
                                        style={[styles.chip, selectedBlockForUnit?.id === block.id && styles.chipActive]}
                                        onPress={() => handleBlockSelectForUnit(block)}
                                    >
                                        <Text style={[styles.chipText, selectedBlockForUnit?.id === block.id && styles.chipTextActive]}>
                                            {block.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.addForm}>
                                <TextInput 
                                    style={styles.input} 
                                    value={newUnitNumber} 
                                    onChangeText={setNewUnitNumber}
                                    placeholder="Enter unit/address (e.g. 101)"
                                    placeholderTextColor="#94a3b8"
                                />
                                <TouchableOpacity style={styles.addBtn} onPress={handleCreateUnit}>
                                    <Text style={styles.addBtnText}>Add Unit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Section 2: List of Units in Selected Block */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>
                                Units in {selectedBlockForUnit?.name || '...'}
                            </Text>
                            
                            {loading ? (
                                <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 20 }} />
                            ) : (
                                <View style={styles.list}>
                                    {units.map(unit => (
                                        <View key={unit.id} style={styles.card}>
                                            <View style={styles.cardIconBox}>
                                                <Ionicons name="home" size={24} color="#0d9488" />
                                            </View>
                                            <View style={styles.cardInfo}>
                                                <Text style={styles.cardTitle}>Unit {unit.number}</Text>
                                                <Text style={styles.cardSub}>
                                                    {unit.families?.reduce((acc: number, f: any) => acc + (f.members?.length || 0), 0) || 0} Members
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                    {units.length === 0 && (
                                        <View style={styles.empty}>
                                            <Text style={styles.emptyText}>No units added in this block yet.</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, padding: 20 },
    section: { marginBottom: 30 },
    sectionHeader: { fontSize: 18, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
    label: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
    
    addForm: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 15, height: 48, fontSize: 14, color: '#1e293b' },
    addBtn: { backgroundColor: '#0d9488', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
    addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
    chipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    chipTextActive: { color: '#fff' },
    
    list: { gap: 12 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    cardIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    cardSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' }
});
