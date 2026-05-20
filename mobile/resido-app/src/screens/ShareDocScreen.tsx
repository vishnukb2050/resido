import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ShareDocScreen() {
    const router = useRouter();
    const { id, folderId, name, isFolder, size } = useLocalSearchParams();

    const handleSharePress = (targetType: 'CONTACT' | 'GROUP') => {
        router.push({
            pathname: targetType === 'CONTACT' ? '/select-contacts' : '/select-groups',
            params: {
                shareType: 'DOC',
                itemId: id || folderId,
                isFolder: isFolder ? 'true' : 'false'
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Share Document</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* File Preview Card */}
                <View style={styles.fileCard}>
                    <View style={styles.fileIconBox}>
                        <MaterialCommunityIcons name="file-document" size={32} color="#fff" />
                    </View>
                    <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{name || 'Document'}</Text>
                        <Text style={styles.fileSub}>{isFolder === 'true' ? 'Folder' : (size || 'File')}</Text>
                    </View>
                </View>

                {/* Share Options */}
                <Text style={styles.sectionTitle}>Share with</Text>
                <ShareOption 
                    icon="person-outline" 
                    title="Contacts" 
                    desc="Share with your contacts or search by profile name" 
                    onPress={() => handleSharePress('CONTACT')}
                />
                <ShareOption 
                    icon="people-outline" 
                    title="Groups" 
                    desc="Share with your groups" 
                    onPress={() => handleSharePress('GROUP')}
                />
                <ShareOption 
                    icon="link-outline" 
                    title="Copy Link" 
                    desc="Anyone with link can view" 
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
    container: { flex: 1, backgroundColor: '#23272a' },
    header: { padding: 20, paddingTop: 20, flexDirection: 'row', alignItems: 'center' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginLeft: 16 },
    
    scrollContent: { padding: 20 },
    fileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    fileIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
    fileTypeText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    fileInfo: { flex: 1, marginLeft: 16 },
    fileName: { fontSize: 17, fontWeight: '800', color: '#fff' },
    fileSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 20 },
    shareOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    shareIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    shareContent: { flex: 1, marginLeft: 16 },
    shareTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
    shareSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

    accessItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    groupIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    accessContent: { flex: 1, marginLeft: 16 },
    accessName: { fontSize: 16, fontWeight: '700', color: '#fff' },
    accessRole: { fontSize: 12, color: '#64748b', marginTop: 2 }
});
