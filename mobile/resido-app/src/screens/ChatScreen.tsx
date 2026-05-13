import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, Image, StatusBar
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { chatApi, API_URL } from '../services/api';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PollBuilderModal from '../components/PollBuilderModal';

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
}

const MOCK_MESSAGES: Message[] = [
    {
        id: '1',
        senderId: 'admin',
        senderName: 'Admin',
        content: 'Dear Residents,\n\nThis is to inform you that there will be a water supply interruption on May 26th from 10:00 AM to 2:00 PM due to maintenance work.\n\nThank you for your cooperation.',
        type: 'TEXT',
        createdAt: '2024-05-24T08:30:00Z',
        reactions: ['😊', '🤝', '12']
    },
    {
        id: '2',
        senderId: 'me',
        senderName: 'Neha Sharma (A-1203)',
        content: 'Thanks for the update!',
        type: 'TEXT',
        createdAt: '2024-05-24T08:45:00Z'
    },
    {
        id: '3',
        senderId: 'u2',
        senderName: 'Ramesh Kumar (B-604)',
        content: 'Is there any precaution we need to take?',
        type: 'TEXT',
        createdAt: '2024-05-24T09:00:00Z'
    },
    {
        id: '4',
        senderId: 'admin',
        senderName: 'Admin',
        content: 'Please store enough water for your needs during this time.',
        type: 'TEXT',
        createdAt: '2024-05-24T09:05:00Z',
        reactions: ['👍', '😊', '5']
    },
    {
        id: '5',
        senderId: 'u3',
        senderName: 'Arjun Mehta (C-301)',
        content: 'Thanks for the heads up!',
        type: 'TEXT',
        createdAt: '2024-05-24T09:10:00Z'
    }
];

export default function ChatScreen({ conversationId }: { conversationId: string }) {
    const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPollBuilder, setShowPollBuilder] = useState(false);
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
                // Avoid duplicates
                if (prev.find(m => m.id === message.id)) return prev;
                return [...prev, message];
            });
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
        });

        socketRef.current = socket;
    };

    const sendMessage = async () => {
        if (!input.trim() || !socketRef.current) return;
        
        const messageData = {
            conversationId,
            content: input.trim(),
            type: 'TEXT'
        };

        // Emit via socket for real-time delivery
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
    };

    const handleVote = async (pollId: string, optionId: string) => {
        try {
            await chatApi.votePoll(pollId, optionId);
            // Refresh local state if possible or wait for socket update
            // For now we'll reload messages to be sure
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
                    {item.type === 'POLL' && item.poll ? (
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
                {item.reactions && (
                    <View style={styles.reactionsContainer}>
                        {item.reactions.map((r, i) => (
                            <Text key={i} style={styles.reaction}>{r}</Text>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <View style={styles.headerAvatar}>
                        <Ionicons name="business" size={20} color="#6366f1" />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.headerTitle}>Greenwood Residency</Text>
                        <Text style={styles.headerSub}>Community</Text>
                    </View>
                </View>
                <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#1e293b" /></TouchableOpacity>
            </View>

            {/* Announcements Banner */}
            <TouchableOpacity style={styles.announcementBanner}>
                <View style={styles.announcementIconBox}>
                    <Ionicons name="megaphone" size={18} color="#6366f1" />
                </View>
                <Text style={styles.announcementText} numberOfLines={1}>
                    Announcements: Water supply will be interrupted on May...
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </TouchableOpacity>

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
                    ListHeaderComponent={<Text style={styles.dateDivider}>May 24, 2024</Text>}
                />

                {/* Input Bar */}
                <View style={styles.inputBar}>
                    <TouchableOpacity style={styles.attachBtn} onPress={() => setShowPollBuilder(true)}>
                        <Ionicons name="add" size={24} color="#6366f1" />
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
                        <TouchableOpacity><Ionicons name="happy-outline" size={24} color="#94a3b8" /></TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                        <Ionicons name={input.trim() ? "send" : "mic"} size={22} color="#fff" />
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

    announcementBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 15, paddingVertical: 10, marginHorizontal: 20, marginTop: 15, borderRadius: 12, gap: 10 },
    announcementIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    announcementText: { flex: 1, fontSize: 11, color: '#4338ca', fontWeight: '600' },

    listContent: { padding: 20, paddingBottom: 20 },
    dateDivider: { textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: '700', marginVertical: 20 },

    messageWrapper: { maxWidth: '85%', marginBottom: 15 },
    mineWrapper: { alignSelf: 'flex-end' },
    theirsWrapper: { alignSelf: 'flex-start' },
    senderName: { fontSize: 11, color: '#10b981', fontWeight: '700', marginBottom: 4, marginLeft: 12 },
    bubble: { borderRadius: 20, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    mineBubble: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
    theirsBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    bubbleText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    mineText: { color: '#fff' },
    theirsText: { color: '#1e293b' },
    bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
    time: { fontSize: 9, color: '#94a3b8', fontWeight: '600' },

    reactionsContainer: { flexDirection: 'row', backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: -8, marginLeft: 15, borderWidth: 1, borderColor: '#f1f5f9', gap: 4 },
    reaction: { fontSize: 10 },

    inputBar: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    attachBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 15, borderWidth: 1, borderColor: '#f1f5f9' },
    input: { flex: 1, fontSize: 14, color: '#1e293b', maxHeight: 100, paddingVertical: 8 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },

    // Poll Styles
    pollContainer: { width: '100%', marginVertical: 5 },
    pollQuestion: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
    pollOption: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative', overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pollOptionSelected: { borderColor: '#6366f1', backgroundColor: '#f5f3ff' },
    pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#6366f115' },
    pollOptionText: { fontSize: 13, fontWeight: '700', color: '#475569', zIndex: 1 },
    pollOptionTextSelected: { color: '#6366f1' },
    pollPercentage: { fontSize: 12, fontWeight: '800', color: '#6366f1', zIndex: 1 },
    pollMeta: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
});
