import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ManageResidentsHub() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Residents</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.subtitle}>Configure your community structure before adding residents.</Text>

                <View style={styles.menuList}>
                    <MenuCard 
                        icon="business" 
                        title="Create Blocks" 
                        description="Add new blocks or buildings to your community"
                        color="#d97706"
                        bg="#FEF3F2"
                        onPress={() => router.push('/manage-blocks?mode=BLOCK')}
                    />

                    <MenuCard 
                        icon="home" 
                        title="Create Units / Addresses" 
                        description="Add apartment numbers or house addresses under blocks"
                        color="#4c1d95"
                        bg="#E8F5F5"
                        onPress={() => router.push('/manage-blocks?mode=UNIT')}
                    />


                    <MenuCard 
                        icon="person-add" 
                        title="Add Resident" 
                        description="Register a new resident and assign them to a block and unit"
                        color="#3182ce"
                        bg="#EBF8FF"
                        onPress={() => router.push('/create-member?mode=RESIDENT')}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function MenuCard({ icon, title, description, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={[styles.cardIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={28} color={color} />
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDesc}>{description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1 },
    scrollContent: { padding: 20 },
    subtitle: { fontSize: 14, color: '#64748b', fontWeight: '600', marginBottom: 25 },
    menuList: { gap: 15 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    cardIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
    cardDesc: { fontSize: 12, color: '#64748b', fontWeight: '600', lineHeight: 16 }
});
