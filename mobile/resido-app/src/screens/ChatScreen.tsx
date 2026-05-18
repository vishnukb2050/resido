import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Image, StatusBar, Alert
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { authApi, chatApi, API_URL } from '../services/api';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PollBuilderModal from '../components/PollBuilderModal';
import { Image as ImageCompressor, Video as VideoCompressor } from 'react-native-compressor';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

interface Message {
    id: string;
    senderId: string;
    senderName?: string;
    senderRole?: string;
    content: string;
    type: string;
    createdAt: string;
    reactions?: string[];
    poll?: any;
    mediaUrl?: string;
}

export default function ChatScreen({ conversationId }: { conversationId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPollBuilder, setShowPollBuilder] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const socketRef = useRef<Socket | null>(null);
    const flatRef = useRef<FlatList>(null);
    const { activeWorkspace, user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        loadMessages();
        connectSocket();
        return () => { 
            if (socketRef.current) {
                socketRef.current.disconnect(); 
            }
        };
    }, [conversationId]);

    const loadMessages = async () => {
        if (!conversationId) return;
        try {
            setLoading(true);
            const { data } = await chatApi.getMessages(conversationId);
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            setLoading(false);
        }
    };

    const connectSocket = () => {
        if (!conversationId || !activeWorkspace) return;

        const socket = io(`${API_URL}/chat`, {
            auth: {
                tenantId: activeWorkspace.tenantId,
                dbName: activeWorkspace.dbName,
                memberId: user?.id
            }
        });

        socket.on('connect', () => {
            console.log('Connected to chat socket');
            socket.emit('join_conversation', { conversationId });
        });

        socket.on('new_message', (message: Message) => {
            setMessages(prev => {
                if (prev.find(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        });

        socketRef.current = socket;
    };

    const handlePickMedia = async (type: 'image' | 'video' | 'file') => {
        setShowAttachmentMenu(false);
        try {
            let result;
            if (type === 'file') {
                result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    quality: 0.8,
                });
            }

            if (result.canceled) return;

            setIsUploading(true);
            const asset = (result as any).assets[0];
            let uri = asset.uri;
            let contentType = asset.mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4');

            if (type === 'image') {
                uri = await ImageCompressor.compress(uri, { maxWidth: 1280, quality: 0.8 });
            } else if (type === 'video') {
                uri = await VideoCompressor.compress(uri, { compressionMethod: 'auto' });
            }

            const fileName = uri.split('/').pop() || 'upload';
            const { data } = await authApi.getPresignedUrl(fileName, contentType, 'chat');
            const { uploadUrl, fileUrl } = data;

            const response = await fetch(uri);
            const blob = await response.blob();
            await fetch(uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': contentType }
            });

            if (socketRef.current) {
                socketRef.current.emit('send_message', {
                    conversationId,
                    type: type.toUpperCase(),
                    mediaUrl: fileUrl,
                    content: `Sent a ${type}`
                });
            }
        } catch (error) {
            console.error('Media upload failed:', error);
            Alert.alert('Error', 'Failed to upload media. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || !socketRef.current) return;
        
        const messageData = {
            conversationId,
            content: input.trim(),
            type: 'TEXT'
        };

        socketRef.current.emit('send_message', messageData);
        setInput('');
    };

    const handlePublishPoll = (pollData: any) => {
        if (!socketRef.current) return;
        
        const messageData = {
            conversationId,
            type: 'POLL',
            poll: pollData
        };

        socketRef.current.emit('send_message', messageData);
        setShowPollBuilder(false);
    };

    const handleVote = async (pollId: string, optionId: string) => {
        try {
            await chatApi.votePoll(pollId, optionId);
            loadMessages();
        } catch (e) {
            console.error(e);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.senderId === user?.id;
        return (
            <View style={[styles.messageWrapper, isMine ? styles.mineWrapper : styles.theirsWrapper]}>
                {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
                <View style={[styles.bubble, isMine ? styles.mineBubble : styles.theirsBubble]}>
                    {item.type === 'IMAGE' ? (
                        <Image source={{ uri: item.mediaUrl || item.content }} style={styles.messageImage} />
                    ) : item.type === 'VIDEO' ? (
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="play-circle" size={48} color="#fff" />
                            <Text style={{ color: '#fff', marginTop: 8 }}>Video Content</Text>
                        </View>
                    ) : item.type === 'FILE' ? (
                        <TouchableOpacity style={styles.fileContainer} onPress={() => {}}>
                            <Ionicons name="document-text" size={24} color={isMine ? "#fff" : "#0d9488"} />
                            <Text style={[styles.fileName, isMine && { color: '#fff' }]}>{item.content}</Text>
                        </TouchableOpacity>
                    ) : item.type === 'POLL' && item.poll ? (
                        <View style={styles.pollContainer}>
                            <Text style={[styles.pollQuestion, isMine && { color: '#fff' }]}>{item.poll.question}</Text>
                            {item.poll.options.map((opt: any) => {
                                const totalVotes = item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0);
                                const percentage = totalVotes > 0 ? Math.round(((opt._count?.votes || 0) / totalVotes) * 100) : 0;
                                const hasVoted = item.poll.votes && item.poll.votes.length > 0;
                                const isSelected = item.poll.votes && item.poll.votes[0]?.optionId === opt.id;

                                return (
                                    <TouchableOpacity 
                                        key={opt.id} 
                                        style={[styles.pollOption, isSelected && styles.pollOptionSelected, isMine && { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' }]}
                                        onPress={() => handleVote(item.poll.id, opt.id)}
                                        disabled={hasVoted}
                                    >
                                        <View style={[styles.pollProgress, { width: `${percentage}%` }, isMine && { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                                        <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected, isMine && { color: '#fff' }]}>{opt.text}</Text>
                                        {hasVoted && <Text style={[styles.pollPercentage, isMine && { color: '#fff' }]}>{percentage}%</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                            <Text style={[styles.pollMeta, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                                {item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0)} votes
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.bubbleText, isMine ? styles.mineText : styles.theirsText]}>
                            {item.content}
                        </Text>
                    )}
                    <View style={styles.bubbleFooter}>
                        <Text style={[styles.time, isMine && { color: 'rgba(255,255,255,0.7)' }]}>
                            {dayjs(item.createdAt).format('H:mm A')}
                        </Text>
                        {isMine && <Ionicons name="checkmark-done" size={14} color="#fff" style={{ marginLeft: 4 }} />}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <View style={styles.headerAvatar}>
                        <Ionicons name="business" size={20} color="#0d9488" />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.headerTitle}>Greenwood Residency</Text>
                        <Text style={styles.headerSub}>Community</Text>
                    </View>
                </View>
                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#1e293b" /></TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <FlatList
                    ref={flatRef}
                    data={messages}
                    keyExtractor={(m) => m.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
                />

                {isUploading && (
                    <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#0d9488" />
                        <Text style={styles.uploadingText}>Optimizing and uploading...</Text>
                    </View>
                )}

                {showAttachmentMenu && (
                    <View style={styles.attachmentMenu}>
                        <TouchableOpacity style={styles.attachmentItem} onPress={() => handlePickMedia('image')}>
                            <View style={[styles.attachmentIcon, { backgroundColor: '#dcfce7' }]}>
                                <Ionicons name="image" size={20} color="#16a34a" />
                            </View>
                            <Text style={styles.attachmentLabel}>Images</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.attachmentItem} onPress={() => handlePickMedia('video')}>
                            <View style={[styles.attachmentIcon, { backgroundColor: '#fee2e2' }]}>
                                <Ionicons name="videocam" size={20} color="#dc2626" />
                            </View>
                            <Text style={styles.attachmentLabel}>Videos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.attachmentItem} onPress={() => handlePickMedia('file')}>
                            <View style={[styles.attachmentIcon, { backgroundColor: '#e0e7ff' }]}>
                                <Ionicons name="document" size={20} color="#4338ca" />
                            </View>
                            <Text style={styles.attachmentLabel}>Files</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.attachmentItem} onPress={() => { setShowAttachmentMenu(false); setShowPollBuilder(true); }}>
                            <View style={[styles.attachmentIcon, { backgroundColor: '#fef9c3' }]}>
                                <Ionicons name="stats-chart" size={20} color="#ca8a04" />
                            </View>
                            <Text style={styles.attachmentLabel}>Poll</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputBar}>
                    <TouchableOpacity style={styles.attachBtn} onPress={() => setShowAttachmentMenu(!showAttachmentMenu)}>
                        <Ionicons name={showAttachmentMenu ? "close" : "add"} size={24} color="#0d9488" />
                    </TouchableOpacity>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#94a3b8"
                            value={input}
                            onChangeText={setInput}
                            multiline
                        />
                    </View>
                    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <PollBuilderModal 
                    visible={showPollBuilder}
                    onClose={() => setShowPollBuilder(false)}
                    onPublish={handlePublishPoll}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, paddingTop: 65, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
    headerAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    headerTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    headerSub: { fontSize: 11, color: '#64748b', fontWeight: '600' },

    listContent: { padding: 20, paddingBottom: 20 },
    messageWrapper: { maxWidth: '85%', marginBottom: 15 },
    mineWrapper: { alignSelf: 'flex-end' },
    theirsWrapper: { alignSelf: 'flex-start' },
    senderName: { fontSize: 11, color: '#10b981', fontWeight: '700', marginBottom: 4, marginLeft: 12 },
    bubble: { borderRadius: 20, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    mineBubble: { backgroundColor: '#0d9488', borderBottomRightRadius: 4 },
    theirsBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    bubbleText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    mineText: { color: '#fff' },
    theirsText: { color: '#1e293b' },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    time: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },

    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    attachBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 15, borderWidth: 1, borderColor: '#f1f5f9' },
    input: { flex: 1, fontSize: 14, color: '#1e293b', maxHeight: 100, paddingVertical: 8 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },

    uploadingOverlay: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    uploadingText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

    attachmentMenu: { position: 'absolute', bottom: 80, left: 15, backgroundColor: '#fff', padding: 10, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 10, width: 140 },
    attachmentItem: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 },
    attachmentIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    attachmentLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },

    messageImage: { width: 240, height: 180, borderRadius: 12, marginBottom: 4 },
    videoPlaceholder: { width: 240, height: 180, borderRadius: 12, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    fileContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    fileName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },

    // Poll Styles
    pollContainer: { width: 220, marginVertical: 5 },
    pollQuestion: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
    pollOption: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative', overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pollOptionSelected: { borderColor: '#0d9488', backgroundColor: '#f5f3ff' },
    pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#0d948815' },
    pollOptionText: { fontSize: 13, fontWeight: '700', color: '#475569', zIndex: 1 },
    pollOptionTextSelected: { color: '#0d9488' },
    pollPercentage: { fontSize: 12, fontWeight: '800', color: '#0d9488', zIndex: 1 },
    pollMeta: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
});
