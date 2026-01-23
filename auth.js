/**
 * Intizar Digital Library - Admin Authentication & Management
 * CORRECTED VERSION - Complete and working
 */

// Configuration - MUST UPDATE WITH YOUR URL!
const ADMIN = {
    // 🔽 REPLACE WITH YOUR ACTUAL URL (ends with /exec)
    backendUrl: 'https://script.google.com/macros/s/AKfycbwFelKUQ_Tpli9uZYqt50UZcQfQy73rwSlBNze3_p5Fu-WCyIMlGS4YoQ-19bvT5K72CQ/exec',
    
    // Session management
    token: localStorage.getItem('admin_token') || null,
    tokenExpiry: localStorage.getItem('admin_token_expiry') || null,
    adminName: localStorage.getItem('admin_name') || 'Administrator',
    
    // Operation states
    isUploading: false,
    isGenerating: false,
    isLoading: false
};

// DOM Elements Storage
const adminDom = {};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel initializing...');
    
    // Load elements
    loadElements();
    
    // Initialize event listeners
    initEventListeners();
    
    // Check existing session
    if (checkSession()) {
        showDashboard();
        setTimeout(() => loadDashboardData(), 100);
    } else {
        showLogin();
    }
});

// ==================== ELEMENT LOADING ====================

function loadElements() {
    // Main containers
    adminDom.loginScreen = document.getElementById('login-screen');
    adminDom.dashboard = document.getElementById('dashboard');
    
    // Login elements
    adminDom.loginForm = document.getElementById('login-form');
    adminDom.usernameInput = document.getElementById('username');
    adminDom.passwordInput = document.getElementById('password');
    adminDom.loginBtn = document.getElementById('login-btn');
    adminDom.loginStatus = document.getElementById('login-status');
    
    // Dashboard elements
    adminDom.logoutBtn = document.getElementById('logout-btn');
    adminDom.adminName = document.getElementById('admin-name');
    adminDom.statTotal = document.getElementById('stat-total');
    adminDom.statPdf = document.getElementById('stat-pdf');
    adminDom.statDocx = document.getElementById('stat-docx');
    adminDom.statGenerated = document.getElementById('stat-generated');
    adminDom.dashboardStatus = document.getElementById('dashboard-status');
    
    // Form elements
    adminDom.uploadForm = document.getElementById('upload-form');
    adminDom.generateForm = document.getElementById('generate-form');
    adminDom.documentsList = document.getElementById('documents-list');
    adminDom.searchDocs = document.getElementById('search-docs');
    
    console.log('Elements loaded successfully');
}

// ==================== SESSION MANAGEMENT ====================

function checkSession() {
    if (!ADMIN.token || !ADMIN.tokenExpiry) {
        return false;
    }
    
    const now = Date.now();
    const expiry = parseInt(ADMIN.tokenExpiry, 10);
    
    // Clear expired session
    if (now > expiry) {
        showNotification('Session expired. Please login again.', 'warning');
        clearSession();
        return false;
    }
    
    return true;
}

function saveSession(token, username) {
    ADMIN.token = token;
    ADMIN.adminName = username;
    ADMIN.tokenExpiry = (Date.now() + (60 * 60 * 1000)).toString();
    
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_token_expiry', ADMIN.tokenExpiry);
    localStorage.setItem('admin_name', username);
    
    console.log('Session saved for:', username);
}

function clearSession() {
    ADMIN.token = null;
    ADMIN.tokenExpiry = null;
    ADMIN.adminName = 'Administrator';
    
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token_expiry');
    localStorage.removeItem('admin_name');
    
    console.log('Session cleared');
}

// ==================== FIXED LOGIN FUNCTION ====================

