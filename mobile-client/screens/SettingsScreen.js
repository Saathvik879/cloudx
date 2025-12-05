import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        loadApiKey();
    }, []);

    const loadApiKey = async () => {
        const key = await AsyncStorage.getItem('cloudx_api_key');
        if (key) {
            setApiKey(key);
        }
    };

    const saveApiKey = async () => {
        if (!apiKey) {
            Alert.alert('Error', 'Please enter an API key');
            return;
        }

        await AsyncStorage.setItem('cloudx_api_key', apiKey);
        Alert.alert('Success', 'API key saved!');
    };

    const clearApiKey = async () => {
        Alert.alert('Clear API Key', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem('cloudx_api_key');
                    setApiKey('');
                    Alert.alert('Success', 'API key cleared');
                },
            },
        ]);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>API Configuration</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>API Key</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your CloudX API key"
                            value={apiKey}
                            onChangeText={setApiKey}
                            secureTextEntry={!showKey}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={() => setShowKey(!showKey)}>
                            <Ionicons
                                name={showKey ? 'eye-off' : 'eye'}
                                size={24}
                                color="#64748b"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.saveBtn} onPress={saveApiKey}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.clearBtn} onPress={clearApiKey}>
                            <Text style={styles.clearBtnText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <View style={styles.card}>
                    <View style={styles.infoRow}>
                        <Ionicons name="cloud" size={24} color="#6366f1" />
                        <View style={styles.infoText}>
                            <Text style={styles.infoTitle}>CloudX</Text>
                            <Text style={styles.infoSubtitle}>Version 2.0.0</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="server" size={24} color="#6366f1" />
                        <View style={styles.infoText}>
                            <Text style={styles.infoTitle}>API Endpoint</Text>
                            <Text style={styles.infoSubtitle}>cloudx-api.onrender.com</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Help</Text>

                <View style={styles.card}>
                    <Text style={styles.helpText}>
                        To get your API key:
                    </Text>
                    <Text style={styles.helpStep}>
                        1. Visit cloudx-api.onrender.com
                    </Text>
                    <Text style={styles.helpStep}>
                        2. Go to API Keys tab
                    </Text>
                    <Text style={styles.helpStep}>
                        3. Generate a new key
                    </Text>
                    <Text style={styles.helpStep}>
                        4. Copy and paste it here
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
    },
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        padding: 12,
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: '#6366f1',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    clearBtn: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    clearBtnText: {
        color: '#64748b',
        fontSize: 16,
        fontWeight: '600',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoText: {
        marginLeft: 12,
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    infoSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    helpText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
    },
    helpStep: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 8,
        paddingLeft: 8,
    },
});
