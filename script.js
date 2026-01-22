// Intizar Digital Library - Enhanced Frontend Logic
const APP = {
    backendUrl: 'https://script.google.com/macros/s/AKfycbwFelKUQ_Tpli9uZYqt50UZcQfQy73rwSlBNze3_p5Fu-WCyIMlGS4YoQ-19bvT5K72CQ/exec', // REPLACE WITH YOUR DEPLOYED WEB APP URL
    defaultDocs: [
        { 
            id: 'default-1',
            title: 'Introduction to Mahdawiyyah', 
            author: 'Intizar Research Team', 
            type: 'PDF', 
            date: 'Core Collection',
            url: 'intizar1.pdf',
            description: 'A comprehensive introduction to the concept of Mahdawiyyah and its significance.'
        },
        { 
            id: 'default-2',
            title: 'The Concept of Intizar', 
            author: 'Intizar Research Team', 
            type: 'PDF', 
            date: 'Core Collection',
            url: 'intizar2.pdf',
            description: 'Exploring the theological and practical aspects of awaiting Imam Mahdi (AJF).'
        },
        { 
            id: 'default-3',
            title: 'Imam Mahdi in Classical Texts', 
            author: 'Intizar Research Team', 
            type: 'PDF', 
            date: 'Core Collection',
            url: 'intizar3.pdf',
            description: 'References and analysis from classical Islamic literature.'
        },
        { 
            id: 'default-4',
            title: "Sayyid Zakzaky's Teachings", 
            author: 'Intizar Research Team', 
            type: 'PDF', 
            date: 'Core Collection',
            url: 'intizar4.pdf',
            description: 'Contemporary perspectives on Mahdawiyyah.'
        },
        { 
            id: 'default-5',
            title: 'Mahdawiyyah Q&A', 
            author: 'Intizar Research Team', 
            type: 'PDF', 
            date: 'Core Collection',
            url: 'intizar5.pdf',
            description: 'Frequently asked questions and answers.'
        }
    ],
    currentPage: 'home',
    allDocuments: [],
    libraryFilters: {
        search: '',
        type: 'all',
        sort: 'date-desc'
    }
};

// DOM Elements
const dom = {
    // Pages
    homePage: document.getElementById('home-page'),
    libraryPage: document.getElementById('library-page'),
    aboutPage: document.getElementById('about-page'),
    
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    mobileNavLinks: document.querySelectorAll('.mobile-nav-link'),
    hamburger: document.getElementById('hamburger'),
    mobileNav: document.getElementById('mobile-nav'),
    closeMenu: document.getElementById('close-menu'),
    
    // Home Page Elements
    featuredDocuments: document.getElementById('featured-documents'),
    
    // Library Page Elements
    libraryDocuments: document.getElementById('library-documents'),
    searchInput: document.getElementById('search-input'),
    typeFilter: document.getElementById('type-filter'),
    sortFilter: document.getElementById('sort-filter'),
    loadingIndicator: document.getElementById('loading-indicator'),
    totalDocs: document.getElementById('total-docs'),
    recentDocs: document.getElementById('recent-docs'),
    
    // AI Modal Elements
    aiButton: document.getElementById('ai-button'),
    aiModal: document.getElementById('ai-modal'),
    closeAI: document.getElementById('close-ai'),
    chatMessages: document.getElementById('chat-messages'),
    userInput: document.getElementById('user-input'),
    sendAI: document.getElementById('send-ai'),
    clearChat: document.getElementById('clear-chat'),
    
    // Buttons
    heroBtn: document.querySelector('.hero-btn'),
    viewAllBtn: document.querySelector('.view-all-btn'),
    aiMobileBtn: document.querySelector('.ai-mobile-btn')
};

