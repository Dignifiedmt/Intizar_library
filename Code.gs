// Intizar Digital Library - Google Apps Script Backend v3.1
// Enhanced Mahdawiyyah Scope with Comprehensive Figures
// Deploy as Web App (Execute as 'Me', Access 'Anyone with link')

// === CONFIGURATION (Set via Script Properties) ===
const CONFIG = {
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  ADMIN_USERNAME: PropertiesService.getScriptProperties().getProperty('ADMIN_USERNAME'),
  ADMIN_PASSWORD: PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD'),
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
  DRIVE_FOLDER_NAME: 'Intizar Digital Library',
  SHEET_NAME: 'intizar_library',
  AI_MODEL: 'gemini-2.5-flash',
  SESSION_TIMEOUT_MINUTES: 60
};

// === COMPREHENSIVE MAHDAWIYYAH KEYWORD FILTER (Enhanced) ===
const MAHDAWIYYAH_KEYWORDS = [
  // English Keywords
  'mahdawiyyah', 'mahdi', 'imam mahdi', 'intizar', 'muntazar', 'zakzaky',
  'occultation', 'awaited', 'mahdaviat', 'mahdism', 'shia', 'shiite',
  'twelver', 'imamah', 'imamate', 'ghaybah', 'zaman', 'savior',
  'messiah', 'reappearance', 'reappearing', 'reappear', 'advent',
  'parousia', 'rajah', 'return', 'second coming', 'end times',
  'eschatology', 'apocalypse', 'qiyamah', 'judgment day',
  
  // Key Figures and Deputies (Specifically Added)
  'uthman bn said', 'uthman ibn said', 'uthman al-amri',
  'abu amr uthman', 'al-nuwwab al-arbaah', 'four deputies',
  'al-nawwab al-arba', 'special deputies', 'sufara',
  'muhammad ibn uthman', 'husayn ibn ruh', 'ali ibn muhammad samiri',
  'minor occultation', 'ghaybah sughra', 'major occultation',
  'ghaybah kubra', 'safar', 'sifarah', 'wakil',
  
  // Arabic Keywords
  'مهدوية', 'مهدي', 'إمام المهدي', 'انتظار', 'منتظر', 'غیبت',
  'غيبة', 'زكزاكي', 'شيعة', 'إمامة', 'رجعة', 'ظهور',
  'قائم', 'صاحب الزمان', 'القيامة', 'اليوم الآخر',
  'عثمان بن سعيد', 'عثمان العمري', 'النواب الأربعة',
  'الغيبة الصغرى', 'الغيبة الكبرى', 'السفراء', 'الوكالة',
  'أبو عمرو عثمان', 'محمد بن عثمان', 'حسين بن روح', 'علي بن محمد السمري',
  
  // Persian/Urdu Keywords
  'مہدویت', 'امام مہدی', 'انتظار', 'غیبت', 'رجعت', 'ظہور',
  'شیعہ', 'امامت', 'قیامت', 'عثمان بن سعید', 'نواب اربعہ',
  'غیبت صغری', 'غیبت کبری', 'سفرا',
  
  // Hausa Keywords (Enhanced)
  'almahdi', 'imam almahdi', 'intizara', 'muntazara', 'zakzaky',
  'shiyyah', 'shi\'a', 'shiite', 'ghaybah', 'ghaibah',
  'lokacin', 'sabon zaman', 'mai ceto', 'mai fansarwa', 'mai gārunta',
  'mai adalci', 'mai zaman lafiya', 'mai zuwa', 'majiuya', 'karshen duniya',
  'ranar sakamako', 'ranar kiyama', 'imam na karshe', 'imam na gaba',
  'masih', 'masihu', 'alkawari', 'alkawarin', 'alkawari na imam',
  'amana', 'amanar', 'mujaddadi', 'mujaddadin', 'mai kawo sauyi',
  'mai kawo gyara', 'mai kawo adalci', 'mai kawo zaman lafiya',
  'shehu', 'shehun', 'malam', 'malaman', 'malaman shiyyah',
  'khalifa', 'khalifanci', 'sarkin adalci', 'sarkin zaman lafiya',
  'uthman bn said', 'wakilai', 'wakilai hudu', 'wakilan imam'
];

