/**
 * Intizar Digital Library - Admin Authentication & Management
 * Version 2.0 - Complete rewrite with enhanced features
 */

// Configuration
const ADMIN = {
    backendUrl: 'https://script.google.com/macros/s/AKfycbwFelKUQ_Tpli9uZYqt50UZcQfQy73rwSlBNze3_p5Fu-WCyIMlGS4YoQ-19bvT5K72CQ/exec', // REPLACE WITH YOUR DEPLOYED WEB APP URL
    token: localStorage.getItem('admin_token') || null,
    tokenExpiry: localStorage.getItem('admin_token_expiry') || null,
    adminName: localStorage.getItem('admin_name') || 'Administrator',
    
    // Operation states
    isUploading: false,
    isGenerating: false,
    isLoading: false,
    
    // Cache for documents
    cachedDocuments: [],
    cacheTimestamp: null,
    CACHE_TTL: 300000, // 5 minutes
    
    // Session management
    sessionTimer: null,
    sessionCheckInterval: 60000, // Check every minute
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

// ==================== SESSION MANAGEMENT ====================

/**
 * Check if session is valid
 */
function isValidSession() {
    if (!ADMIN.token || !ADMIN.tokenExpiry) {
        return false;
    }
    
    const now = Date.now();
    const expiry = parseInt(ADMIN.tokenExpiry, 10);
    
    // Clear expired session
    if (now > expiry) {
        clearSession();
        return false;
    }
    
    // Check with server if token is still valid (optional)
    return true;
}

/**
 * Create new session
 */
function createSession(username) {
    const token = generateToken();
    const expiry = Date.now() + (60 * 60 * 1000); // 1 hour
    
    ADMIN.token = token;
    ADMIN.tokenExpiry = expiry;
    ADMIN.adminName = username;
    
    // Store in localStorage
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_token_expiry', expiry.toString());
    localStorage.setItem('admin_name', username);
    
    // Start session timer
    startSessionTimer();
    
    return token;
}

/**
 * Clear session data
 */
function clearSession() {
    // Clear server-side session
    if (ADMIN.token) {
        fetch(`${ADMIN.backendUrl}?action=logout&token=${encodeURIComponent(ADMIN.token)}`)
            .catch(() => {});
    }
    
    // Clear local data
    ADMIN.token = null;
    ADMIN.tokenExpiry = null;
    ADMIN.adminName = 'Administrator';
    
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_token_expiry');
    localStorage.removeItem('admin_name');
    
    // Clear timers
    if (ADMIN.sessionTimer) {
        clearInterval(ADMIN.sessionTimer);
        ADMIN.sessionTimer = null;
    }
    
    // Clear cache
    ADMIN.cachedDocuments = [];
    ADMIN.cacheTimestamp = null;
}

/**
 * Start session timer
 */
function startSessionTimer() {
    if (ADMIN.sessionTimer) {
        clearInterval(ADMIN.sessionTimer);
    }
    
    ADMIN.sessionTimer = setInterval(() => {
        if (!isValidSession()) {
            showSessionExpired();
            clearSession();
            showLogin();
        } else {
            // Update UI with remaining time
            updateSessionTimer();
        }
    }, ADMIN.sessionCheckInterval);
}

/**
 * Update session timer display
 */
function updateSessionTimer() {
    if (!ADMIN.tokenExpiry) return;
    
    const now = Date.now();
    const expiry = parseInt(ADMIN.tokenExpiry, 10);
    const remaining = expiry - now;
    
    // Warn 5 minutes before expiry
    if (remaining < 5 * 60 * 1000 && remaining > 0) {
        showToast('Session will expire in ' + Math.ceil(remaining / 60000) + ' minutes', 'warning');
    }
}

/**
 * Show session expired message
 */
function showSessionExpired() {
    showToast('Your session has expired. Please login again.', 'error');
}

// ==================== AUTHENTICATION ====================

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = adminDom.usernameInput.value.trim();
    const password = adminDom.passwordInput.value;
    
    // Validation
    if (!username || !password) {
        showMessage(adminDom.loginStatus, 'Please enter both username and password.', 'error');
        return;
    }
    
    // Disable login button
    const originalText = adminDom.loginBtn.innerHTML;
    adminDom.loginBtn.innerHTML = '<span class="loading"></span> Authenticating...';
    adminDom.loginBtn.disabled = true;
    
    try {
        const response = await fetch(ADMIN.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'login',
                username: username,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.token) {
            // Create session
            createSession(username);
            
            // Show success message
            showMessage(adminDom.loginStatus, 
                '<i class="fas fa-check-circle"></i> Login successful! Redirecting to dashboard...', 
                'success'
            );
            
            // Switch to dashboard after delay
            setTimeout(() => {
                showDashboard();
                loadDashboardData();
            }, 1500);
            
        } else {
            showMessage(adminDom.loginStatus, 
                `<i class="fas fa-exclamation-circle"></i> ${result.error || 'Invalid credentials'}`, 
                'error'
            );
            adminDom.passwordInput.value = '';
            adminDom.passwordInput.focus();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(adminDom.loginStatus, 
            '<i class="fas fa-exclamation-circle"></i> Network error. Please check your connection.', 
            'error'
        );
    } finally {
        // Restore login button
        adminDom.loginBtn.innerHTML = originalText;
        adminDom.loginBtn.disabled = false;
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session
        clearSession();
        
        // Clear forms
        if (adminDom.loginForm) adminDom.loginForm.reset();
        if (adminDom.uploadForm) adminDom.uploadForm.reset();
        if (adminDom.generateForm) adminDom.generateForm.reset();
        
        // Show login screen
        showLogin();
        
        // Show logout message
        showToast('Successfully logged out.', 'success');
    }
}

// ==================== DASHBOARD MANAGEMENT ====================

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    if (!isValidSession()) {
        showLogin();
        return;
    }
    
    // Update admin name
    adminDom.adminName.textContent = ADMIN.adminName;
    
    // Load documents and stats
    await loadDocuments();
    updateStats();
}

