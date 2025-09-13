// Google Drive API Integration for AO Attendance System
// Handles authentication and data storage in Google Drive

class GoogleDriveService {
    constructor() {
        this.CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your Google Client ID
        this.API_KEY = 'YOUR_GOOGLE_API_KEY'; // Replace with your Google API Key
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.file';
        
        this.isAuthenticated = false;
        this.tokenClient = null;
        this.accessToken = null;
        this.folderId = null;
        
        console.log('Google Drive Service initialized');
    }
    
    async init() {
        try {
            // Load Google APIs
            await this.loadGoogleAPI();
            
            // Initialize the API
            await gapi.load('auth2', () => {
                gapi.auth2.init({
                    client_id: this.CLIENT_ID
                });
            });
            
            // Initialize Google Identity Services
            if (typeof google !== 'undefined' && google.accounts) {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: (tokenResponse) => {
                        this.accessToken = tokenResponse.access_token;
                        this.isAuthenticated = true;
                        console.log('Google Drive authenticated successfully');
                        this.createAppFolder();
                    },
                });
            }
            
            console.log('Google Drive API initialized');
        } catch (error) {
            console.error('Error initializing Google Drive API:', error);
        }
    }
    
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (typeof gapi !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client', resolve);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async authenticate() {
        try {
            if (!this.tokenClient) {
                throw new Error('Google API not initialized');
            }
            
            // Request access token
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
            
            return new Promise((resolve) => {
                // The callback in tokenClient will handle the response
                const checkAuth = setInterval(() => {
                    if (this.isAuthenticated) {
                        clearInterval(checkAuth);
                        resolve(true);
                    }
                }, 100);
                
                // Timeout after 30 seconds
                setTimeout(() => {
                    clearInterval(checkAuth);
                    resolve(false);
                }, 30000);
            });
        } catch (error) {
            console.error('Authentication error:', error);
            return false;
        }
    }
    
    async createAppFolder() {
        try {
            // Check if folder already exists
            const existingFolder = await this.findFolder('AO_Attendance_Data');
            
            if (existingFolder) {
                this.folderId = existingFolder.id;
                console.log('Using existing folder:', this.folderId);
                return this.folderId;
            }
            
            // Create new folder
            const folderMetadata = {
                name: 'AO_Attendance_Data',
                mimeType: 'application/vnd.google-apps.folder'
            };
            
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(folderMetadata)
            });
            
            const folder = await response.json();
            this.folderId = folder.id;
            
            console.log('Created folder:', this.folderId);
            return this.folderId;
        } catch (error) {
            console.error('Error creating folder:', error);
            return null;
        }
    }
    
    async findFolder(folderName) {
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            const data = await response.json();
            return data.files && data.files.length > 0 ? data.files[0] : null;
        } catch (error) {
            console.error('Error finding folder:', error);
            return null;
        }
    }
    
    async saveData(filename, data) {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated');
            }
            
            if (!this.folderId) {
                await this.createAppFolder();
            }
            
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            
            // Check if file exists
            const existingFile = await this.findFile(filename);
            
            let url, method;
            if (existingFile) {
                // Update existing file
                url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
                method = 'PATCH';
            } else {
                // Create new file
                const metadata = {
                    name: filename,
                    parents: [this.folderId]
                };
                
                // First create the file metadata
                const metadataResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(metadata)
                });
                
                const file = await metadataResponse.json();
                
                // Then upload the content
                url = `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`;
                method = 'PATCH';
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: blob
            });
            
            if (response.ok) {
                console.log(`Data saved to Google Drive: ${filename}`);
                return true;
            } else {
                console.error('Error saving to Google Drive:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }
    
    async loadData(filename) {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated');
            }
            
            const file = await this.findFile(filename);
            if (!file) {
                console.log(`File not found: ${filename}`);
                return null;
            }
            
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            if (response.ok) {
                const jsonData = await response.text();
                const data = JSON.parse(jsonData);
                console.log(`Data loaded from Google Drive: ${filename}`);
                return data;
            } else {
                console.error('Error loading from Google Drive:', response.statusText);
                return null;
            }
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }
    
    async findFile(filename) {
        try {
            if (!this.folderId) {
                await this.createAppFolder();
            }
            
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and '${this.folderId}' in parents`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            const data = await response.json();
            return data.files && data.files.length > 0 ? data.files[0] : null;
        } catch (error) {
            console.error('Error finding file:', error);
            return null;
        }
    }
    
    async listFiles() {
        try {
            if (!this.isAuthenticated) {
                throw new Error('Not authenticated');
            }
            
            if (!this.folderId) {
                await this.createAppFolder();
            }
            
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${this.folderId}' in parents`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            const data = await response.json();
            return data.files || [];
        } catch (error) {
            console.error('Error listing files:', error);
            return [];
        }
    }
    
    async deleteFile(filename) {
        try {
            const file = await this.findFile(filename);
            if (!file) {
                return false;
            }
            
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            return response.ok;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }
    
    async testConnection() {
        try {
            if (!this.isAuthenticated) {
                return { success: false, message: 'Not authenticated' };
            }
            
            const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: `Connected as ${data.user.displayName} (${data.user.emailAddress})`
                };
            } else {
                return { success: false, message: 'Connection test failed' };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
    
    revokeAuth() {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken);
            this.isAuthenticated = false;
            this.accessToken = null;
            console.log('Google Drive authentication revoked');
        }
    }
}

// Initialize Google Drive service
window.googleDrive = new GoogleDriveService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleDriveService;
}

console.log('Google Drive service loaded');