// === UTILITY FUNCTIONS ===
function getOrCreateFolder() {
  try {
    const folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
    return folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  } catch (e) {
    console.error('Drive folder error:', e);
    throw new Error('Drive service error');
  }
}

function getSpreadsheet() {
  if (!CONFIG.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID not configured. Run setup() first.');
  }
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function ensureSheetExists() {
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
      const headers = ['ID', 'Title', 'Author', 'Type', 'DateAdded', 'DriveFileId', 'DriveUrl'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    return sheet;
  } catch (e) {
    console.error('Sheet error:', e);
    throw new Error('Spreadsheet error: ' + e.message);
  }
}

function generateUniqueId() {
  return Utilities.getUuid();
}

function isValidSession(token) {
  if (!token) return false;
  const cache = CacheService.getScriptCache();
  const stored = cache.get('admin_' + token);
  return stored === 'authenticated';
}

function createSession() {
  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put('admin_' + token, 'authenticated', CONFIG.SESSION_TIMEOUT_MINUTES * 60);
  return token;
}

function destroySession(token) {
  if (token) {
    CacheService.getScriptCache().remove('admin_' + token);
  }
}

// === PUBLIC ACCESS FOR FILES ===
function makeFilePublic(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    
    // Remove all existing permissions
    const permissions = file.getEditors().concat(file.getViewers());
    permissions.forEach(function(user) {
      try {
        file.removeEditor(user);
      } catch (e) {}
      try {
        file.removeViewer(user);
      } catch (e) {}
    });
    
    // Set to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Also make parent folder public
    try {
      const folder = file.getParents().next();
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    
    return file.getUrl();
  } catch (e) {
    console.error('Error making file public:', e);
    throw new Error('Failed to set public access: ' + e.message);
  }
}

// === ENHANCED AI SCOPE VALIDATION ===
function isMahdawiyyahRelated(text) {
  if (!text || text.trim().length < 3) return false;
  
  const lower = text.toLowerCase().trim();
  
  // Enhanced keyword matching with partial matches
  const hasKeyword = MAHDAWIYYAH_KEYWORDS.some(keyword => {
    const kwLower = keyword.toLowerCase();
    // Check for exact match or partial match for longer queries
    return lower.includes(kwLower) || kwLower.includes(lower) || 
           lower.split(/\s+/).some(word => kwLower.includes(word) || word.includes(kwLower));
  });
  
  if (hasKeyword) return true;
  
  // Check for related names and titles (case-insensitive)
  const relatedNames = [
    'uthman', 'said', 'osman', 'ibn', 'bin',
    'nuwwab', 'nawwab', 'deputy', 'deputies',
    'ambassador', 'safir', 'wakil', 'agent',
    'ghaybah', 'occultation', 'imam', 'mahdi'
  ];
  
  // Check if question contains Imam/Mahdi related terms
  const hasImamReference = /imam|mahdi|muntazar|intizar|ghaybah|occultation|zaman/i.test(lower);
  const hasHistoricalFigure = /(uthman|osman|said|ibn|bin|al-|abu)/i.test(lower);
  
  // Check for question patterns about historical figures
  const isQuestionAboutFigure = /(who|what|when|where|why|how|explain|describe|tell.*about|nawa|yaya|me|wane|wace).*(uthman|said|osman|deput|nuwwab|wakil|safir)/i.test(lower);
  
  return (hasImamReference && hasHistoricalFigure) || isQuestionAboutFigure;
}

// === FIXED HTML ESCAPE FUNCTION ===
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// === ENHANCED LANGUAGE DETECTION ===
function detectLanguage(text) {
  if (!text || text.trim().length === 0) return 'en';
  
  const cleanText = text.toLowerCase().trim();
  
  // Arabic detection
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (arabicRegex.test(text)) return 'ar';
  
  // Hausa detection
  const hausaWords = ['hausa', 'almahdi', 'intizara', 'zakzaky', 'me', 'yaya', 'wane', 'wace', 'ina', 'wana', 'kada', 'don', 'saboda', 'domin', 'wannan', 'wancan', 'uthman', 'said'];
  if (hausaWords.some(word => cleanText.includes(word.toLowerCase()))) return 'ha';
  
  // Persian/Urdu detection (basic)
  const persianUrduRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\u067E\u0686\u06AF\u0698]/;
  if (persianUrduRegex.test(text)) return 'fa';
  
  // Default to English
  return 'en';
}

