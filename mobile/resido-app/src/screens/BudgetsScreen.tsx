import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const BUDGETS = [
    { name: 'Groceries', spent: 12980, limit: 15000, percent: 86, color: '#10b981', icon: 'shopping-basket' },
    { name: 'Utilities', spent: 6490, limit: 7000, percent: 93, color: '#8b5cf6', icon: 'bolt' },
    { name: 'Shopping', spent: 4870, limit: 6000, percent: 81, color: '#ec4899', icon: 'shopping-bag' },
    { name: 'Transport', spent: 3250, limit: 4000, percent: 81, color: '#a78bfa', icon: 'car' },
    { name: 'Food & Dining', spent: 2600, limit: 3000, percent: 87, color: '#f43f5e', icon: 'utensils' },
    { name: 'Others', spent: 2260, limit: 3000, percent: 75, color: '#a78bfa', icon: 'ellipsis-h' },
];

export default function BudgetsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Budgets</Text>
                    <TouchableOpacity style={styles.iconBtn}><Ionicons name="add" size={24} color="#fff" /></TouchableOpacity>
                </View>

                <View style={styles.periodRow}>
                    <Text style={styles.periodText}>May 2025</Text>
                    <TouchableOpacity><Text style={styles.editText}>Edit Budget</Text></TouchableOpacity>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.listContainer}>
                    {BUDGETS.map((item) => (
                        <View key={item.name} style={styles.budgetCard}>
                            <View style={styles.budgetHeader}>
                                <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                                    <FontAwesome5 name={item.icon} size={16} color={item.color} />
                                </View>
                                <View style={styles.budgetTexts}>
                                    <Text style={styles.budgetName}>{item.name}</Text>
                                    <Text style={styles.budgetSub}>₹ {item.spent.toLocaleString()} / ₹ {item.limit.toLocaleString()}</Text>
                                </View>
                                <Text style={styles.budgetPercent}>{item.percent}%</Text>
                            </View>
                            
                            {/* Progress Bar */}
                            <View style={styles.progressBg}>
                                <View style={[styles.progressFill, { width: `${item.percent}%`, backgroundColor: item.color }]} />
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 20, backgroundColor: '#F8F5FF' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    
    periodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    periodText: { fontSize: 15, fontWeight: '700', color: '#2D2445' },
    editText: { fontSize: 13, color: '#8b5cf6', fontWeight: '700' },

    listContainer: { paddingHorizontal: 20, marginTop: 10 },
    budgetCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#D4C9E8' },
    budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    budgetTexts: { flex: 1, marginLeft: 16 },
    budgetName: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    budgetSub: { fontSize: 12, color: '#7A6B9C', marginTop: 4 },
    budgetPercent: { fontSize: 13, fontWeight: '800', color: '#9A8EBA' },

    progressBg: { height: 8, backgroundColor: '#F4EEFC', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 4 }
});
