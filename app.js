// AO War Room Attendance System - Main Application
// Progressive Web App with Google Drive Integration

class AttendanceApp {
    constructor() {
        this.currentUser = null;
        this.currentEmployee = null;
        this.isAuthenticated = false;
        this.employees = [];
        this.meetings = [];
        this.attendanceRecords = [];
        this.settings = {
            attendanceThreshold: 80,
            locationRadius: 50,
            gracePeriod: 15,
            adminEmail: '103991@vedanta.co.in',
            autoSync: true,
            syncInterval: 30000
        };
        
        // Admin credentials
        this.adminCredentials = {
            username: 'admin',
            password: 'ao2025'
        };
        
        // Meeting locations
        this.meetingLocations = [
            {
                id: 'ao_war_room',
                name: 'AO War Room',
                latitude: 28.7041,
                longitude: 77.1025,
                address: 'Main Conference Hall'
            },
            {
                id: 'conf_room_a',
                name: 'Conference Room A',
                latitude: 28.7045,
                longitude: 77.1020,
                address: '2nd Floor, East Wing'
            }
        ];
        
        // Initialize the application
        this.init();
    }
    
    async init() {
        console.log('Initializing AO War Room Attendance System');
        
        // Load data from localStorage
        this.loadLocalData();
        
        // Bind event listeners
        this.bindEvents();
        
        // Initialize Google Drive
        if (window.googleDrive) {
            await window.googleDrive.init();
            this.checkDriveConnection();
        }
        
        // Show home screen
        this.showScreen('home');
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Start auto-sync if enabled
        if (this.settings.autoSync) {
            this.startAutoSync();
        }
    }
    
    loadLocalData() {
        try {
            const stored = localStorage.getItem('aoAttendanceData');
            if (stored) {
                const data = JSON.parse(stored);
                this.employees = data.employees || [];
                this.meetings = data.meetings || [];
                this.attendanceRecords = data.attendance || [];
                this.settings = { ...this.settings, ...data.settings };
                
                console.log(`Loaded ${this.employees.length} employees, ${this.meetings.length} meetings`);
            } else {
                this.initializeSampleData();
            }
        } catch (error) {
            console.error('Error loading local data:', error);
            this.initializeSampleData();
        }
    }
    
