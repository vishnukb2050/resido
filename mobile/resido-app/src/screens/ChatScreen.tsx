import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';
import { chatApi } from '../services/api';
import dayjs from 'dayjs';

interface Message {
    id: string;
    senderId: string;
    content: string;
    type: string;
    createdAt: string;
}

export default function ChatScreen({ conversationId }: { conversationId: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);
    const flatRef = useRef<FlatList>(null);
    const { activeWorkspace, user } = useAuthStore();

    useEffect(() => {
        loadMessages();
        connectSocket();
        return () => { socketRef.current?.disconnect(); };
    }, [conversationId]);

    const loadMessages = async () => {
        try {
            const res = await chatApi.getMessages(conversationId);
            setMessages(res.data);
        } finally {
            setLoading(false);
        }
    };

    const connectSocket = () => {
        const socketUrl = Constants.expoConfig?.extra?.socketUrl || 'http://localhost:3000';
        // Socket.io connection with tenant auth
        const socket = io(`${socketUrl}/chat`, {
            auth: { 
                tenantId: activeWorkspace?.tenantId, 
                memberId: user?.id,
                dbName: activeWorkspace?.dbName // Critical for multi-tenant isolation
            },
        });

        socketRef.current = socket;
        
        socket.on('connect', () => {
            console.log('Chat connected');
            socket.emit('join_conversation', { conversationId });
        });

        socket.on('new_message', (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
            flatRef.current?.scrollToEnd({ animated: true });
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });
    };

    const sendMessage = () => {
        if (!input.trim()) return;
        // Simplified payload: backend knows tenantId and senderId from the socket session
        socketRef.current?.emit('send_message', {
            conversationId,
            content: input.trim(),
            type: 'TEXT',
        });
        setInput('');
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.senderId === user?.id;
        return (
            <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
                <Text style={[styles.bubbleText, isMine ? styles.mineText : styles.theirsText]}>
                    {item.content}
                </Text>
                <Text style={styles.time}>{dayjs(item.createdAt).format('HH:mm')}</Text>
            </View>
        );
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <FlatList
                ref={flatRef}
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderMessage}
                contentContainerStyle={{ padding: 16, gap: 8 }}
                onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            />
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    placeholderTextColor="#64748b"
                    value={input}
                    onChangeText={setInput}
                    multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                    <Text style={styles.sendIcon}>➤</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    bubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
    mine: { alignSelf: 'flex-end', backgroundColor: '#6366f1' },
    theirs: { alignSelf: 'flex-start', backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    bubbleText: { fontSize: 15, lineHeight: 20 },
    mineText: { color: '#fff' },
    theirsText: { color: '#e2e8f0' },
    time: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, alignSelf: 'flex-end' },
    inputBar: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: '#1e1e2e', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
    input: { flex: 1, backgroundColor: '#27273a', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#e2e8f0', fontSize: 15, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    sendIcon: { color: '#fff', fontSize: 16 },
});
