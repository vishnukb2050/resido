import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function AddTransactionScreen() {
    const router = useRouter();
    const [amount, setAmount] = useState('2,350');
    const [category, setCategory] = useState('Groceries');
    const [date, setDate] = useState('May 13, 2025');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [desc, setDesc] = useState('Monthly grocery shopping');
    const [tags, setTags] = useState(['Home', 'Monthly']);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Expense</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.saveBtn}>
                    <Ionicons name="checkmark" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Upload Bill */}
                <View style={styles.uploadCard}>
                    <View style={styles.uploadIconBox}>
                        <Ionicons name="document-text-outline" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.uploadTitle}>Upload Bill <Text style={{ color: '#64748b' }}>(Optional)</Text></Text>
                        <Text style={styles.uploadSub}>JPG, PNG, PDF upto 10MB</Text>
                    </View>
                    <TouchableOpacity style={styles.uploadBtn}><Text style={styles.uploadBtnText}>Upload</Text></TouchableOpacity>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Amount</Text>
                    <View style={styles.amountInputRow}>
                        <Text style={styles.currency}>₹</Text>
                        <TextInput 
                            style={styles.amountInput}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Selectors */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <TouchableOpacity style={styles.selector}>
                        <View style={[styles.selectorIcon, { backgroundColor: '#10b981' }]}>
                            <FontAwesome5 name="shopping-basket" size={14} color="#fff" />
                        </View>
                        <Text style={styles.selectorText}>{category}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date</Text>
                    <TouchableOpacity style={styles.selector}>
                        <Text style={styles.selectorText}>{date}</Text>
                        <Ionicons name="calendar-outline" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Payment Method</Text>
                    <TouchableOpacity style={styles.selector}>
                        <Text style={styles.selectorText}>{paymentMethod}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description (Optional)</Text>
                    <TextInput 
                        style={styles.descInput}
                        value={desc}
                        onChangeText={setDesc}
                        placeholder="Add details..."
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </View>

                {/* Tags */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Add Tags (Optional)</Text>
                    <View style={styles.tagsRow}>
                        {tags.map(tag => (
                            <View key={tag} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addTagBtn}>
                            <Text style={styles.addTagText}>+ Add Tag</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e222b' },
    header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    saveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    
    scrollContent: { padding: 20 },
    uploadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    uploadIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    uploadTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    uploadSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
    uploadBtn: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    uploadBtnText: { color: '#4c1d95', fontSize: 13, fontWeight: '800' },

    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 12 },
    amountInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 20, height: 64, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    currency: { fontSize: 22, fontWeight: '900', color: '#fff', marginRight: 10 },
    amountInput: { flex: 1, fontSize: 22, fontWeight: '900', color: '#fff' },

    selector: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    selectorIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    selectorText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#fff' },

    descInput: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 16, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', minHeight: 100, textAlignVertical: 'top' },

    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tag: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    tagText: { color: '#4c1d95', fontSize: 13, fontWeight: '700' },
    addTagBtn: { paddingHorizontal: 16, paddingVertical: 8 },
    addTagText: { color: '#4c1d95', fontSize: 13, fontWeight: '700' }
});