async function handleLogin(event) {
    event.preventDefault();
    
    if (ADMIN.isLoading) {
        showNotification('Please wait...', 'info');
        return;
    }
    
    const username = adminDom.usernameInput?.value?.trim() || '';
    const password = adminDom.passwordInput?.value || '';
    
    // Validation
    if (!username || !password) {
        showNotification('Please enter both username and password', 'error');
        return;
    }
    
    // Show loading state
    showLoading(true, 'login');
    
    try {
        console.log('🔄 Attempting login for:', username);
        
        // Prepare form data
        const formData = new URLSearchParams();
        formData.append('action', 'login');
        formData.append('username', username);
        formData.append('password', password);
        
        console.log('📤 Sending request to:', ADMIN.backendUrl);
        
        const response = await fetch(ADMIN.backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        
        // Check if response is okay
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📥 Login response:', result);
        
        if (result.success && result.token) {
            // Success! Save session
            saveSession(result.token, username);
            
            // Show success message
            showNotification('✅ Login successful! Loading dashboard...', 'success');
            
            // Switch to dashboard after delay
            setTimeout(() => {
                showDashboard();
                loadDashboardData();
            }, 1500);
            
        } else {
            // Login failed
            throw new Error(result.error || 'Invalid credentials');
        }
        
    } catch (error) {
        console.error('❌ Login failed:', error);
        
        // Show detailed error message
        let errorMsg = 'Login failed. ';
        
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMsg += 'Cannot connect to server. Check your internet connection and backend URL.';
        } else if (error.message.includes('Invalid credentials')) {
            errorMsg += 'Username or password is incorrect.';
        } else {
            errorMsg += error.message;
        }
        
        showNotification(errorMsg, 'error');
        
        // Clear password field
        if (adminDom.passwordInput) {
            adminDom.passwordInput.value = '';
            adminDom.passwordInput.focus();
        }
        
    } finally {
        // Hide loading state
        showLoading(false, 'login');
    }
}

// ==================== LOGOUT FUNCTION ====================

async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }
    
    try {
        // Send logout request if we have a token
        if (ADMIN.token) {
            await fetch(`${ADMIN.backendUrl}?action=logout&token=${encodeURIComponent(ADMIN.token)}`)
                .catch(e => console.warn('Logout API call failed:', e));
        }
        
        // Clear local session
        clearSession();
        
        // Reset forms
        if (adminDom.loginForm) adminDom.loginForm.reset();
        if (adminDom.uploadForm) adminDom.uploadForm.reset();
        if (adminDom.generateForm) adminDom.generateForm.reset();
        
        // Show login screen
        showLogin();
        
        // Show notification
        showNotification('✅ Successfully logged out.', 'success');
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed: ' + error.message, 'error');
    }
}

// ==================== DASHBOARD FUNCTIONS ====================

async function loadDashboardData() {
    if (!checkSession()) {
        showLogin();
        return;
    }
    
    // Update admin name
    if (adminDom.adminName) {
        adminDom.adminName.textContent = ADMIN.adminName;
    }
    
    // Load documents
    await loadDocuments();
    
    // Update stats
    updateStats();
    
    // Show welcome message
    showNotification(`Welcome back, ${ADMIN.adminName}!`, 'success');
}

