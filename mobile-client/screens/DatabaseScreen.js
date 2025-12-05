import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://cloudx-api.onrender.com';

export default function DatabaseScreen() {
    const [databases, setDatabases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [dbName, setDbName] = useState('');
    const [dbEngine, setDbEngine] = useState('sqlite');
    const [dbSize, setDbSize] = useState('small');

    useEffect(() => {
        loadDatabases();
    }, []);

    const loadDatabases = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/v1/database/databases`);
            const data = await response.json();
            setDatabases(Object.entries(data));
        } catch (error) {
            Alert.alert('Error', 'Failed to load databases');
        }
        setLoading(false);
    };

    const createDatabase = async () => {
        if (!dbName) {
            Alert.alert('Error', 'Please enter a database name');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/v1/database/databases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: dbName, engine: dbEngine, size: dbSize }),
            });

            if (response.ok) {
                Alert.alert('Success', 'Database created!');
                setShowCreateForm(false);
                setDbName('');
                loadDatabases();
            } else {
                Alert.alert('Error', 'Failed to create database');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const renderDatabase = ({ item }) => {
        const [name, info] = item;
        return (
            <View style={styles.dbItem}>
                <Ionicons name="server" size={40} color="#6366f1" />
                <View style={styles.dbInfo}>
                    <Text style={styles.dbName}>{name}</Text>
                    <Text style={styles.dbMeta}>
                        Engine: {info.engine} • Size: {info.size}
                    </Text>
                    <Text style={styles.dbDate}>
                        Created: {new Date(info.created).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.createBtn}
                onPress={() => setShowCreateForm(!showCreateForm)}
            >
                <Ionicons name="add-circle" size={24} color="white" />
                <Text style={styles.createBtnText}>Create Database</Text>
            </TouchableOpacity>

            {showCreateForm && (
                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Database name"
                        value={dbName}
                        onChangeText={setDbName}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Engine (e.g., postgres)"
                        value={dbEngine}
                        onChangeText={setDbEngine}
                    />
                    <TouchableOpacity style={styles.submitBtn} onPress={createDatabase}>
                        <Text style={styles.submitBtnText}>Create</Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={styles.loading} />
            ) : (
                <FlatList
                    data={databases}
                    renderItem={renderDatabase}
                    keyExtractor={(item) => item[0]}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="server-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No databases yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366f1',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    createBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    submitBtn: {
        backgroundColor: '#6366f1',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    list: {
        padding: 16,
    },
    dbItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dbInfo: {
        marginLeft: 16,
        flex: 1,
    },
    dbName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 4,
    },
    dbMeta: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 2,
    },
    dbDate: {
        fontSize: 12,
        color: '#94a3b8',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94a3b8',
    },
});