    saveLocalData() {
        try {
            const data = {
                employees: this.employees,
                meetings: this.meetings,
                attendance: this.attendanceRecords,
                settings: this.settings,
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem('aoAttendanceData', JSON.stringify(data));
            console.log('Data saved to localStorage');
        } catch (error) {
            console.error('Error saving local data:', error);
        }
    }
    
    initializeSampleData() {
        this.employees = [
            {
                id: 'emp_sample_001',
                name: 'Sample Employee',
                employeeId: 'VED2025001',
                designation: 'Assistant Officer',
                email: 'sample@vedanta.co.in',
                managerEmail: 'manager@vedanta.co.in',
                department: 'Operations',
                registrationDate: new Date().toISOString(),
                status: 'active'
            }
        ];
        
        this.meetings = [];
        this.attendanceRecords = [];
        this.saveLocalData();
    }
    
    bindEvents() {
        // Home screen buttons
        document.getElementById('employeeBtn').addEventListener('click', () => this.showScreen('registration'));
        document.getElementById('adminBtn').addEventListener('click', () => this.showScreen('adminLogin'));
        document.getElementById('scanBtn').addEventListener('click', () => this.showScreen('scanner'));
        
        // Registration form
        document.getElementById('registrationForm').addEventListener('submit', (e) => this.handleEmployeeRegistration(e));
        
        // Admin login form
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.handleAdminLogin(e));
        
        // Meeting creation form
        document.getElementById('newMeetingForm').addEventListener('submit', (e) => this.handleCreateMeeting(e));
        
        // Google Sign-In
        document.getElementById('signInBtn').addEventListener('click', () => this.authenticateGoogleDrive());
        document.getElementById('skipAuthBtn').addEventListener('click', () => this.showScreen('home'));
        
        // Admin dashboard navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                if (section) this.showAdminSection(section);
            });
        });
        
        // Search functionality
        document.getElementById('employeeSearch').addEventListener('input', (e) => this.filterEmployees(e.target.value));
        
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }
    
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show the requested screen
        const screen = document.getElementById(screenName + 'Screen');
        if (screen) {
            screen.classList.add('active');
        } else if (screenName === 'home') {
            document.getElementById('homeScreen').classList.add('active');
        }
    }
    
    showAdminSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        // Show section
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName + 'Section').classList.add('active');
        
        // Load section data
        switch (sectionName) {
            case 'employees':
                this.refreshEmployeesList();
                break;
            case 'meetings':
                this.refreshMeetingsList();
                break;
            case 'drive':
                this.updateDriveStatus();
                break;
        }
    }
    
    async handleEmployeeRegistration(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const employeeData = {
            id: 'emp_' + Date.now(),
            name: formData.get('name'),
            employeeId: formData.get('employeeId'),
            designation: formData.get('designation'),
            email: formData.get('email'),
            managerEmail: formData.get('managerEmail'),
            department: formData.get('department') || 'General',
            registrationDate: new Date().toISOString(),
            status: 'active'
        };
        
        // Check for duplicate employee ID
        const existing = this.employees.find(emp => emp.employeeId === employeeData.employeeId);
        if (existing) {
            this.showToast('Employee ID already exists', 'error');
            return;
        }
        
        // Add employee
        this.employees.push(employeeData);
        this.saveLocalData();
        
        // Sync to Google Drive
        if (window.googleDrive && window.googleDrive.isAuthenticated) {
            await this.syncToGoogleDrive();
        }
        
        this.showToast('Employee registered successfully!', 'success');
        this.currentEmployee = employeeData;
        
        // Reset form
        e.target.reset();
        
        // Show success screen or redirect
        this.showScreen('home');
    }
    
    async handleAdminLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (username === this.adminCredentials.username && password === this.adminCredentials.password) {
            this.currentUser = { username, role: 'admin' };
            this.showScreen('adminDashboard');
            this.showAdminSection('overview');
            this.updateDashboardStats();
            
            // Show logout button
            document.getElementById('logoutBtn').style.display = 'block';
            
            this.showToast('Admin login successful!', 'success');
        } else {
            this.showToast('Invalid credentials!', 'error');
        }
    }
    
    async handleCreateMeeting(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const location = this.meetingLocations.find(loc => loc.id === formData.get('location'));
        
        const meetingData = {
            id: 'meeting_' + Date.now(),
            title: formData.get('title'),
            date: formData.get('date'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            location: formData.get('location'),
            description: formData.get('description') || '',
            createdAt: new Date().toISOString(),
            qrCodeData: null
        };
        
        // Generate QR code data
        meetingData.qrCodeData = `${meetingData.title}|${meetingData.date}|${meetingData.startTime}|${location.latitude},${location.longitude}|${meetingData.id}`;
        
        // Add meeting
        this.meetings.push(meetingData);
        this.saveLocalData();
        
        // Sync to Google Drive
        if (window.googleDrive && window.googleDrive.isAuthenticated) {
            await this.syncToGoogleDrive();
        }
        
        this.showToast('Meeting created successfully!', 'success');
        
        // Reset form and hide
        e.target.reset();
        this.hideCreateMeetingForm();
        
        // Refresh meetings list
        this.refreshMeetingsList();
        
        // Show QR code
        this.showQRCode(meetingData);
    }
    
    updateDashboardStats() {
        // Update employee count
        document.getElementById('totalEmployees').textContent = this.employees.length;
        
        // Update meeting count
        document.getElementById('totalMeetings').textContent = this.meetings.length;
        
        // Calculate today's attendance
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = this.attendanceRecords.filter(record => 
            record.timestamp.startsWith(today)
        );
        
        const todayMeetings = this.meetings.filter(meeting => meeting.date === today);
        const attendancePercentage = todayMeetings.length > 0 ? 
            Math.round((todayAttendance.length / (todayMeetings.length * this.employees.length)) * 100) : 0;
        
        document.getElementById('todayAttendance').textContent = attendancePercentage + '%';
        
        // Calculate compliance rate
        const complianceRate = this.calculateComplianceRate();
        document.getElementById('complianceRate').textContent = complianceRate + '%';
    }
    
    calculateComplianceRate() {
        if (this.employees.length === 0) return 0;
        
        let compliantEmployees = 0;
        this.employees.forEach(employee => {
            const attendance = this.calculateEmployeeAttendance(employee.id);
            if (attendance >= this.settings.attendanceThreshold) {
                compliantEmployees++;
            }
        });
        
        return Math.round((compliantEmployees / this.employees.length) * 100);
    }
    
    calculateEmployeeAttendance(employeeId) {
        const employeeRecords = this.attendanceRecords.filter(record => record.employeeId === employeeId);
        const totalMeetings = this.meetings.length;
        
        if (totalMeetings === 0) return 0;
        return Math.round((employeeRecords.length / totalMeetings) * 100);
    }
    
    refreshEmployeesList() {
        const tbody = document.getElementById('employeeTableBody');
        tbody.innerHTML = '';
        
        if (this.employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">No employees registered</td></tr>';
            return;
        }
        
        this.employees.forEach(employee => {
            const attendance = this.calculateEmployeeAttendance(employee.id);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${employee.name}</td>
                <td>${employee.employeeId}</td>
                <td>${employee.email}</td>
                <td>${employee.department}</td>
                <td>${attendance}%</td>
                <td>
                    <button class="btn btn-outline" onclick="app.editEmployee('${employee.id}')">Edit</button>
                    <button class="btn btn-outline" onclick="app.deleteEmployee('${employee.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    refreshMeetingsList() {
        const container = document.getElementById('meetingsList');
        container.innerHTML = '';
        
        if (this.meetings.length === 0) {
            container.innerHTML = '<div class="loading">No meetings created</div>';
            return;
        }
        
        this.meetings.forEach(meeting => {
            const location = this.meetingLocations.find(loc => loc.id === meeting.location);
            const card = document.createElement('div');
            card.className = 'meeting-card';
            card.innerHTML = `
                <div class="meeting-header">
                    <h4>${meeting.title}</h4>
                    <div class="meeting-meta">
                        <span>📅 ${meeting.date}</span>
                        <span>🕐 ${meeting.startTime} - ${meeting.endTime}</span>
                        <span>📍 ${location ? location.name : 'Unknown'}</span>
                    </div>
                </div>
                <div class="meeting-body">
                    <p>${meeting.description || 'No description'}</p>
                </div>
                <div class="meeting-actions">
                    <button class="btn btn-primary" onclick="app.showQRCode(${JSON.stringify(meeting).replace(/"/g, '&quot;')})">
                        Show QR Code
                    </button>
                    <button class="btn btn-secondary" onclick="app.viewAttendance('${meeting.id}')">
                        View Attendance
                    </button>
                    <button class="btn btn-outline" onclick="app.deleteMeeting('${meeting.id}')">
                        Delete
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }
    
    showQRCode(meeting) {
        const modal = document.getElementById('qrModal');
        const container = document.getElementById('qrCodeContainer');
        const info = document.getElementById('qrCodeInfo');
        
        // Generate QR code
        if (window.QRGenerator) {
            const qrCanvas = window.QRGenerator.generateQR(meeting.qrCodeData, 300);
            container.innerHTML = '';
            container.appendChild(qrCanvas);
        } else {
            container.innerHTML = '<div class="qr-placeholder">QR Code: ' + meeting.qrCodeData + '</div>';
        }
        
        // Update info
        const location = this.meetingLocations.find(loc => loc.id === meeting.location);
        info.innerHTML = `
            <strong>${meeting.title}</strong><br>
            📅 ${meeting.date} | 🕐 ${meeting.startTime} - ${meeting.endTime}<br>
            📍 ${location ? location.name : 'Unknown Location'}
        `;
        
        modal.classList.add('active');
    }
    
    filterEmployees(searchTerm) {
        const tbody = document.getElementById('employeeTableBody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });
    }
    
    async authenticateGoogleDrive() {
        if (window.googleDrive) {
            const success = await window.googleDrive.authenticate();
            if (success) {
                this.updateSyncStatus('online', 'Connected to Google Drive');
                this.showToast('Google Drive connected!', 'success');
                await this.syncFromGoogleDrive();
                this.showScreen('home');
            } else {
                this.showToast('Failed to connect to Google Drive', 'error');
            }
        } else {
            this.showToast('Google Drive integration not available', 'error');
        }
    }
    
    async syncToGoogleDrive() {
        if (!window.googleDrive || !window.googleDrive.isAuthenticated) {
            return false;
        }
        
        try {
            this.updateSyncStatus('syncing', 'Syncing to Google Drive...');
            
            const data = {
                employees: this.employees,
                meetings: this.meetings,
                attendance: this.attendanceRecords,
                settings: this.settings,
                lastSync: new Date().toISOString()
            };
            
            const success = await window.googleDrive.saveData('ao_attendance_data.json', data);
            
            if (success) {
                this.updateSyncStatus('online', 'Synced to Google Drive');
                return true;
            } else {
                this.updateSyncStatus('offline', 'Sync failed');
                return false;
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.updateSyncStatus('offline', 'Sync error');
            return false;
        }
    }
    
    async syncFromGoogleDrive() {
        if (!window.googleDrive || !window.googleDrive.isAuthenticated) {
            return false;
        }
        
        try {
            this.updateSyncStatus('syncing', 'Loading from Google Drive...');
            
            const data = await window.googleDrive.loadData('ao_attendance_data.json');
            
            if (data) {
                this.employees = data.employees || [];
                this.meetings = data.meetings || [];
                this.attendanceRecords = data.attendance || [];
                this.settings = { ...this.settings, ...data.settings };
                
                this.saveLocalData();
                this.updateDashboardStats();
                this.refreshEmployeesList();
                this.refreshMeetingsList();
                
                this.updateSyncStatus('online', 'Loaded from Google Drive');
                return true;
            } else {
                this.updateSyncStatus('online', 'No data found in Drive');
                return false;
            }
        } catch (error) {
            console.error('Load error:', error);
            this.updateSyncStatus('offline', 'Load error');
            return false;
        }
    }
    
    updateSyncStatus(status, message) {
        const syncDot = document.querySelector('.sync-dot');
        const syncText = document.querySelector('.sync-text');
        const driveStatus = document.getElementById('driveStatus');
        
        if (syncDot && syncText) {
            syncDot.className = `sync-dot ${status}`;
            syncText.textContent = message;
        }
        
        if (driveStatus) {
            const statusText = driveStatus.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
            }
        }
        
        // Update drive section status
        this.updateDriveStatus();
    }
    
    updateDriveStatus() {
        const connectionIcon = document.getElementById('driveConnectionIcon');
        const connectionStatus = document.getElementById('driveConnectionStatus');
        
        if (connectionIcon && connectionStatus) {
            if (window.googleDrive && window.googleDrive.isAuthenticated) {
                connectionIcon.textContent = '🟢';
                connectionStatus.textContent = 'Connected to Google Drive';
            } else {
                connectionIcon.textContent = '🔴';
                connectionStatus.textContent = 'Not connected';
            }
        }
    }
    
    checkDriveConnection() {
        if (window.googleDrive && window.googleDrive.isAuthenticated) {
            this.updateSyncStatus('online', 'Connected to Google Drive');
        } else {
            this.updateSyncStatus('offline', 'Google Drive not connected');
        }
    }
    
    startAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
        
        this.autoSyncInterval = setInterval(async () => {
            if (window.googleDrive && window.googleDrive.isAuthenticated) {
                await this.syncToGoogleDrive();
            }
        }, this.settings.syncInterval);
        
        console.log('Auto-sync started');
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }
    
    showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (text) text.textContent = message;
        if (overlay) overlay.style.display = 'flex';
    }
    
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    logout() {
        this.currentUser = null;
        this.currentEmployee = null;
        document.getElementById('logoutBtn').style.display = 'none';
        this.showScreen('home');
        this.showToast('Logged out successfully', 'success');
    }
    
    // Additional methods for meeting and employee management
    deleteMeeting(meetingId) {
        if (confirm('Are you sure you want to delete this meeting?')) {
            this.meetings = this.meetings.filter(m => m.id !== meetingId);
            this.saveLocalData();
            this.refreshMeetingsList();
            this.showToast('Meeting deleted', 'success');
            
            // Sync to Google Drive
            if (window.googleDrive && window.googleDrive.isAuthenticated) {
                this.syncToGoogleDrive();
            }
        }
    }
    
    editEmployee(employeeId) {
        // Implementation for editing employee
        this.showToast('Edit employee feature coming soon', 'info');
    }
    
    deleteEmployee(employeeId) {
        if (confirm('Are you sure you want to delete this employee?')) {
            this.employees = this.employees.filter(e => e.id !== employeeId);
            this.saveLocalData();
            this.refreshEmployeesList();
            this.updateDashboardStats();
            this.showToast('Employee deleted', 'success');
            
            // Sync to Google Drive
            if (window.googleDrive && window.googleDrive.isAuthenticated) {
                this.syncToGoogleDrive();
            }
        }
    }
    
    viewAttendance(meetingId) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        const attendees = this.attendanceRecords.filter(r => r.meetingId === meetingId);
        
        this.showToast(`Attendance for "${meeting.title}": ${attendees.length} employees`, 'info');
    }
}

// Global functions for HTML onclick handlers
window.showCreateMeetingForm = function() {
    const form = document.getElementById('createMeetingForm');
    if (form) form.style.display = 'block';
};

window.hideCreateMeetingForm = function() {
    const form = document.getElementById('createMeetingForm');
    if (form) form.style.display = 'none';
};

window.hideQRModal = function() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.classList.remove('active');
};

window.downloadQR = function() {
    const canvas = document.querySelector('#qrCodeContainer canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'qr-code.png';
        link.href = canvas.toDataURL();
        link.click();
    }
};

window.printQR = function() {
    const canvas = document.querySelector('#qrCodeContainer canvas');
    if (canvas) {
        const win = window.open('', '_blank');
        win.document.write(`
            <html>
                <head><title>QR Code</title></head>
                <body style="text-align: center; padding: 20px;">
                    <h2>Meeting QR Code</h2>
                    <img src="${canvas.toDataURL()}" />
                </body>
            </html>
        `);
        win.print();
    }
};

window.refreshEmployees = function() {
    if (window.app) {
        window.app.refreshEmployeesList();
        window.app.showToast('Employee list refreshed', 'success');
    }
};

window.syncDriveData = function() {
    if (window.app && window.googleDrive && window.googleDrive.isAuthenticated) {
        window.app.syncToGoogleDrive();
    } else {
        window.app.showToast('Google Drive not connected', 'error');
    }
};

window.testDriveConnection = function() {
    if (window.googleDrive) {
        window.googleDrive.testConnection();
    } else {
        window.app.showToast('Google Drive integration not available', 'error');
    }
};

window.backupToDrive = function() {
    if (window.app) {
        window.app.syncToGoogleDrive();
    }
};

window.restoreFromDrive = function() {
    if (window.app) {
        window.app.syncFromGoogleDrive();
    }
};

window.exportData = function() {
    if (window.app) {
        const data = {
            employees: window.app.employees,
            meetings: window.app.meetings,
            attendance: window.app.attendanceRecords,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ao_attendance_export.json';
        a.click();
        
        window.app.showToast('Data exported successfully', 'success');
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AttendanceApp();
    console.log('AO War Room Attendance System initialized');
});