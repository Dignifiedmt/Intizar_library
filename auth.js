/**
 * Intizar Digital Library - Admin Authentication & Management
 * FIXED VERSION - Proper backend communication
 */

// Configuration - UPDATE THIS URL!
const ADMIN = {
    // 🔽 MUST BE YOUR ACTUAL DEPLOYED URL (ends with /exec)
    backendUrl: 'https://script.google.com/macros/s/AKfycbwFelKUQ_Tpli9uZYqt50UZcQfQy73rwSlBNze3_p5Fu-WCyIMlGS4YoQ-19bvT5K72CQ/exec',
    
    // Session storage
    token: null,
    tokenExpiry: null,
    adminName: 'Administrator',
    
    // Operation states
    isUploading: false,
    isGenerating: false
};

// DOM Elements
const adminDom = {
    // Screens
    loginScreen: document.getElementById('login-screen'),
    dashboard: document.getElementById('dashboard'),
    
    // Login elements
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('login-btn'),
    loginStatus: document.getElementById('login-status'),
    
    // Dashboard elements
    logoutBtn: document.getElementById('logout-btn'),
    adminName: document.getElementById('admin-name'),
    
    // Stats elements
    statTotal: document.getElementById('stat-total'),
    statPdf: document.getElementById('stat-pdf'),
    statDocx: document.getElementById('stat-docx'),
    statGenerated: document.getElementById('stat-generated'),
    
    // Tabs
    tabs: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Upload form
    uploadForm: document.getElementById('upload-form'),
    uploadTitle: document.getElementById('upload-title'),
    uploadAuthor: document.getElementById('upload-author'),
    uploadFile: document.getElementById('upload-file'),
    uploadSubmit: document.getElementById('upload-submit'),
    uploadReset: document.getElementById('upload-reset'),
    uploadStatus: document.getElementById('upload-status'),
    filePreview: document.getElementById('file-preview'),
    fileName: document.getElementById('file-name'),
    fileSize: document.getElementById('file-size'),
    
    // Generate PDF form
    generateForm: document.getElementById('generate-form'),
    generateTitle: document.getElementById('generate-title'),
    generateAuthor: document.getElementById('generate-author'),
    generateContent: document.getElementById('generate-content'),
    generateSubmit: document.getElementById('generate-submit'),
    generatePreview: document.getElementById('generate-preview'),
    generateStatus: document.getElementById('generate-status'),
    
    // Manage documents
    searchDocs: document.getElementById('search-docs'),
    refreshDocs: document.getElementById('refresh-docs'),
    documentsList: document.getElementById('documents-list'),
    documentsTable: document.getElementById('documents-table'),
    manageStatus: document.getElementById('manage-status'),
    
    // Global status
    dashboardStatus: document.getElementById('dashboard-status'),
};

// ==================== INITIALIZATION ====================

// Load saved session on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel loading...');
    loadSavedSession();
    initEventListeners();
    
    // Check if we have a valid session
    if (isValidSession()) {
        showDashboard();
        loadDashboardData();
    } else {
        showLogin();
    }
});

// ==================== SESSION MANAGEMENT ====================

function loadSavedSession() {
    // Try to load from localStorage
    try {
        ADMIN.token = localStorage.getItem('admin_token');
        ADMIN.tokenExpiry = localStorage.getItem('admin_token_expiry');
        ADMIN.adminName = localStorage.getItem('admin_name') || 'Administrator';
        
        console.log('Loaded token from storage:', ADMIN.token ? 'Yes' : 'No');
    } catch (e) {
        console.warn('Could not load session from localStorage:', e.message);
    }
}

function isValidSession() {
    if (!ADMIN.token || !ADMIN.tokenExpiry) {
        return false;
    }
    
    const now = Date.now();
    const expiry = parseInt(ADMIN.tokenExpiry, 10);
    
    if (now > expiry) {
        clearSession();
        return false;
    }
    
    return true;
}

