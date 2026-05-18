import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

interface BottomNavProps {
    activeTab?: 'Home' | 'Flares' | 'Threads' | 'Chats' | 'Account';
}

export default function BottomNav({ activeTab }: BottomNavProps) {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const isMySpace = activeWorkspace === null;

    const themeStyles = {
        background: isMySpace || activeTab === 'Flares' ? '#000000' : '#fff',
        border: isMySpace || activeTab === 'Flares' ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
        activeIcon: '#0d9488',
        inactiveIcon: isMySpace || activeTab === 'Flares' ? 'rgba(255,255,255,0.4)' : '#64748b',
        activeLabel: '#0d9488',
        inactiveLabel: isMySpace || activeTab === 'Flares' ? 'rgba(255,255,255,0.4)' : '#64748b'
    };


    return (
        <View style={[styles.bottomNav, { backgroundColor: themeStyles.background, borderTopColor: themeStyles.border }]}>
            <NavItem 
                icon={activeTab === 'Home' ? 'home' : 'home-outline'} 
                label="Home" 
                active={activeTab === 'Home'} 
                onPress={() => router.push('/')}
                theme={themeStyles}
            />
            <NavItem 
                icon={activeTab === 'Chats' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} 
                label="Chat" 
                active={activeTab === 'Chats'} 
                onPress={() => router.push('/chat-list')}
                theme={themeStyles}
            />
            <NavItem 
                icon={activeTab === 'Threads' ? 'newspaper' : 'newspaper-outline'} 
                label="Thread" 
                active={activeTab === 'Threads'} 
                onPress={() => router.push('/thread')}
                theme={themeStyles}
            />
            <NavItem 
                icon={activeTab === 'Flares' ? 'play-circle' : 'play-circle-outline'} 
                label="Flares" 
                active={activeTab === 'Flares'} 
                onPress={() => router.push('/flares')}
                theme={themeStyles}
            />
            <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
                <View style={[
                    styles.navProfileContainer, 
                    { borderColor: isMySpace || activeTab === 'Flares' ? 'rgba(255,255,255,0.2)' : '#e2e8f0' },
                    activeTab === 'Account' && { borderColor: themeStyles.activeIcon, borderWidth: 2 }
                ]}>
                    {user?.profilePhoto ? (
                        <Image source={{ uri: user.profilePhoto }} style={styles.navAvatar} />
                    ) : (
                        <View style={[styles.navAvatarPlaceholder, (isMySpace || activeTab === 'Flares') && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <Ionicons 
                                name="person" 
                                size={16} 
                                color={activeTab === 'Account' ? themeStyles.activeIcon : themeStyles.inactiveIcon} 
                            />
                        </View>
                    )}
                </View>
                <Text style={[
                    styles.navLabel, 
                    { color: activeTab === 'Account' ? themeStyles.activeLabel : themeStyles.inactiveLabel }
                ]}>Account</Text>
            </TouchableOpacity>
        </View>
    );
}

function NavItem({ icon, label, active, onPress, theme }: any) {
    return (
        <TouchableOpacity style={styles.navItem} onPress={onPress}>
            <Ionicons 
                name={icon} 
                size={24} 
                color={active ? theme.activeIcon : theme.inactiveIcon} 
            />
            <Text style={[
                styles.navLabel, 
                { color: active ? theme.activeLabel : theme.inactiveLabel }
            ]}>{label}</Text>
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
        paddingBottom: 25, 
        borderTopWidth: 1, 
        borderTopColor: '#f1f5f9', 
        borderTopLeftRadius: 25, 
        borderTopRightRadius: 25, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: -8 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 15, 
        elevation: 20 
    },
    navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
    navLabel: { fontSize: 10, marginTop: 4, fontWeight: '700' },
    navProfileContainer: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
    navAvatar: { width: '100%', height: '100%' },
    navAvatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
});