// === ENHANCED AI GEMINI INTEGRATION ===
function callGeminiAPI(prompt) {
  if (!CONFIG.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in Script Properties.');
  }

  // Detect language for response
  const detectedLanguage = detectLanguage(prompt);
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.AI_MODEL}:generateContent`;
  
  // ENHANCED PROMPT WITH COMPREHENSIVE MAHDAWIYYAH SCOPE
  const enhancedPrompt = `You are an expert scholar on Mahdawiyyah (the doctrine of Imam Mahdi AJF) at Intizar Digital Library. Respond ONLY in plain text without any markdown symbols. Do not use asterisks, hashtags, underscores, or any other markdown formatting.

IMPORTANT INSTRUCTION: BEFORE RESPONDING, CHECK THE QUESTION CAREFULLY. DO NOT SAY SOMETHING IS OUT OF YOUR SCOPE WITHOUT VERIFYING. YOUR SCOPE INCLUDES ALL ASPECTS OF MAHDAWIYYAH.

RESPONSE LANGUAGE: ${detectedLanguage === 'ar' ? 'Respond in Arabic language using clear classical Arabic.' : detectedLanguage === 'ha' ? 'Respond in Hausa language using simple everyday Hausa.' : detectedLanguage === 'fa' ? 'Respond in Persian/Urdu language.' : 'Respond in English language.'}

COMPREHENSIVE MAHDAWIYYAH SCOPE - Respond to questions about:
1. Imam Mahdi (AJF) - الإمام المهدي عليه السلام
2. Intizar/الانتظار (awaiting the Imam)
3. Ghaybah/الغيبة (Occultation) - Both Minor (Sughra) and Major (Kubra)
4. Raj'ah/الرجعة (Return)
5. Zuhur/الظهور (Reappearance)
6. Teachings of Sheikh Ibraheem Zakzaky about Mahdawiyyah
7. Islamic eschatology related to Imam Mahdi
8. Mahdawiyyah in Quran and Hadith
9. Signs of reappearance
10. Duties during occultation
11. The Four Deputies (النواب الأربعة) during Minor Occultation:
    - Uthman ibn Sa'id al-Asadi (عثمان بن سعيد الأسدي)
    - Muhammad ibn Uthman (محمد بن عثمان)
    - Husayn ibn Ruh (حسين بن روح)
    - Ali ibn Muhammad al-Samiri (علي بن محمد السمري)
12. All historical figures related to Imam Mahdi's occultation
13. Concepts of Safir (سفير), Wakil (وكيل), Sifarah (سفارة)
14. Any person, place, event, or concept directly or indirectly related to Imam Mahdi

CRITICAL RULES:
1. NEVER say "this is out of my scope" for Mahdawiyyah-related questions
2. If question mentions Uthman bn Sa'id, recognize him as the first deputy of Imam Mahdi
3. If question is in Arabic, respond in Arabic
4. If question is in Hausa, respond in Hausa  
5. If question is in English, respond in English
6. NEVER use markdown symbols like ** ## __ * etc.
7. Use only plain text formatting
8. If question is truly outside Mahdawiyyah, politely redirect to Mahdawiyyah topics
9. Always cite relevant Quran verses or Hadith when applicable
10. Mention sources from Ahlul Bayt teachings
11. Always use respectful language and proper honorifics

SPECIAL NOTE: Uthman ibn Sa'id al-Asadi (also known as Abu Amr) was the FIRST deputy of Imam Mahdi (AJF) during the Minor Occultation. He served from 260 AH to 265 AH. He was trusted by both Imam Hasan al-Askari (AS) and Imam Mahdi (AJF).

ALWAYS CHECK: Before claiming something is out of scope, verify if it relates to:
- Imam Mahdi (AJF)
- His deputies, representatives, or agents
- The occultation period
- Awaiting (Intizar)
- Mahdawiyyah concepts
- Related historical figures

Question: ${prompt}