/**
 * Load documents from backend
 */
async function loadDocuments(forceRefresh = false) {
    if (!isValidSession()) return;
    
    // Check cache
    const now = Date.now();
    if (!forceRefresh && 
        ADMIN.cachedDocuments.length > 0 && 
        ADMIN.cacheTimestamp && 
        (now - ADMIN.cacheTimestamp) < ADMIN.CACHE_TTL) {
        
        renderDocuments(ADMIN.cachedDocuments);
        return;
    }
    
    // Show loading state
    adminDom.documentsList.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 3rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #ccc;"></i>
                <p style="margin-top: 1rem; color: #666;">Loading documents...</p>
            </td>
        </tr>
    `;
    
    try {
        const response = await fetch(`${ADMIN.backendUrl}?action=getDocuments`);
        const result = await response.json();
        
        if (result.success && result.documents) {
            // Cache documents
            ADMIN.cachedDocuments = result.documents;
            ADMIN.cacheTimestamp = now;
            
            // Render documents
            renderDocuments(result.documents);
            
            // Update stats
            updateStats();
            
        } else {
            throw new Error(result.error || 'Failed to load documents');
        }
        
    } catch (error) {
        console.error('Error loading documents:', error);
        adminDom.documentsList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem; color: #721c24;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p style="margin-top: 1rem;">Failed to load documents: ${error.message}</p>
                    <button onclick="loadDocuments(true)" class="btn btn-secondary" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Update dashboard statistics
 */
function updateStats() {
    if (!ADMIN.cachedDocuments.length) {
        adminDom.statTotal.textContent = '0';
        adminDom.statPdf.textContent = '0';
        adminDom.statDocx.textContent = '0';
        adminDom.statGenerated.textContent = '0';
        return;
    }
    
    const docs = ADMIN.cachedDocuments;
    
    // Count by type
    const pdfCount = docs.filter(doc => doc.Type === 'PDF').length;
    const docxCount = docs.filter(doc => doc.Type === 'DOCX').length;
    const generatedCount = docs.filter(doc => doc.Type === 'Generated PDF').length;
    
    // Update UI
    adminDom.statTotal.textContent = docs.length;
    adminDom.statPdf.textContent = pdfCount;
    adminDom.statDocx.textContent = docxCount;
    adminDom.statGenerated.textContent = generatedCount;
}

/**
 * Render documents in table
 */
function renderDocuments(documents) {
    if (!documents || documents.length === 0) {
        adminDom.documentsList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-inbox" style="font-size: 2rem; color: #ccc;"></i>
                    <p style="margin-top: 1rem; color: #666;">No documents found</p>
                    <p style="font-size: 0.9rem; color: #999;">Upload your first document to get started</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Filter by search if applicable
    const searchTerm = adminDom.searchDocs ? adminDom.searchDocs.value.toLowerCase() : '';
    const filteredDocs = searchTerm ? 
        documents.filter(doc => 
            (doc.Title && doc.Title.toLowerCase().includes(searchTerm)) ||
            (doc.Author && doc.Author.toLowerCase().includes(searchTerm)) ||
            (doc.Type && doc.Type.toLowerCase().includes(searchTerm))
        ) : documents;
    
    // Sort by date (newest first)
    const sortedDocs = [...filteredDocs].sort((a, b) => {
        const dateA = new Date(a.DateAdded || 0);
        const dateB = new Date(b.DateAdded || 0);
        return dateB - dateA;
    });
    
    // Generate HTML
    let html = '';
    
    sortedDocs.forEach(doc => {
        const date = doc.DateAdded ? 
            new Date(doc.DateAdded).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'Unknown';
        
        const typeClass = doc.Type === 'PDF' ? 'doc-type-pdf' :
                         doc.Type === 'DOCX' ? 'doc-type-docx' :
                         'doc-type-generated';
        
        html += `
            <tr>
                <td>
                    <strong>${escapeHtml(doc.Title || 'Untitled')}</strong>
                </td>
                <td>${escapeHtml(doc.Author || 'Unknown')}</td>
                <td>
                    <span class="doc-type-badge ${typeClass}">
                        ${escapeHtml(doc.Type || 'Unknown')}
                    </span>
                </td>
                <td>${date}</td>
                <td>
                    <div class="action-buttons">
                        <a href="${doc.DriveUrl || '#'}" target="_blank" 
                           class="action-btn view" title="View Document">
                            <i class="fas fa-eye"></i> View
                        </a>
                        <a href="${doc.DriveUrl || '#'}" download 
                           class="action-btn view" title="Download">
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

/**
 * Handle file upload
 */
async function handleFileUpload(event) {
    event.preventDefault();
    
    if (!isValidSession()) {
        showSessionExpired();
        return;
    }
    
    if (ADMIN.isUploading) {
        showMessage(adminDom.uploadStatus, 'Upload already in progress. Please wait.', 'error');
        return;
    }
    
    // Get form data
    const title = adminDom.uploadTitle.value.trim();
    const author = adminDom.uploadAuthor.value.trim();
    const file = adminDom.uploadFile.files[0];
    
    // Validation
    if (!title || !author) {
        showMessage(adminDom.uploadStatus, 'Please fill in all required fields.', 'error');
        return;
    }
    
    if (!file) {
        showMessage(adminDom.uploadStatus, 'Please select a file to upload.', 'error');
        return;
    }
    
    // Validate file type
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        showMessage(adminDom.uploadStatus, 'Only PDF and DOCX files are allowed.', 'error');
        return;
    }
    
    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
        showMessage(adminDom.uploadStatus, 'File size must be less than 20MB.', 'error');
        return;
    }
    
    // Set uploading state
    ADMIN.isUploading = true;
    const originalText = adminDom.uploadSubmit.innerHTML;
    adminDom.uploadSubmit.innerHTML = '<span class="loading"></span> Uploading...';
    adminDom.uploadSubmit.disabled = true;
    
    try {
        // Read file as base64
        const base64Data = await readFileAsBase64(file);
        
        // Prepare payload
        const payload = {
            action: 'upload',
            token: ADMIN.token,
            fileName: file.name,
            mimeType: file.type,
            fileBase64: base64Data.split(',')[1], // Remove data URL prefix
            metadata: {
                title: title,
                author: author
            }
        };
        
        // Send request
        const response = await fetch(ADMIN.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            showMessage(adminDom.uploadStatus, 
                `<i class="fas fa-check-circle"></i> File uploaded successfully!<br>
                 <a href="${result.fileUrl}" target="_blank">View uploaded file</a>`,
                'success'
            );
            
            // Clear form
            adminDom.uploadForm.reset();
            adminDom.filePreview.classList.add('hidden');
            
            // Refresh documents list
            await loadDocuments(true);
            
            // Show global success toast
            showToast(`"${title}" has been added to the library.`, 'success');
            
        } else {
            throw new Error(result.error || 'Upload failed');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(adminDom.uploadStatus, 
            `<i class="fas fa-exclamation-circle"></i> Upload failed: ${error.message}`, 
            'error'
        );
    } finally {
        // Reset uploading state
        ADMIN.isUploading = false;
        adminDom.uploadSubmit.innerHTML = originalText;
        adminDom.uploadSubmit.disabled = false;
    }
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show file preview
    adminDom.filePreview.classList.remove('hidden');
    adminDom.fileName.textContent = file.name;
    adminDom.fileSize.textContent = formatFileSize(file.size);
    
    // Update icon based on file type
    const icon = adminDom.filePreview.querySelector('.file-icon');
    if (file.type === 'application/pdf') {
        icon.className = 'fas fa-file-pdf file-icon';
        icon.style.color = '#c62828';
    } else if (file.type.includes('wordprocessingml')) {
        icon.className = 'fas fa-file-word file-icon';
        icon.style.color = '#2b579a';
    }
}

