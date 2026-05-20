import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, SafeAreaView, Share, ScrollView, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { threadApi, API_URL } from '../services/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import PollBuilderModal from '../components/PollBuilderModal';
import { io } from 'socket.io-client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function ThreadDetailScreen() {
    const { id } = useLocalSearchParams();
    const [thread, setThread] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showPollBuilder, setShowPollBuilder] = useState(false);
    
    const router = useRouter();
    const { user } = useAuthStore();

    useEffect(() => {
        fetchThreadDetails();
        fetchComments();
        
        if (!id) return;
        const socket = io(`${API_URL}/flares`, {
            transports: ['websocket']
        });

        socket.on('connect', () => {
            socket.emit('join_flare', { flareId: id });
        });

        socket.on('new_comment', (comment: any) => {
            if (comment.blogId === id) {
                setComments(prev => {
                    if (prev.find(c => c.id === comment.id)) return prev;
                    return [comment, ...prev];
                });
                setThread((prev: any) => prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : prev);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [id]);

    const fetchThreadDetails = async () => {
        try {
            const { data } = await threadApi.getThread(id as string);
            setThread(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchComments = async () => {
        try {
            const { data } = await threadApi.getComments(id as string);
            setComments(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (pollId: string, optionId: string) => {
        try {
            await threadApi.votePoll(pollId, optionId);
            fetchThreadDetails(); // Refresh to get updated vote counts
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to submit vote');
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        setSending(true);
        try {
            const { data } = await threadApi.addComment(id as string, {
                content: newComment,
                userName: user?.name,
                userAvatar: user?.profilePhoto
            });
            setComments([data, ...comments]);
            setNewComment('');
            // Increment local comment count
            setThread({ ...thread, commentsCount: (thread.commentsCount || 0) + 1 });
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    const handlePublishPollComment = async (pollData: any) => {
        setSending(true);
        try {
            const { data } = await threadApi.addComment(id as string, {
                content: "Posted a poll",
                userName: user?.name,
                userAvatar: user?.profilePhoto,
                poll: pollData
            });
            setComments([data, ...comments]);
            setThread({ ...thread, commentsCount: (thread.commentsCount || 0) + 1 });
        } catch (e) {
            console.error(e);
        } finally {
            setSending(false);
        }
    };

    const handleLike = async () => {
        try {
            setThread({ ...thread, likesCount: thread.likesCount + (thread.isLiked ? -1 : 1), isLiked: !thread.isLiked });
            await threadApi.toggleLike(id as string);
        } catch (e) {
            console.error(e);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${thread.title}\n\n${thread.content}\n\nShared via Resido App`,
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
    );

    if (!thread) return (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Thread not found</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Thread</Text>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#1e293b" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <View style={styles.threadContent}>
                            <View style={styles.authorSection}>
                                <Image source={{ uri: thread.authorAvatar || 'https://i.pravatar.cc/100' }} style={styles.avatar} />
                                <View style={styles.authorMeta}>
                                    <Text style={styles.authorName}>{thread.authorName || 'Anonymous'}</Text>
                                    <Text style={styles.timeText}>{dayjs(thread.createdAt).fromNow()}</Text>
                                </View>
                                <View style={styles.visibilityBadge}>
                                    <Ionicons name="globe-outline" size={12} color="#1d4ed8" />
                                    <Text style={styles.visibilityText}>{thread.visibility}</Text>
                                </View>
                            </View>

                            <Text style={styles.title}>{thread.title}</Text>
                            <Text style={styles.content}>{thread.content}</Text>

                            {thread.mediaUrls && thread.mediaUrls.map((url: string, i: number) => (
                                <Image key={i} source={{ uri: url }} style={styles.media} resizeMode="cover" />
                            ))}

                            {thread.poll && (
                                <View style={styles.pollContainer}>
                                    <Text style={styles.pollQuestion}>{thread.poll.question}</Text>
                                    {thread.poll.options.map((opt: any) => {
                                        const totalVotes = thread.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0);
                                        const percentage = totalVotes > 0 ? Math.round(((opt._count?.votes || 0) / totalVotes) * 100) : 0;
                                        const hasVoted = thread.poll.votes && thread.poll.votes.length > 0;
                                        const isSelected = thread.poll.votes && thread.poll.votes[0]?.optionId === opt.id;

                                        return (
                                            <TouchableOpacity 
                                                key={opt.id} 
                                                style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
                                                onPress={() => handleVote(thread.poll.id, opt.id)}
                                                disabled={hasVoted}
                                            >
                                                <View style={[styles.pollProgress, { width: `${percentage}%` }]} />
                                                <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>{opt.text}</Text>
                                                {hasVoted && <Text style={styles.pollPercentage}>{percentage}%</Text>}
                                            </TouchableOpacity>
                                        );
                                    })}
                                    <Text style={styles.pollMeta}>
                                        {thread.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0)} votes • {dayjs(thread.poll.expiresAt).isBefore(dayjs()) ? 'Ended' : `Ends ${dayjs(thread.poll.expiresAt).fromNow()}`}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.statsRow}>
                                <TouchableOpacity style={styles.statItem} onPress={handleLike}>
                                    <Ionicons name={thread.isLiked ? "heart" : "heart-outline"} size={22} color={thread.isLiked ? "#ef4444" : "#64748b"} />
                                    <Text style={[styles.statText, thread.isLiked && { color: '#ef4444' }]}>{thread.likesCount || 0} Likes</Text>
                                </TouchableOpacity>
                                <View style={styles.statItem}>
                                    <Ionicons name="chatbubble-outline" size={20} color="#64748b" />
                                    <Text style={styles.statText}>{thread.commentsCount || 0} Comments</Text>
                                </View>
                                <TouchableOpacity style={styles.statItem} onPress={handleShare}>
                                    <Ionicons name="share-outline" size={22} color="#64748b" />
                                    <Text style={styles.statText}>Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/chat-list?forwardContent=${encodeURIComponent(thread.title + '\n' + thread.content)}`)}>
                                    <Ionicons name="chatbubbles-outline" size={22} color="#1d4ed8" />
                                    <Text style={[styles.statText, { color: '#1d4ed8' }]}>Forward</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.divider} />
                            <Text style={styles.sectionTitle}>Comments</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.commentItem}>
                            <Image source={{ uri: item.userAvatar || 'https://i.pravatar.cc/100' }} style={styles.commentAvatar} />
                            <View style={styles.commentBody}>
                                <View style={styles.commentHeader}>
                                    <Text style={styles.commentAuthor}>{item.userName || 'User'}</Text>
                                    <Text style={styles.commentTime}>{dayjs(item.createdAt).fromNow()}</Text>
                                </View>
                                
                                {item.poll ? (
                                    <View style={styles.commentPollContainer}>
                                        <Text style={styles.commentPollQuestion}>{item.poll.question}</Text>
                                        {item.poll.options.map((opt: any) => {
                                            const totalVotes = item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0);
                                            const percentage = totalVotes > 0 ? Math.round(((opt._count?.votes || 0) / totalVotes) * 100) : 0;
                                            const hasVoted = item.poll.votes && item.poll.votes.length > 0;
                                            const isSelected = item.poll.votes && item.poll.votes[0]?.optionId === opt.id;

                                            return (
                                                <TouchableOpacity 
                                                    key={opt.id} 
                                                    style={[styles.commentPollOption, isSelected && styles.commentPollOptionSelected]}
                                                    onPress={() => handleVote(item.poll.id, opt.id)}
                                                    disabled={hasVoted}
                                                >
                                                    <View style={[styles.commentPollProgress, { width: `${percentage}%` }]} />
                                                    <Text style={[styles.commentPollOptionText, isSelected && styles.commentPollOptionTextSelected]}>{opt.text}</Text>
                                                    {hasVoted && <Text style={styles.commentPollPercentage}>{percentage}%</Text>}
                                                </TouchableOpacity>
                                            );
                                        })}
                                        <Text style={styles.commentPollMeta}>
                                            {item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0)} votes
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.commentText}>{item.content}</Text>
                                )}
                                
                                <View style={styles.commentActions}>
                                    <TouchableOpacity>
                                        <Text style={styles.commentActionText}>Reply</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{ marginLeft: 20 }}>
                                        <Ionicons name="heart-outline" size={14} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.listPadding}
                    ListEmptyComponent={
                        <View style={styles.emptyComments}>
                            <Text style={styles.emptyCommentsText}>No comments yet. Be the first to comment!</Text>
                        </View>
                    }
                />

                <View style={styles.inputWrapper}>
                    <Image source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/100' }} style={styles.smallAvatar} />
                    <TouchableOpacity style={styles.commentPlusBtn} onPress={() => setShowPollBuilder(true)}>
                        <Ionicons name="add" size={24} color="#1d4ed8" />
                    </TouchableOpacity>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Add a comment..."
                            value={newComment}
                            onChangeText={setNewComment}
                            multiline
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity 
                            onPress={handleSendComment} 
                            disabled={sending || !newComment.trim()}
                            style={[styles.sendBtn, !newComment.trim() && { opacity: 0.5 }]}
                        >
                            {sending ? <ActivityIndicator size="small" color="#1d4ed8" /> : <Ionicons name="send" size={20} color="#1d4ed8" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <PollBuilderModal 
                    visible={showPollBuilder}
                    onClose={() => setShowPollBuilder(false)}
                    onPublish={handlePublishPollComment}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    headerIcon: { padding: 5 },
    threadContent: { padding: 20 },
    authorSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    authorMeta: { flex: 1, marginLeft: 12 },
    authorName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    timeText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    visibilityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    visibilityText: { fontSize: 10, fontWeight: '800', color: '#1d4ed8', marginLeft: 4, textTransform: 'uppercase' },
    title: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginBottom: 12 },
    content: { fontSize: 16, color: '#475569', lineHeight: 24, marginBottom: 20 },
    media: { width: '100%', height: 250, borderRadius: 20, marginBottom: 20 },
    statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderTopColor: '#f8fafc', borderBottomColor: '#f8fafc' },
    statItem: { flexDirection: 'row', alignItems: 'center' },
    statText: { fontSize: 14, fontWeight: '700', color: '#64748b', marginLeft: 8 },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 20 },
    commentItem: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 25 },
    commentAvatar: { width: 40, height: 40, borderRadius: 20 },
    commentBody: { flex: 1, marginLeft: 12 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    commentAuthor: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    commentTime: { fontSize: 11, color: '#94a3b8' },
    commentText: { fontSize: 14, color: '#475569', lineHeight: 20 },
    commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    commentActionText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
    listPadding: { paddingBottom: 100 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
    smallAvatar: { width: 36, height: 36, borderRadius: 18 },
    inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 20, paddingHorizontal: 15, marginLeft: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    input: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#1e293b', maxHeight: 100 },
    sendBtn: { marginLeft: 10 },
    emptyComments: { alignItems: 'center', paddingVertical: 40 },
    emptyCommentsText: { color: '#94a3b8', fontSize: 14 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: '#94a3b8' },
    backBtn: { marginTop: 20, backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    backBtnText: { color: '#fff', fontWeight: '800' },

    // Poll Styles
    pollContainer: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 16, marginVertical: 15, borderWidth: 1, borderColor: '#f1f5f9' },
    pollQuestion: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
    pollOption: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative', overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pollOptionSelected: { borderColor: '#1d4ed8', backgroundColor: '#f5f3ff' },
    pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1d4ed815' },
    pollOptionText: { fontSize: 14, fontWeight: '700', color: '#475569', zIndex: 1 },
    pollOptionTextSelected: { color: '#1d4ed8' },
    pollPercentage: { fontSize: 13, fontWeight: '800', color: '#1d4ed8', zIndex: 1 },
    pollMeta: { fontSize: 12, color: '#94a3b8', marginTop: 5, fontWeight: '600' },

    commentPlusBtn: { marginLeft: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    commentPollContainer: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginVertical: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    commentPollQuestion: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
    commentPollOption: { backgroundColor: '#fff', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative', overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    commentPollOptionSelected: { borderColor: '#1d4ed8', backgroundColor: '#f5f3ff' },
    commentPollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#1d4ed815' },
    commentPollOptionText: { fontSize: 12, fontWeight: '700', color: '#475569', zIndex: 1 },
    commentPollOptionTextSelected: { color: '#1d4ed8' },
    commentPollPercentage: { fontSize: 11, fontWeight: '800', color: '#1d4ed8', zIndex: 1 },
    commentPollMeta: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
});
