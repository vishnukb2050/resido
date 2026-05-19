import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PollBuilderModalProps {
    visible: boolean;
    onClose: () => void;
    onPublish: (poll: { question: string; options: string[]; durationDays: number }) => void;
}

export default function PollBuilderModal({ visible, onClose, onPublish }: PollBuilderModalProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [duration, setDuration] = useState(7);

    const handleAddOption = () => {
        if (options.length < 5) {
            setOptions([...options, '']);
        }
    };

    const handleOptionChange = (text: string, index: number) => {
        const newOptions = [...options];
        newOptions[index] = text;
        setOptions(newOptions);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
        }
    };

    const handlePublish = () => {
        if (!question.trim()) {
            return Alert.alert('Error', 'Please enter a question');
        }
        const filteredOptions = options.filter(o => o.trim());
        if (filteredOptions.length < 2) {
            return Alert.alert('Error', 'Please provide at least 2 options');
        }
        onPublish({
            question,
            options: filteredOptions,
            durationDays: duration
        });
        // Reset and close
        setQuestion('');
        setOptions(['', '']);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalContent}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Create Poll</Text>
                        <TouchableOpacity onPress={handlePublish} style={styles.publishBtn}>
                            <Text style={styles.publishBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Question</Text>
                        <TextInput
                            style={styles.questionInput}
                            placeholder="What would you like to ask?"
                            placeholderTextColor="#94a3b8"
                            multiline
                            value={question}
                            onChangeText={setQuestion}
                        />

                        <Text style={styles.label}>Options (min 2)</Text>
                        {options.map((opt, index) => (
                            <View key={index} style={styles.optionRow}>
                                <TextInput
                                    style={styles.optionInput}
                                    placeholder={`Option ${index + 1}`}
                                    placeholderTextColor="#94a3b8"
                                    value={opt}
                                    onChangeText={(text) => handleOptionChange(text, index)}
                                />
                                {options.length > 2 && (
                                    <TouchableOpacity onPress={() => handleRemoveOption(index)} style={styles.removeBtn}>
                                        <Ionicons name="remove-circle-outline" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}

                        {options.length < 5 && (
                            <TouchableOpacity onPress={handleAddOption} style={styles.addOptionBtn}>
                                <Ionicons name="add-circle-outline" size={20} color="#4c1d95" />
                                <Text style={styles.addOptionText}>Add Option</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.label}>Duration (Days)</Text>
                        <View style={styles.durationRow}>
                            {[1, 3, 7, 30].map((d) => (
                                <TouchableOpacity 
                                    key={d} 
                                    style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
                                    onPress={() => setDuration(d)}
                                >
                                    <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>{d}d</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    publishBtn: { backgroundColor: '#4c1d95', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    publishBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    body: { padding: 20 },
    label: { fontSize: 14, fontWeight: '800', color: '#64748b', marginBottom: 10, marginTop: 10 },
    questionInput: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 15, fontSize: 16, color: '#1e293b', minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#f1f5f9' },
    optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    optionInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
    removeBtn: { marginLeft: 10 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 20 },
    addOptionText: { fontSize: 14, fontWeight: '700', color: '#4c1d95', marginLeft: 8 },
    durationRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    durationBtn: { flex: 1, backgroundColor: '#f8fafc', paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    durationBtnActive: { backgroundColor: '#f5f3ff', borderColor: '#4c1d95' },
    durationText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
    durationTextActive: { color: '#4c1d95' },
});