/**
 * Reset upload form
 */
function resetUploadForm() {
    if (confirm('Clear all form data?')) {
        adminDom.uploadForm.reset();
        adminDom.filePreview.classList.add('hidden');
        showMessage(adminDom.uploadStatus, '', 'clear');
    }
}

// ==================== PDF GENERATION ====================

/**
 * Handle PDF generation
 */
async function handlePdfGeneration(event) {
    event.preventDefault();
    
    if (!isValidSession()) {
        showSessionExpired();
        return;
    }
    
    if (ADMIN.isGenerating) {
        showMessage(adminDom.generateStatus, 'PDF generation already in progress. Please wait.', 'error');
        return;
    }
    
    // Get form data
    const title = adminDom.generateTitle.value.trim();
    const author = adminDom.generateAuthor.value.trim();
    const content = adminDom.generateContent.value.trim();
    
    // Validation
    if (!title || !author || !content) {
        showMessage(adminDom.generateStatus, 'Please fill in all required fields.', 'error');
        return;
    }
    
    if (content.length < 50) {
        showMessage(adminDom.generateStatus, 'Content should be at least 50 characters.', 'error');
        return;
    }
    
    // Set generating state
    ADMIN.isGenerating = true;
    const originalText = adminDom.generateSubmit.innerHTML;
    adminDom.generateSubmit.innerHTML = '<span class="loading"></span> Generating PDF...';
    adminDom.generateSubmit.disabled = true;
    
    try {
        // Prepare payload
        const payload = {
            action: 'generatePdf',
            token: ADMIN.token,
            formData: {
                title: title,
                author: author,
                body: content
            }
        };
        
        // Send request
        const response = await fetch(ADMIN.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            showMessage(adminDom.generateStatus, 
                `<i class="fas fa-check-circle"></i> PDF generated successfully!<br>
                 <a href="${result.fileUrl}" target="_blank">View generated PDF</a>`,
                'success'
            );
            
            // Clear form
            adminDom.generateForm.reset();
            
            // Refresh documents list
            await loadDocuments(true);
            
            // Show global success toast
            showToast(`PDF "${title}" has been generated and added to the library.`, 'success');
            
        } else {
            throw new Error(result.error || 'PDF generation failed');
        }
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showMessage(adminDom.generateStatus, 
            `<i class="fas fa-exclamation-circle"></i> PDF generation failed: ${error.message}`, 
            'error'
        );
    } finally {
        // Reset generating state
        ADMIN.isGenerating = false;
        adminDom.generateSubmit.innerHTML = originalText;
        adminDom.generateSubmit.disabled = false;
    }
}

