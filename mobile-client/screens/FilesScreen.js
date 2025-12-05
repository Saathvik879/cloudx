import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://cloudx-api.onrender.com';

export default function FilesScreen() {
    const [buckets, setBuckets] = useState([]);
    const [selectedBucket, setSelectedBucket] = useState(null);
    const [currentFolder, setCurrentFolder] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [showBucketModal, setShowBucketModal] = useState(false);

    useEffect(() => {
        loadApiKey();
    }, []);

    useEffect(() => {
        if (apiKey) {
            loadBuckets();
        }
    }, [apiKey]);

    const loadApiKey = async () => {
        const key = await AsyncStorage.getItem('cloudx_api_key');
        if (key) {
            setApiKey(key);
        } else {
            Alert.alert('API Key Required', 'Please set your API key in Settings');
        }
    };

    const loadBuckets = async () => {
        try {
            const response = await fetch(`${API_URL}/api/v1/storage/buckets`);
            const data = await response.json();
            setBuckets(Object.keys(data));
        } catch (error) {
            Alert.alert('Error', 'Failed to load buckets');
        }
    };

    const loadFiles = async (bucket, folder = '') => {
        setLoading(true);
        try {
            const response = await fetch(
                `${API_URL}/api/v1/storage/buckets/${bucket}/browse?folder=${folder}`
            );
            const data = await response.json();
            setFiles(data.items || []);
            setCurrentFolder(folder);
        } catch (error) {
            Alert.alert('Error', 'Failed to load files');
        }
        setLoading(false);
    };

    const selectBucket = (bucket) => {
        setSelectedBucket(bucket);
        setShowBucketModal(false);
        loadFiles(bucket);
    };

    const navigateToFolder = (folderName) => {
        const newFolder = currentFolder ? `${currentFolder}/${folderName}` : folderName;
        loadFiles(selectedBucket, newFolder);
    };

    const goBack = () => {
        const parts = currentFolder.split('/');
        parts.pop();
        const newFolder = parts.join('/');
        loadFiles(selectedBucket, newFolder);
    };

    const pickAndUploadFile = async () => {
        if (!selectedBucket) {
            Alert.alert('Error', 'Please select a bucket first');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({});

            if (result.type === 'cancel') return;

            const formData = new FormData();
            formData.append('file', {
                uri: result.uri,
                name: result.name,
                type: result.mimeType || 'application/octet-stream',
            });
            formData.append('folder', currentFolder);

            const response = await fetch(
                `${API_URL}/api/v1/storage/${selectedBucket}/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (response.ok) {
                Alert.alert('Success', 'File uploaded!');
                loadFiles(selectedBucket, currentFolder);
            } else {
                Alert.alert('Error', 'Upload failed');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const createFolder = () => {
        Alert.prompt('Create Folder', 'Enter folder name:', async (folderName) => {
            if (!folderName) return;

            const folderPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;

            try {
                const response = await fetch(
                    `${API_URL}/api/v1/storage/buckets/${selectedBucket}/folders`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folderPath }),
                    }
                );

                if (response.ok) {
                    Alert.alert('Success', 'Folder created!');
                    loadFiles(selectedBucket, currentFolder);
                }
            } catch (error) {
                Alert.alert('Error', 'Failed to create folder');
            }
        });
    };

    const deleteItem = async (item) => {
        const itemPath = currentFolder ? `${currentFolder}/${item.name}` : item.name;

        Alert.alert('Delete', `Delete ${item.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const response = await fetch(
                            `${API_URL}/api/v1/storage/buckets/${selectedBucket}/items`,
                            {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ path: itemPath }),
                            }
                        );

                        if (response.ok) {
                            Alert.alert('Success', 'Item deleted!');
                            loadFiles(selectedBucket, currentFolder);
                        }
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete');
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.fileItem}
            onPress={() => item.type === 'folder' && navigateToFolder(item.name)}
            onLongPress={() => deleteItem(item)}
        >
            <Ionicons
                name={item.type === 'folder' ? 'folder' : 'document'}
                size={40}
                color={item.type === 'folder' ? '#6366f1' : '#64748b'}
            />
            <Text style={styles.fileName}>{item.name}</Text>
            {item.size && <Text style={styles.fileSize}>{formatBytes(item.size)}</Text>}
        </TouchableOpacity>
    );

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.bucketSelector}
                    onPress={() => setShowBucketModal(true)}
                >
                    <Text style={styles.bucketText}>
                        {selectedBucket || 'Select Bucket'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#6366f1" />
                </TouchableOpacity>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={createFolder}>
                        <Ionicons name="folder-outline" size={24} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={pickAndUploadFile}>
                        <Ionicons name="cloud-upload-outline" size={24} color="#6366f1" />
                    </TouchableOpacity>
                </View>
            </View>

            {currentFolder && (
                <View style={styles.breadcrumb}>
                    <TouchableOpacity onPress={goBack}>
                        <Ionicons name="arrow-back" size={20} color="#6366f1" />
                    </TouchableOpacity>
                    <Text style={styles.breadcrumbText}>{currentFolder}</Text>
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={styles.loading} />
            ) : (
                <FlatList
                    data={files}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.fileList}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="folder-open-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyText}>
                                {selectedBucket ? 'This folder is empty' : 'Select a bucket to get started'}
                            </Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showBucketModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Bucket</Text>
                        {buckets.map((bucket) => (
                            <TouchableOpacity
                                key={bucket}
                                style={styles.bucketItem}
                                onPress={() => selectBucket(bucket)}
                            >
                                <Text style={styles.bucketItemText}>{bucket}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.modalClose}
                            onPress={() => setShowBucketModal(false)}
                        >
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    bucketSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 12,
    },
    bucketText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        padding: 8,
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    breadcrumbText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#64748b',
    },
    fileList: {
        padding: 8,
    },
    fileItem: {
        flex: 1,
        backgroundColor: 'white',
        margin: 8,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    fileName: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        color: '#1e293b',
    },
    fileSize: {
        marginTop: 4,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#1e293b',
    },
    bucketItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    bucketItemText: {
        fontSize: 16,
        color: '#1e293b',
    },
    modalClose: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6366f1',
    },
});
