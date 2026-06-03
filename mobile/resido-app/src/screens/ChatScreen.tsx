import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { authApi, chatApi, API_URL, SOCKET_URL } from '../services/api';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
    const [conversation, setConversation] = useState<any>(null);
    const [otherUser, setOtherUser] = useState<any>(null);
    
    const socketRef = useRef<Socket | null>(null);
    const flatRef = useRef<FlatList>(null);
    const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
    const user = useAuthStore((s) => s.user);
    const token = useAuthStore((s) => s.token);
    const router = useRouter();
    const params = useLocalSearchParams<{ convName?: string; convType?: string; otherMemberId?: string }>();

    useEffect(() => {
        loadMessages();
        if (!params.convName && !params.otherMemberId) {
            loadConversationMeta();
        } else if (params.otherMemberId) {
            authApi.getUser(String(params.otherMemberId)).then(({ data }) => setOtherUser(data)).catch(() => undefined);
        }
    }, [conversationId]);

    // Reconnect when the conversation, workspace, or auth token changes so the
    // socket handshake always carries a valid token + matching tenant.
    useEffect(() => {
        connectSocket();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [conversationId, activeWorkspace?.tenantId, activeWorkspace?.dbName, token]);

    const loadConversationMeta = async () => {
        try {
            const { data: list } = await chatApi.getConversations();
            const conv = (list || []).find((c: any) => c.id === conversationId);
            if (!conv) return;
            setConversation(conv);
            if (conv.type === 'DIRECT') {
                const otherMemberId = conv.members?.find((m: any) => m.memberId !== user?.id)?.memberId;
                if (otherMemberId) {
                    try {
                        const { data: u } = await authApi.getUser(otherMemberId);
                        setOtherUser(u);
                    } catch {
                        // ignore — header just falls back to a generic label.
                    }
                }
            }
        } catch (e) {
            // non-fatal
        }
    };

    const loadMessages = async () => {
        if (!conversationId) return;
        try {
            setLoading(true);
            const { data } = await chatApi.getMessages(conversationId, { take: 50 });
            setMessages(data);
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            setLoading(false);
        }
    };

    const connectSocket = () => {
        if (!conversationId || !activeWorkspace || !token) return;

        const socket = io(`${SOCKET_URL}/chat`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            auth: {
                token,
                tenantId: activeWorkspace.tenantId,
                dbName: activeWorkspace.dbName,
                memberId: user?.id
            }
        });

        const joinRoom = () => {
            socket.emit('join_conversation', { conversationId });
        };

        socket.on('connect', () => {
            console.log('[chat] socket connected', socket.id);
            joinRoom();
        });

        socket.on('reconnect', () => {
            console.log('[chat] socket reconnected');
            joinRoom();
        });

        socket.on('connect_error', (err) => {
            console.warn('[chat] socket connect_error:', err?.message);
        });

        socket.on('new_message', (message: Message) => {
            setMessages(prev => mergeIncomingMessage(prev, message));
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        });

        socketRef.current = socket;
    };

    /**
     * Merges a server-side message into the local list.
     *
     * Send flow on this client is HTTP-first with optimistic append, so the
     * sender's own messages can arrive via three channels for the same record:
     *   (a) the local optimistic placeholder (already in state),
     *   (b) the HTTP response upgrading the placeholder to the real row,
     *   (c) the socket broadcast echoing the same real row.
     * We always dedupe by real id, then by a short content+sender fingerprint
     * for the small window where (c) wins the race against (b).
     */
    const mergeIncomingMessage = (prev: Message[], incoming: Message): Message[] => {
        if (prev.some(m => m.id === incoming.id)) return prev;
        const incomingTime = new Date(incoming.createdAt).getTime();
        const fingerprintMatch = prev.findIndex(m =>
            (m as any).pending &&
            m.senderId === incoming.senderId &&
            (m.content || '') === (incoming.content || '') &&
            Math.abs(new Date(m.createdAt).getTime() - incomingTime) < 30_000,
        );
        if (fingerprintMatch >= 0) {
            const next = [...prev];
            next[fingerprintMatch] = incoming;
            return next;
        }
        return [...prev, incoming];
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

            await sendMessageWithBody({
                type: type.toUpperCase() as Message['type'],
                mediaUrl: fileUrl,
                content: `Sent a ${type}`,
            });
        } catch (error) {
            console.error('Media upload failed:', error);
            Alert.alert('Error', 'Failed to upload media. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    /**
     * Send a message reliably:
     *   1. Append an optimistic placeholder so the sender sees it instantly.
     *   2. POST to the HTTP endpoint — this persists even if the socket is broken.
     *   3. The backend broadcasts via the socket gateway so other clients update live.
     *   4. The persisted message returned from HTTP replaces the placeholder.
     */
    const sendMessageWithBody = async (body: {
        type: Message['type'];
        content?: string;
        mediaUrl?: string;
        poll?: any;
    }) => {
        const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const optimistic: Message = {
            id: tempId,
            senderId: user?.id || 'me',
            senderName: user?.name,
            content: body.content || '',
            type: body.type,
            createdAt: new Date().toISOString(),
            mediaUrl: body.mediaUrl,
            poll: body.poll,
        };
        (optimistic as any).pending = true;
        (optimistic as any).clientNonce = tempId;
        setMessages(prev => [...prev, optimistic]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const { data: persisted } = await chatApi.sendMessage(conversationId, {
                content: body.content,
                type: body.type as any,
                mediaUrl: body.mediaUrl,
                poll: body.poll,
            });
            setMessages(prev => prev.map(m => (m.id === tempId ? { ...persisted } : m)));
        } catch (err: any) {
            console.error('Send failed:', err?.response?.status, err?.response?.data || err?.message);
            setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, content: (m.content || '') + ' ⚠️', failed: true } as any : m)));
            Alert.alert('Message failed', 'Could not send. Check your connection and try again.');
        }
    };

    const sendMessage = async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        await sendMessageWithBody({ type: 'TEXT', content: text });
    };

    const handlePublishPoll = (pollData: any) => {
        setShowPollBuilder(false);
        sendMessageWithBody({ type: 'POLL', poll: pollData });
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
                            <Ionicons name="document-text" size={24} color={isMine ? "#fff" : "#1d4ed8"} />
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
                        <Ionicons
                            name={conversation?.type === 'GROUP' ? 'people' : otherUser ? 'person' : 'chatbubbles'}
                            size={20}
                            color="#1d4ed8"
                        />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {conversation?.type === 'GROUP'
                                ? conversation?.name || 'Group'
                                : otherUser?.name || otherUser?.phone || params.convName || 'Chat'}
                        </Text>
                        <Text style={styles.headerSub}>
                            {conversation?.type === 'GROUP'
                                ? `${conversation?.members?.length || 0} members`
                                : 'Direct message'}
                        </Text>
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
                        <ActivityIndicator color="#1d4ed8" />
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
                        <Ionicons name={showAttachmentMenu ? "close" : "add"} size={24} color="#1d4ed8" />
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, paddingTop: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
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
    mineBubble: { backgroundColor: '#1d4ed8', borderBottomRightRadius: 4 },
    theirsBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    bubbleText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    mineText: { color: '#2D2445' },
    theirsText: { color: '#1e293b' },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    time: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },

    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    attachBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 15, borderWidth: 1, borderColor: '#f1f5f9' },
    input: { flex: 1, fontSize: 14, color: '#1e293b', maxHeight: 100, paddingVertical: 8 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },

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
    pollOptionSelected: { borderColor: '#1d4ed8', backgroundColor: '#f5f3ff' },
    pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1d4ed815' },
    pollOptionText: { fontSize: 13, fontWeight: '700', color: '#475569', zIndex: 1 },
    pollOptionTextSelected: { color: '#1d4ed8' },
    pollPercentage: { fontSize: 12, fontWeight: '800', color: '#1d4ed8', zIndex: 1 },
    pollMeta: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
});