/**
 * Preview PDF formatting
 */
function previewPdfFormatting() {
    const content = adminDom.generateContent.value;
    if (!content) {
        alert('Please enter some content to preview.');
        return;
    }
    
    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
        <html>
        <head>
            <title>PDF Preview</title>
            <style>
                body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 2cm; }
                h1 { color: #0b3d2e; border-bottom: 2px solid #c99a6b; }
                .meta { color: #666; font-style: italic; }
                .content { margin-top: 1em; }
            </style>
        </head>
        <body>
            <h1>Sample Preview</h1>
            <div class="meta">By Author • Preview only</div>
            <div class="content">${content.replace(/\n/g, '<br>')}</div>
        </body>
        </html>
    `);
    previewWindow.document.close();
}

// ==================== UI MANAGEMENT ====================

/**
 * Show login screen
 */
function showLogin() {
    adminDom.loginScreen.classList.remove('hidden');
    adminDom.dashboard.classList.add('hidden');
    document.title = 'Admin Login - Intizar Library';
    
    // Focus on username field
    setTimeout(() => {
        if (adminDom.usernameInput) {
            adminDom.usernameInput.focus();
        }
    }, 100);
}

/**
 * Show dashboard
 */
function showDashboard() {
    adminDom.loginScreen.classList.add('hidden');
    adminDom.dashboard.classList.remove('hidden');
    document.title = 'Admin Dashboard - Intizar Library';
}

/**
 * Switch tabs
 */
function switchTab(tabId) {
    // Update active tab button
    adminDom.tabs.forEach(tab => {
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update active tab content
    adminDom.tabContents.forEach(content => {
        if (content.id === `tab-${tabId}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Load data for manage tab
    if (tabId === 'manage') {
        loadDocuments();
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate random token
 */
function generateToken() {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Read file as base64
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show message in container
 */
function showMessage(container, message, type = 'info') {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!message) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message status-${type}`;
    messageDiv.innerHTML = message;
    
    container.appendChild(messageDiv);
    
    // Auto-remove success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (messageDiv.parentNode === container) {
                messageDiv.remove();
            }
        }, 5000);
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove toast after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 5000);
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Login form
    if (adminDom.loginForm) {
        adminDom.loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    if (adminDom.logoutBtn) {
        adminDom.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Tab switching
    adminDom.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
    
    // File upload
    if (adminDom.uploadForm) {
        adminDom.uploadForm.addEventListener('submit', handleFileUpload);
    }
    
    if (adminDom.uploadFile) {
        adminDom.uploadFile.addEventListener('change', handleFileSelect);
    }
    
    if (adminDom.uploadReset) {
        adminDom.uploadReset.addEventListener('click', resetUploadForm);
    }
    
    // PDF generation
    if (adminDom.generateForm) {
        adminDom.generateForm.addEventListener('submit', handlePdfGeneration);
    }
    
    if (adminDom.generatePreview) {
        adminDom.generatePreview.addEventListener('click', previewPdfFormatting);
    }
    
    // Document management
    if (adminDom.searchDocs) {
        adminDom.searchDocs.addEventListener('input', () => {
            renderDocuments(ADMIN.cachedDocuments);
        });
    }
    
    if (adminDom.refreshDocs) {
        adminDom.refreshDocs.addEventListener('click', () => {
            loadDocuments(true);
            showToast('Document list refreshed.', 'info');
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key to logout
        if (e.key === 'Escape' && !adminDom.loginScreen.classList.contains('hidden')) {
            window.location.href = 'index.html';
        }
        
        // Ctrl/Cmd + Enter to submit forms
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.querySelector('.tab-content.active')?.id === 'tab-upload') {
                adminDom.uploadForm.requestSubmit();
            } else if (document.querySelector('.tab-content.active')?.id === 'tab-generate') {
                adminDom.generateForm.requestSubmit();
            }
        }
    });
}

/**
 * Initialize admin panel
 */
function initAdminPanel() {
    // Check if we're on admin page
    if (!adminDom.loginScreen && !adminDom.dashboard) {
        console.warn('Admin elements not found. Redirecting to main site...');
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize event listeners
    initEventListeners();
    
    // Check existing session
    if (isValidSession()) {
        showDashboard();
        loadDashboardData();
    } else {
        showLogin();
    }
    
    // Add toast styles
    addToastStyles();
    
    console.log('Intizar Admin Panel initialized.');
}

/**
 * Add toast notification styles
 */
function addToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            transform: translateX(150%);
            transition: transform 0.3s ease;
            max-width: 400px;
        }
        
        .toast.show {
            transform: translateX(0);
        }
        
        .toast-success {
            border-left: 4px solid #28a745;
            background: #d4edda;
            color: #155724;
        }
        
        .toast-error {
            border-left: 4px solid #dc3545;
            background: #f8d7da;
            color: #721c24;
        }
        
        .toast-warning {
            border-left: 4px solid #ffc107;
            background: #fff3cd;
            color: #856404;
        }
        
        .toast-info {
            border-left: 4px solid #17a2b8;
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .toast i {
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(style);
}

// ==================== INITIALIZATION ====================

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminPanel);

// Prevent navigation during operations
window.addEventListener('beforeunload', (e) => {
    if (ADMIN.isUploading || ADMIN.isGenerating) {
        e.preventDefault();
        e.returnValue = 'You have an operation in progress. Are you sure you want to leave?';
        return e.returnValue;
    }
});