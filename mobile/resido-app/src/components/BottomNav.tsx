import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

interface BottomNavProps {
    activeTab?: 'Home' | 'Chat' | 'Thread' | 'Flares' | 'Account';
}

export default function BottomNav({ activeTab }: BottomNavProps) {
    const router = useRouter();
    const { user } = useAuthStore();

    return (
        <View style={styles.bottomNav}>
            <NavItem 
                icon={activeTab === 'Home' ? 'home' : 'home-outline'} 
                label="Home" 
                active={activeTab === 'Home'} 
                onPress={() => router.push('/')} 
            />
            <NavItem 
                icon={activeTab === 'Chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} 
                label="Chat" 
                active={activeTab === 'Chat'} 
                onPress={() => router.push('/chat-list')} 
            />
            <NavItem 
                icon={activeTab === 'Thread' ? 'newspaper' : 'newspaper-outline'} 
                label="Thread" 
                active={activeTab === 'Thread'} 
                onPress={() => router.push('/blog')} 
            />
            <NavItem 
                icon={activeTab === 'Flares' ? 'play-circle' : 'play-circle-outline'} 
                label="Flares" 
                active={activeTab === 'Flares'} 
                onPress={() => router.push('/flares')} 
            />
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
                <View style={[styles.navProfileContainer, activeTab === 'Account' && styles.activeProfile]}>
                    {user?.profilePhoto ? (
                        <Image source={{ uri: user.profilePhoto }} style={styles.navAvatar} />
                    ) : (
                        <View style={styles.navAvatarPlaceholder}>
                            <Ionicons name="person" size={16} color={activeTab === 'Account' ? '#6366f1' : '#94a3b8'} />
                        </View>
                    )}
                </View>
                <Text style={[styles.navLabel, activeTab === 'Account' && styles.navLabelActive]}>Account</Text>
            </TouchableOpacity>
        </View>
    );
}

function NavItem({ icon, label, active, onPress }: any) {
    return (
        <TouchableOpacity style={styles.navItem} onPress={onPress}>
            <Ionicons name={icon} size={24} color={active ? '#6366f1' : '#1e293b'} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    bottomNav: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 85, 
        backgroundColor: '#fff', 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        alignItems: 'center', 
        paddingBottom: 20, 
        borderTopWidth: 1, 
        borderTopColor: '#f1f5f9', 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: -8 }, 
        shadowOpacity: 0.04, 
        shadowRadius: 15, 
        elevation: 20 
    },
    navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
    navLabel: { fontSize: 10, color: '#1e293b', marginTop: 4, fontWeight: '700' },
    navLabelActive: { color: '#6366f1' },
    navProfileContainer: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    activeProfile: { borderColor: '#6366f1', borderWidth: 2 },
    navAvatar: { width: '100%', height: '100%' },
    navAvatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
});
