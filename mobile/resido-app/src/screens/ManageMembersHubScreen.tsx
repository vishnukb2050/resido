import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ManageMembersHubScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Community</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Select Category</Text>
                
                <HubTile 
                    icon="shield-half" 
                    title="Manage Staff" 
                    sub="Security, Maintenance, Cleaning, etc."
                    color="#8b5cf6"
                    onPress={() => router.push({ pathname: '/member-list', params: { role: 'STAFF_GROUP' } })}
                />

                <HubTile 
                    icon="home" 
                    title="Manage Residents" 
                    sub="Apartment owners and tenants"
                    color="#8b5cf6"
                    onPress={() => router.push({ pathname: '/member-list', params: { role: 'RESIDENT' } })}
                />

                <HubTile 
                    icon="shield-checkmark" 
                    title="Manage Admin Staff" 
                    sub="Staff with administrative access"
                    color="#8b5cf6"
                    onPress={() => router.push({ pathname: '/member-list', params: { role: 'ADMIN_STAFF' } })}
                />

                <HubTile 
                    icon="people" 
                    title="Manage Members" 
                    sub="General community members"
                    color="#8b5cf6"
                    onPress={() => router.push({ pathname: '/member-list', params: { role: 'MEMBER' } })}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

function HubTile({ icon, title, sub, color, onPress }: any) {
    return (
        <TouchableOpacity style={styles.tile} onPress={onPress}>
            <View style={[styles.tileIconBox, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <View style={styles.tileTextCol}>
                <Text style={styles.tileTitle}>{title}</Text>
                <Text style={styles.tileSub}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.1)" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },

    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    content: { padding: 24, gap: 20 },
    sectionTitle: { fontSize: 13, color: '#9A8EBA', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    tile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 20, borderRadius: 28, borderWidth: 1, borderColor: '#D4C9E8' },
    tileIconBox: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    tileTextCol: { flex: 1, marginLeft: 20 },
    tileTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },
    tileSub: { fontSize: 13, color: '#7A6B9C', marginTop: 4, fontWeight: '600' }
});
