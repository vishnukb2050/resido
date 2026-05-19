import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet,
    Alert, Image, ActivityIndicator, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import { api } from '../../services/api';

const AREAS = ['Lobby', 'Staircase A', 'Staircase B', 'Parking', 'Gym', 'Terrace', 'Garden', 'Lift'];

export default function CleaningLogScreen() {
    const [completed, setCompleted] = useState<Record<string, boolean>>({});
    const [photos, setPhotos] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const pickPhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
        if (!result.canceled) setPhotos((p) => [...p, result.assets[0].uri]);
    };

    const submit = async () => {
        const areas = Object.entries(completed).filter(([, v]) => v).map(([k]) => k);
        if (!areas.length) { Alert.alert('Error', 'Mark at least one area as cleaned'); return; }
        setLoading(true);
        try {
            await api.post('/resident/cleaning-log', { date: dayjs().toISOString(), areas, notes });
            Alert.alert('Success', 'Cleaning log submitted!');
            setCompleted({}); setPhotos([]);
        } catch { Alert.alert('Error', 'Submission failed'); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Daily Cleaning Log</Text>
            <Text style={styles.sub}>{dayjs().format('dddd, DD MMM YYYY')}</Text>

            <Text style={styles.section}>Areas Cleaned</Text>
            {AREAS.map((area) => (
                <View key={area} style={styles.areaRow}>
                    <Text style={styles.areaName}>{area}</Text>
                    <Switch
                        value={!!completed[area]}
                        onValueChange={(v) => setCompleted((p) => ({ ...p, [area]: v }))}
                        trackColor={{ true: '#4c1d95' }}
                    />
                </View>
            ))}

            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Text style={styles.photoBtnText}>📷 Add Photo ({photos.length})</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
                <ScrollView horizontal contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                    {photos.map((p, i) => <Image key={i} source={{ uri: p }} style={styles.thumb} />)}
                </ScrollView>
            )}

            <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Log</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a', padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0', marginTop: 40 },
    sub: { color: '#64748b', fontSize: 13, marginBottom: 24 },
    section: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    areaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e2e', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    areaName: { color: '#e2e8f0', fontSize: 15, fontWeight: '500' },
    photoBtn: { backgroundColor: '#1e1e2e', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', height: 52, alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
    photoBtnText: { color: '#64748b', fontWeight: '600' },
    thumb: { width: 80, height: 80, borderRadius: 8 },
    btn: { backgroundColor: '#4c1d95', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