// Page Navigation
function switchPage(page) {
    // Update current page
    APP.currentPage = page;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Update active state in navigation
    updateActiveNav(page);
    
    // Close mobile menu if open
    closeMobileMenu();
    
    // Load data for the page
    if (page === 'library') {
        loadLibraryDocuments();
    } else if (page === 'home') {
        loadFeaturedDocuments();
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Update document title
    document.title = page === 'home' ? 'Intizar Digital Library' 
        : page === 'library' ? 'Digital Library - Intizar' 
        : 'About - Intizar Digital Library';
}

// Update active navigation state
function updateActiveNav(page) {
    // Desktop navigation
    dom.navLinks.forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Mobile navigation
    dom.mobileNavLinks.forEach(link => {
        if (link.dataset.page === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Mobile Menu Functions
function toggleMobileMenu() {
    dom.mobileNav.classList.toggle('active');
    dom.hamburger.classList.toggle('active');
    document.body.style.overflow = dom.mobileNav.classList.contains('active') ? 'hidden' : 'auto';
}

function closeMobileMenu() {
    dom.mobileNav.classList.remove('active');
    dom.hamburger.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Load featured documents for home page
async function loadFeaturedDocuments() {
    try {
        const response = await fetch(`${APP.backendUrl}?action=getDocuments`);
        const result = await response.json();
        
        let documents = [];
        if (result.success && result.documents) {
            documents = result.documents.slice(0, 3).map(doc => ({
                id: doc.ID,
                title: doc.Title || 'Untitled',
                author: doc.Author || 'Unknown',
                type: doc.Type || 'PDF',
                date: new Date(doc.DateAdded).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                url: doc.DriveUrl || '#',
                isRemote: true
            }));
        }
        
        // Render featured documents
        renderFeaturedDocuments(documents);
        
    } catch (error) {
        console.error('Failed to load featured documents:', error);
        renderFeaturedDocuments([]);
    }
}

function renderFeaturedDocuments(docs) {
    if (!dom.featuredDocuments) return;
    
    dom.featuredDocuments.innerHTML = '';
    
    if (docs.length === 0) {
        dom.featuredDocuments.innerHTML = `
            <div class="no-documents">
                <i class="fas fa-book"></i>
                <p>No documents available yet. Check back soon!</p>
            </div>
        `;
        return;
    }
    
    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.innerHTML = `
            <div class="doc-icon"><i class="fas fa-file-pdf"></i></div>
            <div class="doc-info">
                <h4>${doc.title}</h4>
                <p class="doc-meta">Author: ${doc.author} | Type: ${doc.type}</p>
                <p class="doc-date">Added: ${doc.date}</p>
            </div>
            <div class="doc-actions">
                <a href="${doc.url}" target="_blank" class="doc-btn">View Document</a>
                <a href="${doc.url}" download class="doc-btn secondary">Download</a>
            </div>
        `;
        dom.featuredDocuments.appendChild(card);
    });
}

// Load all documents for library page
async function loadLibraryDocuments() {
    if (!dom.libraryDocuments) return;
    
    dom.loadingIndicator.style.display = 'flex';
    dom.libraryDocuments.innerHTML = '';
    
    try {
        const response = await fetch(`${APP.backendUrl}?action=getDocuments`);
        const result = await response.json();
        
        let remoteDocs = [];
        if (result.success && result.documents) {
            remoteDocs = result.documents.map(doc => ({
                id: doc.ID,
                title: doc.Title || 'Untitled',
                author: doc.Author || 'Unknown',
                type: doc.Type || 'PDF',
                date: new Date(doc.DateAdded),
                dateFormatted: new Date(doc.DateAdded).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                url: doc.DriveUrl || '#',
                isRemote: true,
                isRecent: isRecentDocument(doc.DateAdded)
            }));
        }
        
        // Combine with default documents
        APP.allDocuments = [...remoteDocs, ...APP.defaultDocs.map(doc => ({
            ...doc,
            date: new Date(0), // Very old date for sorting
            dateFormatted: 'Core Collection',
            isRemote: false,
            isRecent: false
        }))];
        
        // Update stats
        updateLibraryStats(remoteDocs);
        
        // Apply filters and render
        applyLibraryFilters();
        
    } catch (error) {
        console.error('Failed to load library documents:', error);
        APP.allDocuments = [...APP.defaultDocs.map(doc => ({
            ...doc,
            date: new Date(0),
            dateFormatted: 'Core Collection',
            isRemote: false,
            isRecent: false
        }))];
        updateLibraryStats([]);
        applyLibraryFilters();
    } finally {
        dom.loadingIndicator.style.display = 'none';
    }
}

function isRecentDocument(dateString) {
    const docDate = new Date(dateString);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return docDate > oneMonthAgo;
}

function updateLibraryStats(remoteDocs) {
    if (!dom.totalDocs || !dom.recentDocs) return;
    
    // Total documents (remote + default)
    const totalCount = remoteDocs.length + APP.defaultDocs.length;
    dom.totalDocs.textContent = totalCount;
    
    // Recent documents (last 30 days)
    const recentCount = remoteDocs.filter(doc => isRecentDocument(doc.date)).length;
    dom.recentDocs.textContent = recentCount;
}

function applyLibraryFilters() {
    if (!dom.libraryDocuments) return;
    
    let filteredDocs = [...APP.allDocuments];
    
    // Apply search filter
    if (APP.libraryFilters.search) {
        const searchTerm = APP.libraryFilters.search.toLowerCase();
        filteredDocs = filteredDocs.filter(doc =>
            doc.title.toLowerCase().includes(searchTerm) ||
            doc.author.toLowerCase().includes(searchTerm) ||
            (doc.description && doc.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply type filter
    if (APP.libraryFilters.type !== 'all') {
        filteredDocs = filteredDocs.filter(doc => 
            doc.type === APP.libraryFilters.type
        );
    }
    
    // Apply sort
    switch (APP.libraryFilters.sort) {
        case 'date-desc':
            filteredDocs.sort((a, b) => b.date - a.date);
            break;
        case 'date-asc':
            filteredDocs.sort((a, b) => a.date - b.date);
            break;
        case 'title':
            filteredDocs.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'author':
            filteredDocs.sort((a, b) => a.author.localeCompare(b.author));
            break;
    }
    
    // Render filtered documents
    renderLibraryDocuments(filteredDocs);
}

function renderLibraryDocuments(docs) {
    if (!dom.libraryDocuments) return;
    
    dom.libraryDocuments.innerHTML = '';
    
    if (docs.length === 0) {
        dom.libraryDocuments.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No documents found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    docs.forEach(doc => {
        const card = document.createElement('div');
        card.className = 'document-card';
        card.innerHTML = `
            <div class="doc-icon">
                <i class="fas fa-file-pdf"></i>
                ${doc.isRecent ? '<span class="new-badge">New</span>' : ''}
            </div>
            <div class="doc-info">
                <h4>${doc.title}</h4>
                <p class="doc-meta">
                    Author: ${doc.author} | 
                    Type: ${doc.type} 
                    ${doc.isRemote ? '' : '| <span class="core-badge">Core</span>'}
                </p>
                <p class="doc-date">${doc.dateFormatted}</p>
                ${doc.description ? `<p class="doc-description">${doc.description}</p>` : ''}
            </div>
            <div class="doc-actions">
                <a href="${doc.url}" target="_blank" class="doc-btn">
                    <i class="fas fa-eye"></i> View
                </a>
                <a href="${doc.url}" download class="doc-btn secondary">
                    <i class="fas fa-download"></i> Download
                </a>
            </div>
        `;
        dom.libraryDocuments.appendChild(card);
    });
}

// AI Chat Functions (Global - Unchanged from previous implementation)
function openAIModal() {
    dom.aiModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    dom.userInput.focus();
}

function closeAIModal() {
    dom.aiModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    if (isUser) {
        messageDiv.innerHTML = `
            <div class="message-header">
                <i class="fas fa-user"></i>
                <span>You</span>
            </div>
            <p>${text}</p>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-header">
                <i class="fas fa-robot"></i>
                <span>Mahdawiyyah Assistant</span>
            </div>
            <p>${text}</p>
        `;
    }
    
    dom.chatMessages.appendChild(messageDiv);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

async function sendAIQuestion() {
    const question = dom.userInput.value.trim();
    if (!question) return;
    
    // Add user message
    addMessage(question, true);
    dom.userInput.value = '';
    dom.sendAI.disabled = true;
    dom.sendAI.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const response = await fetch(APP.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=ai&input=${encodeURIComponent(question)}`
        });
        
        const result = await response.json();
        
        if (result.success) {
            addMessage(result.response);
        } else {
            addMessage(`Error: ${result.error}`);
        }
    } catch (error) {
        addMessage('Network error. Please check your connection.');
        console.error('AI request failed:', error);
    } finally {
        dom.sendAI.disabled = false;
        dom.sendAI.innerHTML = 'Send <i class="fas fa-paper-plane"></i>';
    }
}

function clearChat() {
    dom.chatMessages.innerHTML = `
        <div class="message ai-message">
            <div class="message-header">
                <i class="fas fa-robot"></i>
                <span>Mahdawiyyah Assistant</span>
            </div>
            <p>Assalamu alaikum. I am an AI assistant specialized in Mahdawiyyah teachings. Ask me about Imam Mahdi (AJF), the concept of Intizar, or related topics.</p>
        </div>
    `;
}

// Initialize Event Listeners
function initEventListeners() {
    // Page Navigation
    dom.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.href && link.href.includes('admin.html')) return;
            e.preventDefault();
            switchPage(link.dataset.page);
        });
    });
    
    // Mobile Navigation
    dom.mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.href && link.href.includes('admin.html')) return;
            if (link.classList.contains('ai-mobile-btn')) {
                e.preventDefault();
                openAIModal();
                closeMobileMenu();
            } else if (link.dataset.page) {
                e.preventDefault();
                switchPage(link.dataset.page);
            }
        });
    });
    
    // Hamburger Menu
    dom.hamburger.addEventListener('click', toggleMobileMenu);
    dom.closeMenu.addEventListener('click', closeMobileMenu);
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (dom.mobileNav.classList.contains('active') && 
            !dom.mobileNav.contains(e.target) && 
            !dom.hamburger.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    // Close mobile menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dom.mobileNav.classList.contains('active')) {
            closeMobileMenu();
        }
    });
    
    // Library Page Filters
    if (dom.searchInput) {
        dom.searchInput.addEventListener('input', (e) => {
            APP.libraryFilters.search = e.target.value;
            applyLibraryFilters();
        });
    }
    
    if (dom.typeFilter) {
        dom.typeFilter.addEventListener('change', (e) => {
            APP.libraryFilters.type = e.target.value;
            applyLibraryFilters();
        });
    }
    
    if (dom.sortFilter) {
        dom.sortFilter.addEventListener('change', (e) => {
            APP.libraryFilters.sort = e.target.value;
            applyLibraryFilters();
        });
    }
    
    // Buttons
    if (dom.heroBtn) {
        dom.heroBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage('library');
        });
    }
    
    if (dom.viewAllBtn) {
        dom.viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage('library');
        });
    }
    
    // AI Modal
    dom.aiButton.addEventListener('click', openAIModal);
    dom.closeAI.addEventListener('click', closeAIModal);
    dom.aiModal.addEventListener('click', (e) => {
        if (e.target === dom.aiModal) closeAIModal();
    });
    
    // AI Chat
    dom.sendAI.addEventListener('click', sendAIQuestion);
    dom.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIQuestion();
        }
    });
    
    // Clear chat button
    if (dom.clearChat) {
        dom.clearChat.addEventListener('click', clearChat);
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !dom.aiModal.classList.contains('hidden')) {
            closeAIModal();
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    
    // Load initial data
    loadFeaturedDocuments();
    
    // Set default page
    switchPage('home');
    
    console.log('Intizar Digital Library enhanced frontend loaded.');
    
    // Add CSS for new elements
    addDynamicStyles();
});

// Add dynamic CSS for new elements
function addDynamicStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
        .no-documents, .no-results {
            grid-column: 1 / -1;
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        
        .no-documents i, .no-results i {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #ccc;
        }
        
        .no-results h3 {
            color: var(--primary-dark);
            margin: 1rem 0;
        }
        
        .new-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ff6b6b;
            color: white;
            font-size: 0.7rem;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: 600;
        }
        
        .core-badge {
            background: var(--accent);
            color: var(--primary-dark);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .doc-icon {
            position: relative;
        }
        
        .doc-description {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-top: 0.5rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .document-card .doc-actions {
            display: flex;
            gap: 10px;
            margin-top: auto;
        }
        
        .document-card .doc-actions .doc-btn {
            flex: 1;
            text-align: center;
            padding: 8px 15px;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
    `;
    document.head.appendChild(styles);
}