Remember: Your primary duty is to educate about Imam Mahdi (AJF) and all related matters.`;
  
  const payload = {
    contents: [{
      parts: [{ text: enhancedPrompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE"
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': CONFIG.GEMINI_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    timeout: 30000
  };

  try {
    console.log('🤖 Sending request to Gemini API...');
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      throw new Error(`AI service error: ${data.error.message || 'Unknown error'}`);
    }
    
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
           'I apologize, but I could not generate a response. Please try again.';
    
    console.log('✅ AI Response received, length:', aiResponse.length);
    return aiResponse;
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw new Error('AI service unavailable. Please try again later.');
  }
}

// === CORE REQUEST HANDLERS ===
function handleGetDocuments() {
  try {
    const sheet = ensureSheetExists();
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return { success: true, documents: [] };
    }
    
    const headers = data[0];
    const rows = data.slice(1)
      .filter(row => row[0])
      .map(row => {
        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx] || '';
        });
        
        // Ensure public access for all files
        if (obj.DriveFileId) {
          try {
            makeFilePublic(obj.DriveFileId);
          } catch (e) {
            console.warn('Could not update permissions for:', obj.DriveFileId);
          }
        }
        
        return obj;
      });

    rows.sort((a, b) => {
      const dateA = new Date(a.DateAdded || 0);
      const dateB = new Date(b.DateAdded || 0);
      return dateB - dateA;
    });

    return {
      success: true,
      documents: rows,
      count: rows.length
    };
  } catch (e) {
    console.error('Error getting documents:', e);
    return {
      success: false,
      error: 'Failed to load documents: ' + e.message
    };
  }
}

function handleAIRequest(userInput) {
  try {
    if (!userInput || userInput.trim().length < 3) {
      return {
        success: false,
        error: 'Please enter a valid question (at least 3 characters).'
      };
    }
    
    if (userInput.length > 1000) {
      return {
        success: false,
        error: 'Question too long. Please keep it under 1000 characters.'
      };
    }

    console.log('🤖 AI Question received:', userInput.substring(0, 100));
    
    const detectedLanguage = detectLanguage(userInput);
    
    // Enhanced scope checking
    if (!isMahdawiyyahRelated(userInput)) {
      const rejectionMessages = {
        'ar': 'هذا السؤال لا يتعلق بالمهدوية. أنا متخصص فقط في الإمام المهدي (عجل الله فرجه)، الانتظار، الغيبة، النواب الأربعة، وعلوم المهدوية. هل لديك سؤال عن الإمام المهدي أو أي موضوع متعلق به؟',
        'ha': 'Wannan tambaya ba ta da alaƙa da Mahdawiyyah. Ni kwararre ne a kan: Imam Mahdi (A.J.F), Intizara, Ghaybah, Wakilai Hudu, da koyarwar Mahdawiyyah. Kuna da wata tambaya game da Imam Mahdi ko wani batu da ya shafe shi?',
        'fa': 'این سؤال مربوط به مهدویت نیست. من فقط در امام مهدی (عج)، انتظار، غیبت، نواب اربعه و علوم مهدویت تخصص دارم. آیا سوالی درباره امام مهدی یا موضوعات مرتبط دارید؟',
        'en': 'This question does not appear to be related to Mahdawiyyah. I specialize only in Imam Mahdi (AJF), Intizar, Ghaybah, the Four Deputies, and Mahdawiyyah teachings. Do you have a question about Imam Mahdi or any related topic?'
      };
      
      return {
        success: true,
        response: rejectionMessages[detectedLanguage] || rejectionMessages['en'],
        language: detectedLanguage,
        redirect: true
      };
    }

    const aiResponse = callGeminiAPI(userInput);

    return {
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
      language: detectedLanguage
    };
  } catch (e) {
    console.error('AI request error:', e);
    return {
      success: false,
      error: e.message || 'Failed to process AI request.'
    };
  }
}

function handleAdminLogin(username, password) {
  try {
    if (username === CONFIG.ADMIN_USERNAME && password === CONFIG.ADMIN_PASSWORD) {
      const token = createSession();
      return {
        success: true,
        token: token,
        expiresIn: CONFIG.SESSION_TIMEOUT_MINUTES * 60
      };
    }
    return {
      success: false,
      error: 'Invalid username or password.'
    };
  } catch (e) {
    console.error('Login error:', e);
    return {
      success: false,
      error: 'Login service unavailable.'
    };
  }
}

function handleFileUpload(token, blob, fileName, title, author) {
  if (!isValidSession(token)) {
    throw new Error('Session expired. Please login again.');
  }

  if (!title || !author) {
    throw new Error('Title and author are required.');
  }

  const validTypes = ['application/pdf', 
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!validTypes.includes(blob.getContentType())) {
    throw new Error('Only PDF and DOCX files are allowed.');
  }

  const folder = getOrCreateFolder();
  const file = folder.createFile(blob);
  file.setName(fileName.substring(0, 100));
  
  // MAKE FILE PUBLIC IMMEDIATELY
  const publicUrl = makeFilePublic(file.getId());

  const sheet = ensureSheetExists();
  const id = generateUniqueId();
  const date = new Date().toISOString();
  const type = fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCX';

  sheet.appendRow([
    id,
    title.substring(0, 200),
    author.substring(0, 100),
    type,
    date,
    file.getId(),
    publicUrl // Use the public URL
  ]);

  sheet.autoResizeColumns(1, 7);

  return {
    success: true,
    fileId: file.getId(),
    fileUrl: publicUrl,
    fileName: file.getName(),
    message: 'File uploaded successfully and made public.'
  };
}

function handleGeneratePdf(token, title, author, content) {
  if (!isValidSession(token)) {
    throw new Error('Session expired. Please login again.');
  }

  if (!title || !author || !content) {
    throw new Error('Title, author, and content are required.');
  }

  // Create HTML content with FIXED escape function
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 2cm; }
    body { 
      font-family: 'Times New Roman', serif; 
      line-height: 1.6; 
      color: #333;
    }
    .header { 
      text-align: center; 
      margin-bottom: 2cm;
      border-bottom: 2px solid #0b3d2e;
      padding-bottom: 1cm;
    }
    h1 { 
      color: #0b3d2e; 
      font-size: 24pt;
      margin-bottom: 0.5cm;
    }
    .meta { 
      color: #666; 
      font-style: italic;
      font-size: 11pt;
    }
    .content { 
      margin-top: 1cm;
      font-size: 12pt;
      text-align: justify;
    }
    .footer {
      margin-top: 2cm;
      padding-top: 0.5cm;
      border-top: 1px solid #ccc;
      font-size: 10pt;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      Author: ${escapeHtml(author)}<br>
      Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </div>
  </div>
  <div class="content">
    ${content.replace(/\n/g, '<br>').replace(/\r/g, '')}
  </div>
  <div class="footer">
    Generated by Intizar Digital Library | ${new Date().getFullYear()}
  </div>
</body>
</html>`;

  try {
    // Create HTML blob and convert to PDF
    const htmlBlob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html');
    const pdfBlob = htmlBlob.getAs('application/pdf');
    
    const folder = getOrCreateFolder();
    const safeTitle = title.replace(/[^\w\s-]/g, '').substring(0, 50);
    const fileName = `${safeTitle}_${Date.now()}.pdf`;
    const file = folder.createFile(pdfBlob).setName(fileName);
    
    // MAKE PDF PUBLIC IMMEDIATELY
    const publicUrl = makeFilePublic(file.getId());

    const sheet = ensureSheetExists();
    const id = generateUniqueId();
    const date = new Date().toISOString();

    sheet.appendRow([
      id,
      title.substring(0, 200),
      author.substring(0, 100),
      'Generated PDF',
      date,
      file.getId(),
      publicUrl
    ]);

    sheet.autoResizeColumns(1, 7);

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: publicUrl,
      fileName: file.getName(),
      message: 'PDF generated successfully and made public.'
    };
  } catch (e) {
    console.error('PDF generation error:', e);
    throw new Error('Failed to generate PDF: ' + e.message);
  }
}

