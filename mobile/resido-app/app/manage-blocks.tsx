import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { communityApi } from '../src/services/api';

export default function ManageBlocksScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [currentStep, setCurrentStep] = useState(1); // 1: Blocks, 2: Units, 3: Members
    
    const [selectedBlock, setSelectedBlock] = useState<any>(null);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);

    useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            setLoading(true);
            const { data } = await communityApi.getBlocks();
            setBlocks(data || []);
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

    const handleBlockSelect = (block: any) => {
        setSelectedBlock(block);
        fetchUnits(block.id);
        setCurrentStep(2);
    };

    const handleUnitSelect = (unit: any) => {
        setSelectedUnit(unit);
        setCurrentStep(3);
    };

    const handleBack = () => {
        if (currentStep === 3) {
            setCurrentStep(2);
            setSelectedUnit(null);
        } else if (currentStep === 2) {
            setCurrentStep(1);
            setSelectedBlock(null);
            setUnits([]);
        } else {
            router.back();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {currentStep === 1 && "Blocks & Communities"}
                    {currentStep === 2 && `Units in ${selectedBlock?.name}`}
                    {currentStep === 3 && `Members in ${selectedUnit?.number}`}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0d9488" />
                </View>
            ) : (
                <ScrollView style={styles.content}>
                    {currentStep === 1 && (
                        <View style={styles.list}>
                            {blocks.map(block => (
                                <TouchableOpacity 
                                    key={block.id} 
                                    style={styles.card}
                                    onPress={() => handleBlockSelect(block)}
                                >
                                    <View style={styles.cardIconBox}>
                                        <Ionicons name="business" size={24} color="#0d9488" />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>{block.name}</Text>
                                        <Text style={styles.cardSub}>{block._count?.units || 0} Units</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {currentStep === 2 && (
                        <View style={styles.list}>
                            {units.map(unit => (
                                <TouchableOpacity 
                                    key={unit.id} 
                                    style={styles.card}
                                    onPress={() => handleUnitSelect(unit)}
                                >
                                    <View style={styles.cardIconBox}>
                                        <Ionicons name="home" size={24} color="#0d9488" />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>Unit {unit.number}</Text>
                                        <Text style={styles.cardSub}>
                                            {unit.families?.reduce((acc: number, f: any) => acc + (f.members?.length || 0), 0) || 0} Members
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {currentStep === 3 && (
                        <View style={styles.list}>
                            {selectedUnit?.families?.flatMap((f: any) => f.members || []).map((member: any) => (
                                <View key={member.id} style={styles.card}>
                                    <View style={styles.cardIconBox}>
                                        <Ionicons name="person" size={24} color="#0d9488" />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardTitle}>{member.name}</Text>
                                        <Text style={styles.cardSub}>{member.role} • {member.phone}</Text>
                                    </View>
                                </View>
                            ))}
                            {(!selectedUnit?.families || selectedUnit.families.flatMap((f: any) => f.members || []).length === 0) && (
                                <View style={styles.empty}>
                                    <Text style={styles.emptyText}>No members assigned to this unit.</Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, padding: 20 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { gap: 12 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
    cardIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5F5', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    cardSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    empty: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' }
});
