import React from 'react';
import {
    View, Text, TouchableOpacity, FlatList,
    StyleSheet, Alert, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';

const ROLE_ICONS: Record<string, string> = {
    APARTMENT_ADMIN: '🏢',
    RESIDENT: '🏠',
    CLEANING_STAFF: '🧹',
    CARETAKER: '🔧',
    SECURITY: '🛡️',
    ACCOUNTS_STAFF: '📊',
    MAINTENANCE_STAFF: '⚙️',
};

export default function WorkspaceSelectScreen() {
    const { workspaces, setActiveWorkspace, token } = useAuthStore();
    const router = useRouter();

    const handleSelect = async (ws: any) => {
        try {
            const res = await authApi.switchWorkspace(ws.tenantId, ws.role);
            const { accessToken } = res.data;
            await SecureStore.setItemAsync('resido_token', accessToken);
            await SecureStore.setItemAsync('resido_tenant_id', ws.tenantId);
            setActiveWorkspace(ws, accessToken);
            router.replace('/(app)/home');
        } catch {
            Alert.alert('Error', 'Failed to switch workspace');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select your apartment</Text>
            <Text style={styles.subtitle}>Choose which apartment to manage</Text>
            
            <TouchableOpacity 
                style={styles.createBtn} 
                onPress={() => router.push('/create-community' as any)}
            >
                <Text style={styles.createBtnText}>+ Create a Community</Text>
            </TouchableOpacity>

            <View style={{ gap: 12 }}>
                {/* Default Personal Workspace */}
                <TouchableOpacity 
                    style={[styles.card, { borderColor: '#1d4ed8', borderWidth: 1, backgroundColor: 'rgba(37,99,235,0.05)' }]} 
                    onPress={() => {
                        setActiveWorkspace(null as any, token!);
                        router.replace('/(app)/home');
                    }}
                >
                    <Text style={styles.icon}>👤</Text>
                    <View style={styles.info}>
                        <Text style={styles.name}>Resido Personal</Text>
                        <Text style={styles.role}>Default Space</Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>

                <FlatList
                    data={workspaces}
                    keyExtractor={(item) => item.tenantId}
                    scrollEnabled={false}
                    contentContainerStyle={{ gap: 12 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
                            {item.photoUrl ? (
                                <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
                            ) : (
                                <Text style={styles.icon}>{ROLE_ICONS[item.role] || '🏠'}</Text>
                            )}
                            <View style={styles.info}>
                                <Text style={styles.name}>{item.tenantName}</Text>
                                <Text style={styles.role}>{item.role.replace('_', ' ')}</Text>
                            </View>
                            <Text style={styles.arrow}>→</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000', padding: 24, paddingTop: 60 },
    title: { fontSize: 26, fontWeight: '800', color: '#e2e8f0', letterSpacing: -0.5, marginBottom: 6 },
    subtitle: { fontSize: 14, color: '#64748b', marginBottom: 28 },
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: '#1e1e2e', borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    icon: { fontSize: 28 },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: '#e2e8f0' },
    role: { fontSize: 12, color: '#1d4ed8', marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    arrow: { fontSize: 18, color: '#64748b' },
    createBtn: {
        backgroundColor: 'rgba(37,99,235,0.1)',
        borderWidth: 1,
        borderColor: '#1d4ed8',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
        borderStyle: 'dashed'
    },
    createBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 16 },
});
