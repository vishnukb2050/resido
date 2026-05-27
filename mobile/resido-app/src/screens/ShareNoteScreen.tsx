import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ShareNoteScreen() {
    const router = useRouter();
    const { id, folderId, name, isFolder } = useLocalSearchParams();

    const handleSharePress = (targetType: 'CONTACT' | 'GROUP' | 'PROFILE') => {
        const pathname =
            targetType === 'CONTACT' ? '/select-contacts'
            : targetType === 'PROFILE' ? '/select-profiles'
            : '/select-groups';
        router.push({
            pathname,
            params: {
                shareType: 'NOTE',
                itemId: id || folderId,
                isFolder: isFolder === 'true' ? 'true' : 'false',
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Share Note</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Note Preview Card */}
                <View style={styles.noteCard}>
                    <Text style={styles.noteTitle}>{name || 'Untitled Note'}</Text>
                    <View style={styles.folderRow}>
                        <MaterialCommunityIcons name="folder" size={14} color="#f59e0b" />
                        <Text style={styles.folderName}>{isFolder === 'true' ? 'Folder' : 'Note'}</Text>
                    </View>
                </View>

                {/* Share Options */}
                <Text style={styles.sectionTitle}>Share with</Text>
                <ShareOption
                    icon="person-outline"
                    title="Contacts"
                    desc="Pick from your contacts"
                    onPress={() => handleSharePress('CONTACT')}
                />
                <ShareOption
                    icon="at-outline"
                    title="Profile names"
                    desc="Search anyone by their profile name"
                    onPress={() => handleSharePress('PROFILE')}
                />
                <ShareOption
                    icon="people-outline"
                    title="Groups"
                    desc="Share with your groups"
                    onPress={() => handleSharePress('GROUP')}
                />

                {/* People with access (Static for now) */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>People with access</Text>
                <AccessItem 
                    name="Aman Verma" 
                    role="Owner" 
                    image="https://i.pravatar.cc/100?u=aman" 
                    isOwner 
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const ShareOption = ({ icon, title, desc, onPress }: any) => (
    <TouchableOpacity style={styles.shareOption} onPress={onPress}>
        <View style={styles.shareIconBox}>
            <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <View style={styles.shareContent}>
            <Text style={styles.shareTitle}>{title}</Text>
            <Text style={styles.shareSub}>{desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#64748b" />
    </TouchableOpacity>
);

const AccessItem = ({ name, role, image, isOwner, isGroup }: any) => (
    <View style={styles.accessItem}>
        {isGroup ? (
            <View style={styles.groupIconBox}>
                <Ionicons name="people" size={20} color="#fff" />
            </View>
        ) : (
            <Image source={{ uri: image || 'https://i.pravatar.cc/100?u=user' }} style={styles.avatar} />
        )}
        <View style={styles.accessContent}>
            <Text style={styles.accessName}>{name} {isOwner && '(You)'}</Text>
            <Text style={styles.accessRole}>{role}</Text>
        </View>
        {!isOwner && <TouchableOpacity><Ionicons name="ellipsis-vertical" size={18} color="#64748b" /></TouchableOpacity>}
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445', marginLeft: 16 },
    
    scrollContent: { padding: 20 },
    noteCard: { backgroundColor: '#F4EEFC', padding: 20, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: '#C4B5DC' },
    noteTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    folderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
    folderName: { fontSize: 13, color: '#9A8EBA', fontWeight: '700' },
    noteSnippet: { fontSize: 14, color: '#7A6B9C', marginTop: 12, lineHeight: 20 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445', marginBottom: 20 },
    shareOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    shareIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
    shareContent: { flex: 1, marginLeft: 16 },
    shareTitle: { fontSize: 16, fontWeight: '700', color: '#2D2445' },
    shareSub: { fontSize: 12, color: '#7A6B9C', marginTop: 2 },

    accessItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    groupIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFE9F8', alignItems: 'center', justifyContent: 'center' },
    accessContent: { flex: 1, marginLeft: 16 },
    accessName: { fontSize: 16, fontWeight: '700', color: '#2D2445' },
    accessRole: { fontSize: 12, color: '#7A6B9C', marginTop: 2 }
});
