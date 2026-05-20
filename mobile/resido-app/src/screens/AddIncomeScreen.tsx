import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function AddIncomeScreen() {
    const router = useRouter();
    const [source, setSource] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!source || !amount) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            await mySpaceApi.addIncome({
                source,
                amount: parseFloat(amount),
                date
            });
            Alert.alert('Success', 'Income added successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to add income', error);
            Alert.alert('Error', 'Failed to save income. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Income</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Income Source</Text>
                        <View style={styles.inputWrapper}>
                            <FontAwesome5 name="wallet" size={16} color="#4c1d95" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="e.g. Monthly Salary, Freelance"
                                placeholderTextColor="#64748b"
                                value={source}
                                onChangeText={setSource}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Amount (₹)</Text>
                        <View style={styles.inputWrapper}>
                            <FontAwesome5 name="rupee-sign" size={16} color="#10b981" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="calendar-outline" size={20} color="#4c1d95" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                value={date}
                                onChangeText={setDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.saveBtnText}>Save Income</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#23272a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    
    formCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 10, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, height: 56, fontSize: 16, color: '#fff', fontWeight: '600' },
    
    saveBtn: { backgroundColor: '#4c1d95', height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, gap: 10, shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
