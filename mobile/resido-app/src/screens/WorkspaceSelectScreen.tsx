import React from 'react';
import {
    View, Text, TouchableOpacity, FlatList,
    StyleSheet, Alert, Image, Modal, Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

const ROLE_ICONS: Record<string, string> = {
    APARTMENT_ADMIN: '🏢',
    RESIDENT: '🏠',
    CLEANING_STAFF: '🧹',
    CARETAKER: '🔧',
    SECURITY: '🛡️',
    SECURITY_STAFF: '🛡️',
    ACCOUNTS_STAFF: '📊',
    MAINTENANCE_STAFF: '⚙️',
    ADMIN_STAFF: '💼',
    STAFF: '👤',
    SERVICE_STAFF: '🛠️',
};

export default function WorkspaceSelectScreen() {
    const { workspaces, setActiveWorkspace, token } = useAuthStore();
    const router = useRouter();

    const [selectedWorkspace, setSelectedWorkspace] = React.useState<any>(null);
    const [modalVisible, setModalVisible] = React.useState(false);

    const handleWorkspacePress = (ws: any) => {
        if (ws.roles && ws.roles.length > 1) {
            setSelectedWorkspace(ws);
            setModalVisible(true);
        } else {
            handleSelect(ws, ws.roles?.[0] || ws.role);
        }
    };

    const handleSelect = async (ws: any, selectedRole: string) => {
        try {
            setModalVisible(false);
            const res = await authApi.switchWorkspace(ws.tenantId, selectedRole);
            const { accessToken, workspace } = res.data;
            await SecureStore.setItemAsync('resido_token', accessToken);
            await SecureStore.setItemAsync('resido_tenant_id', ws.tenantId);
            setActiveWorkspace(workspace, accessToken);
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
                    style={[styles.card, { borderColor: '#8b5cf6', borderWidth: 1, backgroundColor: 'rgba(37,99,235,0.05)' }]} 
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
                        <TouchableOpacity style={styles.card} onPress={() => handleWorkspacePress(item)}>
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

            {/* Premium Role Selection Sheet Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>Choose your role</Text>
                            <Text style={styles.modalSubtitle}>
                                Select which role to use in {selectedWorkspace?.tenantName}
                            </Text>
                        </View>

                        <FlatList
                            data={selectedWorkspace?.roles || []}
                            keyExtractor={(role) => role}
                            contentContainerStyle={styles.roleList}
                            renderItem={({ item: role }) => (
                                <TouchableOpacity
                                    style={styles.roleOption}
                                    onPress={() => handleSelect(selectedWorkspace, role)}
                                >
                                    <View style={styles.roleIconBox}>
                                        <Text style={styles.roleIcon}>{ROLE_ICONS[role] || '🏠'}</Text>
                                    </View>
                                    <View style={styles.roleInfoCol}>
                                        <Text style={styles.roleOptionText}>
                                            {role.replace(/_/g, ' ')}
                                        </Text>
                                        <Text style={styles.roleDesc}>
                                            Access features for {role.replace(/_/g, ' ').toLowerCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.roleArrow}>→</Text>
                                </TouchableOpacity>
                            )}
                        />

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF', padding: 24, paddingTop: 60 },
    title: { fontSize: 26, fontWeight: '800', color: '#9A8EBA', letterSpacing: -0.5, marginBottom: 6 },
    subtitle: { fontSize: 14, color: '#7A6B9C', marginBottom: 28 },
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
        borderWidth: 1, borderColor: '#D4C9E8',
    },
    icon: { fontSize: 28 },
    avatar: { width: 36, height: 36, borderRadius: 18 },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: '#9A8EBA' },
    role: { fontSize: 12, color: '#8b5cf6', marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    arrow: { fontSize: 18, color: '#7A6B9C' },
    createBtn: {
        backgroundColor: 'rgba(37,99,235,0.1)',
        borderWidth: 1,
        borderColor: '#8b5cf6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
        borderStyle: 'dashed'
    },
    createBtnText: { color: '#8b5cf6', fontWeight: '700', fontSize: 16 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#111118',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    modalHeader: {
        alignItems: 'center',
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        marginTop: 10,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#9A8EBA',
        marginBottom: 6,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#7A6B9C',
        textAlign: 'center',
        marginBottom: 24,
    },
    roleList: {
        gap: 12,
        marginBottom: 20,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    roleIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(37,99,235,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    roleIcon: {
        fontSize: 20,
    },
    roleInfoCol: {
        flex: 1,
    },
    roleOptionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#9A8EBA',
    },
    roleDesc: {
        fontSize: 11,
        color: '#7A6B9C',
        marginTop: 2,
    },
    roleArrow: {
        fontSize: 16,
        color: '#5B4B8A',
    },
    cancelBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    cancelBtnText: {
        color: '#9A8EBA',
        fontSize: 15,
        fontWeight: '600',
    },
});