async function loadDocuments() {
    if (!checkSession()) return;
    
    // Show loading
    if (adminDom.documentsList) {
        adminDom.documentsList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <div class="loading-spinner"></div>
                    <p>Loading documents...</p>
                </td>
            </tr>
        `;
    }
    
    try {
        const response = await fetch(`${ADMIN.backendUrl}?action=getDocuments`);
        const result = await response.json();
        
        if (result.success && result.documents) {
            renderDocuments(result.documents);
            updateStatsFromDocuments(result.documents);
            showNotification(`Loaded ${result.documents.length} documents`, 'success');
        } else {
            throw new Error(result.error || 'Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        showNotification('Failed to load documents: ' + error.message, 'error');
        
        if (adminDom.documentsList) {
            adminDom.documentsList.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 3rem; color: #721c24;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Failed to load documents</p>
                        <p style="font-size: 0.9rem;">${error.message}</p>
                        <button onclick="loadDocuments()" class="retry-btn">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

function updateStatsFromDocuments(documents) {
    if (!documents) return;
    
    const stats = {
        total: documents.length,
        pdf: documents.filter(doc => doc.Type === 'PDF').length,
        docx: documents.filter(doc => doc.Type === 'DOCX').length,
        generated: documents.filter(doc => doc.Type === 'Generated PDF').length
    };
    
    // Update DOM elements
    if (adminDom.statTotal) adminDom.statTotal.textContent = stats.total;
    if (adminDom.statPdf) adminDom.statPdf.textContent = stats.pdf;
    if (adminDom.statDocx) adminDom.statDocx.textContent = stats.docx;
    if (adminDom.statGenerated) adminDom.statGenerated.textContent = stats.generated;
}

function updateStats() {
    // This function is called when we don't have documents yet
    // Set all to 0 initially
    if (adminDom.statTotal) adminDom.statTotal.textContent = '0';
    if (adminDom.statPdf) adminDom.statPdf.textContent = '0';
    if (adminDom.statDocx) adminDom.statDocx.textContent = '0';
    if (adminDom.statGenerated) adminDom.statGenerated.textContent = '0';
}

// ==================== UI MANAGEMENT ====================

function showLogin() {
    if (adminDom.loginScreen) {
        adminDom.loginScreen.classList.remove('hidden');
    }
    if (adminDom.dashboard) {
        adminDom.dashboard.classList.add('hidden');
    }
    
    document.title = 'Admin Login - Intizar Library';
    
    // Focus on username field
    setTimeout(() => {
        if (adminDom.usernameInput) {
            adminDom.usernameInput.focus();
        }
    }, 100);
}

function showDashboard() {
    if (adminDom.loginScreen) {
        adminDom.loginScreen.classList.add('hidden');
    }
    if (adminDom.dashboard) {
        adminDom.dashboard.classList.remove('hidden');
    }
    
    document.title = 'Admin Dashboard - Intizar Library';
    
    // Set first tab as active
    switchTab('upload');
}

function showLoading(isLoading, type = 'general') {
    ADMIN.isLoading = isLoading;
    
    if (type === 'login' && adminDom.loginBtn) {
        if (isLoading) {
            adminDom.loginBtn.innerHTML = '<span class="loading-spinner"></span> Authenticating...';
            adminDom.loginBtn.disabled = true;
        } else {
            adminDom.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Dashboard';
            adminDom.loginBtn.disabled = false;
        }
    }
}

// ==================== TAB MANAGEMENT ====================

function switchTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(tab => {
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// ==================== NOTIFICATION SYSTEM ====================

function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Remove existing notifications
    const existing = document.querySelectorAll('.notification');
    existing.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getIconForType(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Auto-remove after 5 seconds (10 for errors)
    const duration = type === 'error' ? 10000 : 5000;
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

function getIconForType(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// ==================== EVENT LISTENERS ====================

function initEventListeners() {
    console.log('Initializing event listeners...');
    
    // Login form
    if (adminDom.loginForm) {
        console.log('Login form found, adding listener');
        adminDom.loginForm.addEventListener('submit', handleLogin);
        
        // Also listen for Enter key
        adminDom.passwordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !ADMIN.isLoading) {
                handleLogin(e);
            }
        });
    } else {
        console.warn('Login form not found!');
    }
    
    // Logout button
    if (adminDom.logoutBtn) {
        adminDom.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Refresh documents button
    const refreshBtn = document.getElementById('refresh-docs');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showNotification('Refreshing document list...', 'info');
            loadDocuments();
        });
    }
    
    // Form reset buttons
    const uploadResetBtn = document.getElementById('upload-reset');
    if (uploadResetBtn) {
        uploadResetBtn.addEventListener('click', () => {
            if (adminDom.uploadForm) {
                adminDom.uploadForm.reset();
                showNotification('Form cleared', 'info');
            }
        });
    }
    
    // File preview for upload
    const uploadFileInput = document.getElementById('upload-file');
    if (uploadFileInput) {
        uploadFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const preview = document.getElementById('file-preview');
                const fileName = document.getElementById('file-name');
                const fileSize = document.getElementById('file-size');
                
                if (preview && fileName && fileSize) {
                    preview.classList.remove('hidden');
                    fileName.textContent = file.name;
                    fileSize.textContent = `${(file.size / 1024).toFixed(2)} KB`;
                }
            }
        });
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key to cancel/focus
        if (e.key === 'Escape') {
            if (ADMIN.isLoading) {
                showNotification('Operation cancelled', 'warning');
            }
        }
        
        // Ctrl/Cmd + L to focus login
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            if (adminDom.usernameInput) {
                adminDom.usernameInput.focus();
            }
        }
    });
    
    console.log('Event listeners initialized');
}

// ==================== UTILITY FUNCTIONS ====================

function renderDocuments(documents) {
    if (!adminDom.documentsList) return;
    
    if (!documents || documents.length === 0) {
        adminDom.documentsList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-inbox"></i>
                    <p>No documents found</p>
                    <p style="font-size: 0.9rem;">Upload your first document to get started</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    documents.forEach(doc => {
        const date = new Date(doc.DateAdded).toLocaleDateString();
        const typeClass = doc.Type === 'PDF' ? 'doc-type-pdf' :
                         doc.Type === 'DOCX' ? 'doc-type-docx' :
                         'doc-type-generated';
        
        html += `
            <tr>
                <td><strong>${escapeHtml(doc.Title || 'Untitled')}</strong></td>
                <td>${escapeHtml(doc.Author || 'Unknown')}</td>
                <td><span class="doc-type-badge ${typeClass}">${doc.Type}</span></td>
                <td>${date}</td>
                <td>
                    <div class="action-buttons">
                        <a href="${doc.DriveUrl}" target="_blank" class="action-btn view">
                            <i class="fas fa-eye"></i> View
                        </a>
                        <a href="${doc.DriveUrl}" download class="action-btn download">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                </td>
            </tr>
        `;
    });
    
    adminDom.documentsList.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== CSS FOR NOTIFICATIONS & LOADING ====================

function addStyles() {
    // Check if styles are already added
    if (document.getElementById('admin-dynamic-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'admin-dynamic-styles';
    style.textContent = `
        /* Loading spinner */
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(19, 97, 74, 0.3);
            border-radius: 50%;
            border-top-color: #13614a;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
            vertical-align: middle;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Notifications */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 0;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            transform: translateX(150%);
            transition: transform 0.3s ease;
            max-width: 400px;
            overflow: hidden;
        }
        
        .notification.show {
            transform: translateX(0);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            gap: 12px;
        }
        
        .notification-success {
            background: #d4edda;
            color: #155724;
            border-left: 4px solid #28a745;
        }
        
        .notification-error {
            background: #f8d7da;
            color: #721c24;
            border-left: 4px solid #dc3545;
        }
        
        .notification-warning {
            background: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffc107;
        }
        
        .notification-info {
            background: #d1ecf1;
            color: #0c5460;
            border-left: 4px solid #17a2b8;
        }
        
        .notification i {
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        
        .notification-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: inherit;
            cursor: pointer;
            margin-left: auto;
            padding: 0 5px;
        }
        
        /* Retry button */
        .retry-btn {
            background: #13614a;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
        }
        
        .retry-btn:hover {
            background: #0b3d2e;
        }
        
        /* Disabled states */
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        /* Hidden class */
        .hidden {
            display: none !important;
        }
        
        /* Action buttons in table */
        .action-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: all 0.3s;
            text-decoration: none;
        }
        
        .action-btn.view {
            background: #f0f7f4;
            color: var(--primary-dark);
        }
        
        .action-btn.download {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
    `;
    document.head.appendChild(style);
}

// Add styles when page loads
addStyles();

// Make functions available globally for debugging
window.ADMIN = ADMIN;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.loadDocuments = loadDocuments;
