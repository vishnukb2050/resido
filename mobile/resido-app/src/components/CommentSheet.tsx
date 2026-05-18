import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Dimensions, 
    TouchableOpacity, 
    FlatList, 
    Image, 
    TextInput, 
    KeyboardAvoidingView, 
    Platform,
    ActivityIndicator,
    Animated as RNAnimated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { threadApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import PollBuilderModal from './PollBuilderModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Comment {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    likesCount: number;
    createdAt: string;
    poll?: any;
}

interface CommentSheetProps {
    flareId: string;
    authorId: string;
    onClose: () => void;
}

const EMOJIS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

export default function CommentSheet({ flareId, authorId, onClose }: CommentSheetProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [showPollBuilder, setShowPollBuilder] = useState(false);
    const { user } = useAuthStore();
    
    // Animation
    const translateY = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        RNAnimated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8
        }).start();
        fetchComments();
    }, []);

    const fetchComments = async () => {
        try {
            const { data } = await threadApi.getComments(flareId);
            setComments(data);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newComment.trim()) return;
        setSending(true);
        try {
            const { data } = await threadApi.addComment(flareId, {
                content: newComment.trim(),
                userName: user?.name || 'Resident',
                userAvatar: user?.profilePhoto
            });
            setComments(prev => [data, ...prev]);
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment', error);
        } finally {
            setSending(false);
        }
    };

    const handlePublishPoll = async (pollData: any) => {
        setSending(true);
        try {
            const { data } = await threadApi.addComment(flareId, {
                content: "Posted a poll",
                userName: user?.name || 'Resident',
                userAvatar: user?.profilePhoto,
                poll: pollData
            });
            setComments(prev => [data, ...prev]);
        } catch (error) {
            console.error('Failed to add poll comment', error);
        } finally {
            setSending(false);
        }
    };

    const handleVote = async (pollId: string, optionId: string) => {
        try {
            await threadApi.votePoll(pollId, optionId);
            fetchComments(); // Refresh to get updated counts
        } catch (e) {
            console.error(e);
        }
    };

    const handleClose = () => {
        RNAnimated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true
        }).start(onClose);
    };

    const renderItem = ({ item }: { item: Comment }) => {
        const isAuthor = item.userId === authorId;
        return (
            <View style={styles.commentItem}>
                <Image 
                    source={{ uri: item.userAvatar || `https://randomuser.me/api/portraits/lego/${Math.floor(Math.random() * 8)}.jpg` }} 
                    style={styles.commentAvatar} 
                />
                <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{item.userName}</Text>
                        <Text style={styles.commentTime}>• 9h</Text>
                        {isAuthor && (
                            <Text style={styles.authorBadge}>• Author</Text>
                        )}
                    </View>
                    {item.poll ? (
                        <View style={styles.pollContainer}>
                            <Text style={styles.pollQuestion}>{item.poll.question}</Text>
                            {item.poll.options.map((opt: any) => {
                                const totalVotes = item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0);
                                const percentage = totalVotes > 0 ? Math.round(((opt._count?.votes || 0) / totalVotes) * 100) : 0;
                                const hasVoted = item.poll.votes && item.poll.votes.length > 0;
                                const isSelected = item.poll.votes && item.poll.votes[0]?.optionId === opt.id;

                                return (
                                    <TouchableOpacity 
                                        key={opt.id} 
                                        style={[styles.pollOption, isSelected && styles.pollOptionSelected]}
                                        onPress={() => handleVote(item.poll.id, opt.id)}
                                        disabled={hasVoted}
                                    >
                                        <View style={[styles.pollProgress, { width: `${percentage}%` }]} />
                                        <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>{opt.text}</Text>
                                        {hasVoted && <Text style={styles.pollPercentage}>{percentage}%</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                            <Text style={styles.pollMeta}>{item.poll.options.reduce((sum: number, o: any) => sum + (o._count?.votes || 0), 0)} votes</Text>
                        </View>
                    ) : (
                        <Text style={styles.commentText}>{item.content}</Text>
                    )}
                    <TouchableOpacity style={styles.replyBtn}>
                        <Text style={styles.replyText}>Reply</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.commentLike}>
                    <Ionicons name="heart-outline" size={16} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.commentLikeCount}>{item.likesCount || 0}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.overlay}>
            <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
            <RNAnimated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Comments</Text>
                
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 50 }} color="#0d9488" />
                ) : (
                    <FlatList
                        data={comments}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={styles.inputSection}>
                        <View style={styles.emojiRow}>
                            {EMOJIS.map(emoji => (
                                <TouchableOpacity 
                                    key={emoji} 
                                    onPress={() => setNewComment(prev => prev + emoji)}
                                    style={styles.emojiBtn}
                                >
                                    <Text style={styles.emojiText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <View style={styles.inputRow}>
                            <TouchableOpacity onPress={() => setShowPollBuilder(true)} style={styles.plusBtn}>
                                <Ionicons name="add" size={24} color="#0d9488" />
                            </TouchableOpacity>
                            <Image 
                                source={{ uri: user?.profilePhoto || 'https://randomuser.me/api/portraits/lego/1.jpg' }} 
                                style={styles.inputAvatar} 
                            />
                            <View style={styles.textInputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder={`Add a comment...`}
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    value={newComment}
                                    onChangeText={setNewComment}
                                    multiline
                                />
                                <TouchableOpacity onPress={handleSend} disabled={sending}>
                                    {sending ? (
                                        <ActivityIndicator size="small" color="#0d9488" />
                                    ) : (
                                        <Text style={[styles.postBtn, !newComment.trim() && styles.postBtnDisabled]}>Post</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>

                <PollBuilderModal 
                    visible={showPollBuilder}
                    onClose={() => setShowPollBuilder(false)}
                    onPublish={handlePublishPoll}
                />
            </RNAnimated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.7,
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 15,
    },
    sheetTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentUser: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    commentTime: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginLeft: 8,
    },
    authorBadge: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
    },
    commentText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 18,
    },
    replyBtn: {
        marginTop: 6,
    },
    replyText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '700',
    },
    commentLike: {
        alignItems: 'center',
        paddingLeft: 10,
    },
    commentLikeCount: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginTop: 4,
    },
    inputSection: {
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingBottom: Platform.OS === 'ios' ? 30 : 15,
        backgroundColor: '#1c1c1e',
    },
    emojiRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    emojiBtn: {
        padding: 5,
    },
    emojiText: {
        fontSize: 24,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        gap: 12,
    },
    inputAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    textInputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        maxHeight: 100,
    },
    postBtn: {
        color: '#0d9488',
        fontWeight: '700',
        marginLeft: 10,
    },
    postBtnDisabled: {
        color: 'rgba(99, 102, 241, 0.4)',
    },

    // Poll Styles (Dark)
    plusBtn: { marginRight: 5, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    pollContainer: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pollQuestion: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 10 },
    pollOption: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pollOptionSelected: { borderColor: '#0d9488', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(99, 102, 241, 0.2)' },
    pollOptionText: { fontSize: 12, fontWeight: '700', color: '#e2e8f0', zIndex: 1 },
    pollOptionTextSelected: { color: '#0d9488' },
    pollPercentage: { fontSize: 11, fontWeight: '800', color: '#0d9488', zIndex: 1 },
    pollMeta: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontWeight: '600' },
});
