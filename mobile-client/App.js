import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Alert, TextInput } from 'react-native';
import React, { useState } from 'react';

const API_URL = 'https://cloudx-api.onrender.com';

export default function App() {
    const [status, setStatus] = useState('Idle');
    const [apiKey, setApiKey] = useState('');

    const checkApi = async () => {
        if (!apiKey) {
            Alert.alert('Error', 'Please enter your API key first');
            return;
        }

        setStatus('Checking API...');
        try {
            const response = await fetch(`${API_URL}/api/v1/database/databases`, {
                headers: {
                    'X-API-Key': apiKey
                }
            });

            if (response.status === 401) {
                setStatus('Error: Invalid API key');
                Alert.alert('Error', 'Invalid API key. Please check and try again.');
                return;
            }

            const data = await response.json();
            setStatus(`Connected! Found ${Object.keys(data).length} databases`);
            Alert.alert('Success', 'Connected to CloudX API successfully!');
        } catch (error) {
            setStatus(`Error: ${error.message}`);
            Alert.alert('Error', 'Failed to connect to API');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>CloudX Mobile Client</Text>
            <Text style={styles.subtitle}>API: {API_URL}</Text>

            <View style={styles.card}>
                <Text style={styles.label}>API Key:</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter your CloudX API key"
                    value={apiKey}
                    onChangeText={setApiKey}
                    secureTextEntry={true}
                    autoCapitalize="none"
                />
                <Text style={styles.status}>Status: {status}</Text>
                <Button title="Test Connection" onPress={checkApi} />
            </View>

            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 30,
    },
    card: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    status: {
        marginBottom: 20,
        fontSize: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        width: '100%',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 14,
    }
});