function saveSession(token, username) {
    ADMIN.token = token;
    ADMIN.adminName = username;
    ADMIN.tokenExpiry = (Date.now() + (60 * 60 * 1000)).toString(); // 1 hour
    
    try {
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_token_expiry', ADMIN.tokenExpiry);
        localStorage.setItem('admin_name', username);
        console.log('Session saved to localStorage');
    } catch (e) {
        console.warn('Could not save to localStorage:', e.message);
    }
}

function clearSession() {
    ADMIN.token = null;
    ADMIN.tokenExpiry = null;
    
    try {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token_expiry');
        localStorage.removeItem('admin_name');
    } catch (e) {
        console.warn('Could not clear localStorage:', e.message);
    }
}

// ==================== AUTHENTICATION ====================

async function handleLogin(event) {
    event.preventDefault();
    console.log('Login attempt...');
    
    const username = adminDom.usernameInput.value.trim();
    const password = adminDom.passwordInput.value;
    
    if (!username || !password) {
        showMessage(adminDom.loginStatus, 'Please enter both username and password.', 'error');
        return;
    }
    
    // Show loading state
    const originalText = adminDom.loginBtn.innerHTML;
    adminDom.loginBtn.innerHTML = '<span class="loading"></span> Authenticating...';
    adminDom.loginBtn.disabled = true;
    
    try {
        console.log('Sending login request to:', ADMIN.backendUrl);
        
        // FIXED: Use proper form data format that matches your backend
        const formData = new URLSearchParams();
        formData.append('action', 'login');
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch(ADMIN.backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        
        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Login response:', result);
        
        if (result.success && result.token) {
            // Save session
            saveSession(result.token, username);
            
            // Show success
            showMessage(adminDom.loginStatus, 
                '<i class="fas fa-check-circle"></i> Login successful!', 
                'success'
            );
            
            // Switch to dashboard
            setTimeout(() => {
                showDashboard();
                loadDashboardData();
            }, 1000);
            
        } else {
            showMessage(adminDom.loginStatus, 
                `<i class="fas fa-exclamation-circle"></i> ${result.error || 'Login failed'}`, 
                'error'
            );
            adminDom.passwordInput.value = '';
            adminDom.passwordInput.focus();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(adminDom.loginStatus, 
            '<i class="fas fa-exclamation-circle"></i> Network error. Check console for details.', 
            'error'
        );
    } finally {
        adminDom.loginBtn.innerHTML = originalText;
        adminDom.loginBtn.disabled = false;
    }
}

async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        if (ADMIN.token) {
            try {
                await fetch(`${ADMIN.backendUrl}?action=logout&token=${encodeURIComponent(ADMIN.token)}`);
            } catch (e) {
                console.warn('Logout API call failed:', e);
            }
        }
        
        clearSession();
        showLogin();
        
        // Clear forms
        if (adminDom.loginForm) adminDom.loginForm.reset();
        if (adminDom.uploadForm) adminDom.uploadForm.reset();
        if (adminDom.generateForm) adminDom.generateForm.reset();
        
        showMessage(adminDom.loginStatus, 'Successfully logged out.', 'success');
    }
}

// ==================== DASHBOARD FUNCTIONS ====================

async function loadDashboardData() {
    if (!isValidSession()) {
        showLogin();
        return;
    }
    
    adminDom.adminName.textContent = ADMIN.adminName;
    await loadDocuments();
    updateStats();
}