// === WEB APP ENTRY POINTS ===
function doGet(e) {
  const action = e.parameter.action;
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    let result;
    switch (action) {
      case 'getDocuments':
        result = handleGetDocuments();
        break;
      case 'logout':
        const token = e.parameter.token;
        destroySession(token);
        result = { success: true, message: 'Logged out successfully.' };
        break;
      case 'health':
        result = { 
          success: true, 
          status: 'online',
          version: '3.1',
          timestamp: new Date().toISOString(),
          mahdawiyyah_scope: 'enhanced',
          services: {
            drive: true,
            sheets: true,
            ai: !!CONFIG.GEMINI_API_KEY,
            figures_included: ['Uthman bn Sa\'id', 'Four Deputies', 'Historical Representatives']
          }
        };
        break;
      default:
        result = { 
          success: false, 
          error: 'Invalid action',
          availableActions: ['getDocuments', 'logout', 'health']
        };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('doGet error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const params = e.parameter || {};
    const action = params.action;
    
    console.log('📨 Received POST with action:', action);
    
    if (!action) {
      throw new Error('No action specified');
    }

    let result;
    switch (action) {
      case 'ai':
        const userInput = params.input || params.question || params.q || '';
        if (!userInput) throw new Error('No input provided');
        result = handleAIRequest(userInput);
        break;

      case 'login':
        const username = params.username;
        const password = params.password;
        if (!username || !password) {
          throw new Error('Username and password are required');
        }
        result = handleAdminLogin(username, password);
        break;

      case 'upload':
        if (!isValidSession(params.token)) {
          throw new Error('Unauthorized. Please login again.');
        }
        // Parse form-urlencoded parameters for file upload
        const blob = Utilities.newBlob(
          Utilities.base64Decode(params.fileBase64 || ''),
          params.mimeType || 'application/pdf',
          params.fileName || 'document.pdf'
        );
        result = handleFileUpload(
          params.token,
          blob,
          params.fileName || 'document.pdf',
          params.title || 'Untitled',
          params.author || 'Unknown'
        );
        break;

      case 'generatePdf':
        if (!isValidSession(params.token)) {
          throw new Error('Unauthorized. Please login again.');
        }
        result = handleGeneratePdf(
          params.token,
          params.title || 'Untitled Document',
          params.author || 'Unknown Author',
          params.content || ''
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('doPost error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// === SETUP FUNCTION ===
function setup() {
  console.log('🚀 Starting Intizar Digital Library setup v3.1...');
  console.log('⚠️  Enhanced Mahdawiyyah scope includes: Uthman bn Sa\'id, Four Deputies, Historical Figures');
  
  try {
    const folder = getOrCreateFolder();
    console.log('✅ Drive Folder created/accessed:', folder.getUrl());

    let spreadsheet;
    if (!CONFIG.SPREADSHEET_ID) {
      spreadsheet = SpreadsheetApp.create('Intizar Library Metadata');
      const id = spreadsheet.getId();
      PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
      console.log('✅ New Spreadsheet created:', id);
    } else {
      spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      console.log('✅ Using existing spreadsheet:', CONFIG.SPREADSHEET_ID);
    }

    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      console.log('✅ Created new sheet:', CONFIG.SHEET_NAME);
    }

    const headers = ['ID', 'Title', 'Author', 'Type', 'DateAdded', 'DriveFileId', 'DriveUrl'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);

    console.log('🎉 Setup completed successfully!');
    console.log('🔍 AI Scope now includes all Mahdawiyyah historical figures');
    
    return {
      success: true,
      folderId: folder.getId(),
      spreadsheetId: spreadsheet.getId(),
      message: 'Setup completed successfully!',
      mahdawiyyah_enhancements: 'Added Uthman bn Sa\'id, Four Deputies, and historical figures to AI scope'
    };

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// === TEST FUNCTION WITH ENHANCED SCOPE ===
function testEndpoints() {
  console.log('🧪 Testing endpoints with enhanced Mahdawiyyah scope...');
  
  // Test cases including Uthman bn Sa'id
  const testQuestions = [
    "Who is Uthman bn Sa'id?",
    "Tell me about the Four Deputies of Imam Mahdi",
    "What is Mahdawiyyah?",
    "Explain the Minor Occultation"
  ];
  
  testQuestions.forEach((question, index) => {
    console.log(`\nTest ${index + 1}: "${question}"`);
    try {
      const result = handleAIRequest(question);
      console.log('Success:', result.success);
      console.log('Response preview:', result.response?.substring(0, 100) + '...');
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
  
  const tests = [
    { name: 'Health Check', url: `${ScriptApp.getService().getUrl()}?action=health` },
    { name: 'Get Documents', url: `${ScriptApp.getService().getUrl()}?action=getDocuments` }
  ];
  
  tests.forEach(test => {
    console.log(`\nTesting: ${test.name}`);
    try {
      const response = UrlFetchApp.fetch(test.url, { muteHttpExceptions: true });
      console.log('Status:', response.getResponseCode());
      console.log('Response:', response.getContentText().substring(0, 200));
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
}