async function loadDocuments() {
    if (!isValidSession()) return;
    
    try {
        const response = await fetch(`${ADMIN.backendUrl}?action=getDocuments`);
        const result = await response.json();
        
        if (result.success && result.documents) {
            renderDocuments(result.documents);
            updateStats(result.documents);
        } else {
            throw new Error(result.error || 'Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        adminDom.documentsList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem; color: #721c24;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load documents: ${error.message}</p>
                </td>
            </tr>
        `;
    }
}

function updateStats(documents = []) {
    if (!documents.length) {
        adminDom.statTotal.textContent = '0';
        adminDom.statPdf.textContent = '0';
        adminDom.statDocx.textContent = '0';
        adminDom.statGenerated.textContent = '0';
        return;
    }
    
    const pdfCount = documents.filter(d => d.Type === 'PDF').length;
    const docxCount = documents.filter(d => d.Type === 'DOCX').length;
    const generatedCount = documents.filter(d => d.Type === 'Generated PDF').length;
    
    adminDom.statTotal.textContent = documents.length;
    adminDom.statPdf.textContent = pdfCount;
    adminDom.statDocx.textContent = docxCount;
    adminDom.statGenerated.textContent = generatedCount;
}

function renderDocuments(documents) {
    if (!documents || documents.length === 0) {
        adminDom.documentsList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-inbox"></i>
                    <p>No documents found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    documents.forEach(doc => {
        const date = doc.DateAdded ? new Date(doc.DateAdded).toLocaleDateString() : 'Unknown';
        const typeClass = doc.Type === 'PDF' ? 'doc-type-pdf' :
                         doc.Type === 'DOCX' ? 'doc-type-docx' : 'doc-type-generated';
        
        html += `
            <tr>
                <td><strong>${escapeHtml(doc.Title || 'Untitled')}</strong></td>
                <td>${escapeHtml(doc.Author || 'Unknown')}</td>
                <td><span class="doc-type-badge ${typeClass}">${doc.Type || 'Unknown'}</span></td>
                <td>${date}</td>
                <td>
                    <div class="action-buttons">
                        <a href="${doc.DriveUrl || '#'}" target="_blank" class="action-btn view">
                            <i class="fas fa-eye"></i> View
                        </a>
                        <a href="${doc.DriveUrl || '#'}" download class="action-btn view">
                            <i class="fas fa-download"></i>
                        </a>
                    </div>
                </td>
            </tr>
        `;
    });
    
    adminDom.documentsList.innerHTML = html;
}

// ==================== FILE UPLOAD ====================

async function handleFileUpload(event) {
    event.preventDefault();
    
    if (!isValidSession()) {
        showMessage(adminDom.uploadStatus, 'Session expired. Please login again.', 'error');
        showLogin();
        return;
    }
    
    const title = adminDom.uploadTitle.value.trim();
    const author = adminDom.uploadAuthor.value.trim();
    const file = adminDom.uploadFile.files[0];
    
    if (!title || !author || !file) {
        showMessage(adminDom.uploadStatus, 'Please fill all fields and select a file.', 'error');
        return;
    }
    
    // Show loading
    ADMIN.isUploading = true;
    const originalText = adminDom.uploadSubmit.innerHTML;
    adminDom.uploadSubmit.innerHTML = '<span class="loading"></span> Uploading...';
    adminDom.uploadSubmit.disabled = true;
    
    try {
        const base64 = await readFileAsBase64(file);
        
        // FIXED: Use proper JSON format that matches your backend
        const payload = {
            action: 'upload',
            token: ADMIN.token,
            fileName: file.name,
            mimeType: file.type,
            fileBase64: base64.split(',')[1],
            metadata: { title, author }
        };
        
        const response = await fetch(ADMIN.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(adminDom.uploadStatus, 
                `File uploaded successfully! <a href="${result.fileUrl}" target="_blank">View file</a>`, 
                'success'
            );
            adminDom.uploadForm.reset();
            adminDom.filePreview.classList.add('hidden');
            await loadDocuments();
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        showMessage(adminDom.uploadStatus, 
            `Upload failed: ${error.message}`, 
            'error'
        );
    } finally {
        ADMIN.isUploading = false;
        adminDom.uploadSubmit.innerHTML = originalText;
        adminDom.uploadSubmit.disabled = false;
    }
}

// ==================== UI FUNCTIONS ====================

function showLogin() {
    adminDom.loginScreen.classList.remove('hidden');
    adminDom.dashboard.classList.add('hidden');
    document.title = 'Admin Login - Intizar Library';
}

function showDashboard() {
    adminDom.loginScreen.classList.add('hidden');
    adminDom.dashboard.classList.remove('hidden');
    document.title = 'Admin Dashboard - Intizar Library';
}

function switchTab(tabId) {
    adminDom.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    adminDom.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
    
    if (tabId === 'manage') {
        loadDocuments();
    }
}

// ==================== UTILITY FUNCTIONS ====================

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(container, message, type = 'info') {
    if (!container) return;
    
    container.innerHTML = '';
    if (!message) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message status-${type}`;
    messageDiv.innerHTML = message;
    container.appendChild(messageDiv);
    
    if (type === 'success') {
        setTimeout(() => messageDiv.remove(), 5000);
    }
}

// ==================== EVENT LISTENERS ====================

function initEventListeners() {
    // Login form
    if (adminDom.loginForm) {
        adminDom.loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    if (adminDom.logoutBtn) {
        adminDom.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Tabs
    adminDom.tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // File upload
    if (adminDom.uploadForm) {
        adminDom.uploadForm.addEventListener('submit', handleFileUpload);
    }
    
    if (adminDom.uploadFile) {
        adminDom.uploadFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                adminDom.filePreview.classList.remove('hidden');
                adminDom.fileName.textContent = file.name;
                adminDom.fileSize.textContent = formatFileSize(file.size);
            }
        });
    }
    
    if (adminDom.uploadReset) {
        adminDom.uploadReset.addEventListener('click', function() {
            if (confirm('Clear form?')) {
                adminDom.uploadForm.reset();
                adminDom.filePreview.classList.add('hidden');
            }
        });
    }
    
    // PDF generation
    if (adminDom.generateForm) {
        adminDom.generateForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!isValidSession()) {
                showMessage(adminDom.generateStatus, 'Session expired. Please login again.', 'error');
                showLogin();
                return;
            }
            
            const title = adminDom.generateTitle.value.trim();
            const author = adminDom.generateAuthor.value.trim();
            const content = adminDom.generateContent.value.trim();
            
            if (!title || !author || !content) {
                showMessage(adminDom.generateStatus, 'Please fill all fields.', 'error');
                return;
            }
            
            // Show loading
            ADMIN.isGenerating = true;
            const originalText = adminDom.generateSubmit.innerHTML;
            adminDom.generateSubmit.innerHTML = '<span class="loading"></span> Generating...';
            adminDom.generateSubmit.disabled = true;
            
            try {
                const payload = {
                    action: 'generatePdf',
                    token: ADMIN.token,
                    formData: { title, author, body: content }
                };
                
                const response = await fetch(ADMIN.backendUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(adminDom.generateStatus, 
                        `PDF generated! <a href="${result.fileUrl}" target="_blank">View PDF</a>`, 
                        'success'
                    );
                    adminDom.generateForm.reset();
                    await loadDocuments();
                } else {
                    throw new Error(result.error || 'Generation failed');
                }
            } catch (error) {
                showMessage(adminDom.generateStatus, 
                    `PDF generation failed: ${error.message}`, 
                    'error'
                );
            } finally {
                ADMIN.isGenerating = false;
                adminDom.generateSubmit.innerHTML = originalText;
                adminDom.generateSubmit.disabled = false;
            }
        });
    }
    
    if (adminDom.generatePreview) {
        adminDom.generatePreview.addEventListener('click', function() {
            const content = adminDom.generateContent.value;
            if (content) {
                const win = window.open('', '_blank');
                win.document.write(`
                    <html><body style="font-family: 'Times New Roman'; margin: 2cm;">
                    <h1>Preview</h1>
                    <div>${content.replace(/\n/g, '<br>')}</div>
                    </body></html>
                `);
                win.document.close();
            }
        });
    }
    
    // Document management
    if (adminDom.refreshDocs) {
        adminDom.refreshDocs.addEventListener('click', loadDocuments);
    }
    
    if (adminDom.searchDocs) {
        adminDom.searchDocs.addEventListener('input', function() {
            // Simple search - you can enhance this
            const searchTerm = this.value.toLowerCase();
            const rows = adminDom.documentsList.querySelectorAll('tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==================== DEBUG HELPER ====================

// Add this to test if your script is loading
console.log('auth.js loaded successfully');
console.log('Backend URL:', ADMIN.backendUrl);
