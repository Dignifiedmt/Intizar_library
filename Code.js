// Intizar Digital Library - Google Apps Script Backend v2.0
// Deploy as Web App (Execute as 'Me', Access 'Anyone with link')

// === CONFIGURATION (Set via Script Properties) ===
const CONFIG = {
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  ADMIN_USERNAME: PropertiesService.getScriptProperties().getProperty('ADMIN_USERNAME'),
  ADMIN_PASSWORD: PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD'),
  SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
  DRIVE_FOLDER_NAME: 'Intizar Digital Library',
  SHEET_NAME: 'intizar_library',
  AI_MODEL: 'gemini-2.5-flash-exp',
  SESSION_TIMEOUT_MINUTES: 60
};

// === MAHDAWIYYAH KEYWORD FILTER (Enhanced) ===
const MAHDAWIYYAH_KEYWORDS = [
  'mahdawiyyah', 'mahdi', 'imam mahdi', 'intizar', 'muntazar', 'zakzaky',
  'غیبت', 'انتظار', 'مهدویت', 'امام مهدی', 'زکزاکی', 'شیعی', 'shia',
  'occultation', 'awaited', 'mahdaviat', 'mahdism'
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
      // Create headers
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

// === AI SCOPE VALIDATION (Enhanced) ===
function isMahdawiyyahRelated(text) {
  if (!text || text.trim().length < 3) return false;
  
  const lower = text.toLowerCase().trim();
  
  // Check for keywords
  const hasKeyword = MAHDAWIYYAH_KEYWORDS.some(keyword => 
    lower.includes(keyword.toLowerCase())
  );
  
  if (hasKeyword) return true;
  
  // Check for related terms in context
  const islamicTerms = ['islam', 'muslim', 'quran', 'prophet', 'imam', 'justice', 'leadership', 'religion', 'faith'];
  const hasIslamicTerm = islamicTerms.some(term => lower.includes(term));
  const hasQuestionWord = /^(what|who|when|where|why|how|explain|describe|tell me about)/i.test(lower);
  
  return hasIslamicTerm && hasQuestionWord;
}

// === AI GEMINI INTEGRATION (Updated for 2026) ===
function callGeminiAPI(prompt) {
  if (!CONFIG.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY in Script Properties.');
  }

  // Use the latest Gemini API endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.AI_MODEL}:generateContent`;
  
  const payload = {
    contents: [{
      parts: [{ 
        text: `You are an expert on Mahdawiyyah (the doctrine of Imam Mahdi). 
        Answer the following question accurately and respectfully.
        If you don't know something, say so honestly.
        
        Question: ${prompt}`
      }]
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
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
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
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (data.error) {
      console.error('Gemini API error:', data.error);
      throw new Error(`AI service error: ${data.error.message || 'Unknown error'}`);
    }
    
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 
           'I apologize, but I could not generate a response. Please try again.';
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
      .filter(row => row[0]) // Filter out empty rows
      .map(row => {
        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx] || '';
        });
        return obj;
      });

    // Sort by DateAdded descending
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
    // Input validation
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

    // Scope validation
    if (!isMahdawiyyahRelated(userInput)) {
      return {
        success: true,
        response: 'This question does not appear to be related to Mahdawiyyah. ' +
                 'I am specialized in topics about Imam Mahdi (AJF), the concept of Intizar, ' +
                 'and the Mahdawiyyah movement. Please ask a related question.'
      };
    }

    // Call Gemini API
    const aiResponse = callGeminiAPI(userInput);

    return {
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
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

function handleFileUpload(token, fileBlob, fileName, metadata) {
  if (!isValidSession(token)) {
    throw new Error('Session expired. Please login again.');
  }

  // Validate metadata
  if (!metadata.title || !metadata.author) {
    throw new Error('Title and author are required.');
  }

  // Validate file type
  const validTypes = ['application/pdf', 
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!validTypes.includes(fileBlob.getContentType())) {
    throw new Error('Only PDF and DOCX files are allowed.');
  }

  const folder = getOrCreateFolder();
  const file = folder.createFile(fileBlob);
  file.setName(fileName.substring(0, 100)); // Limit filename length

  const sheet = ensureSheetExists();
  const id = generateUniqueId();
  const date = new Date().toISOString();
  const type = fileName.endsWith('.pdf') ? 'PDF' : 'DOCX';

  sheet.appendRow([
    id,
    metadata.title.substring(0, 200), // Limit title length
    metadata.author.substring(0, 100), // Limit author length
    type,
    date,
    file.getId(),
    file.getUrl()
  ]);

  // Auto-resize columns
  sheet.autoResizeColumns(1, 7);

  return {
    success: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    fileName: file.getName(),
    message: 'File uploaded successfully.'
  };
}

function handleGeneratePdf(token, formData) {
  if (!isValidSession(token)) {
    throw new Error('Session expired. Please login again.');
  }

  // Validate form data
  if (!formData.title || !formData.author || !formData.body) {
    throw new Error('Title, author, and content are required.');
  }

  // Create HTML content with proper escaping
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(formData.title)}</title>
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
    <h1>${escapeHtml(formData.title)}</h1>
    <div class="meta">
      Author: ${escapeHtml(formData.author)}<br>
      Generated: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </div>
  </div>
  <div class="content">
    ${formData.body.replace(/\n/g, '<br>').replace(/\r/g, '')}
  </div>
  <div class="footer">
    Generated by Intizar Digital Library | ${new Date().getFullYear()}
  </div>
</body>
</html>`;

  try {
    const blob = Utilities.newBlob(htmlContent, 'text/html', 'document.html');
    const pdfBlob = blob.getAs('application/pdf');
    
    const folder = getOrCreateFolder();
    const safeTitle = formData.title.replace(/[^\w\s-]/g, '').substring(0, 50);
    const fileName = `${safeTitle}_${Date.now()}.pdf`;
    const file = folder.createFile(pdfBlob).setName(fileName);

    const sheet = ensureSheetExists();
    const id = generateUniqueId();
    const date = new Date().toISOString();

    sheet.appendRow([
      id,
      formData.title.substring(0, 200),
      formData.author.substring(0, 100),
      'Generated PDF',
      date,
      file.getId(),
      file.getUrl()
    ]);

    // Auto-resize columns
    sheet.autoResizeColumns(1, 7);

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: file.getName(),
      message: 'PDF generated successfully.'
    };
  } catch (e) {
    console.error('PDF generation error:', e);
    throw new Error('Failed to generate PDF: ' + e.message);
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === REQUEST PARSING ===
function parseRequest(e) {
  const contentType = e.postData ? e.postData.type : 'application/x-www-form-urlencoded';
  const params = {};
  
  if (contentType.includes('application/json') && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      console.error('JSON parse error:', error);
      throw new Error('Invalid JSON data');
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // Parse form data
    if (e.postData && e.postData.contents) {
      const pairs = e.postData.contents.split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value.replace(/\+/g, ' '));
        }
      });
    }
    // Also include URL parameters
    Object.keys(e.parameter || {}).forEach(key => {
      params[key] = e.parameter[key];
    });
    return params;
  } else if (e.parameter) {
    return e.parameter;
  }
  
  return {};
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
          timestamp: new Date().toISOString(),
          services: {
            drive: true,
            sheets: true,
            ai: !!CONFIG.GEMINI_API_KEY
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
    const params = parseRequest(e);
    const action = params.action;
    
    if (!action) {
      throw new Error('No action specified');
    }

    let result;
    switch (action) {
      case 'ai':
        const userInput = params.input || params.question || params.q;
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
        // Parse the JSON payload for file upload
        const uploadData = JSON.parse(e.postData.contents);
        const blob = Utilities.newBlob(
          Utilities.base64Decode(uploadData.fileBase64),
          uploadData.mimeType,
          uploadData.fileName
        );
        result = handleFileUpload(
          uploadData.token,
          blob,
          uploadData.fileName,
          uploadData.metadata
        );
        break;

      case 'generatePdf':
        if (!isValidSession(params.token)) {
          throw new Error('Unauthorized. Please login again.');
        }
        // Parse the JSON payload for PDF generation
        const pdfData = JSON.parse(e.postData.contents);
        result = handleGeneratePdf(pdfData.token, pdfData.formData);
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

// === SETUP FUNCTION (Run once) ===
function setup() {
  console.log('🚀 Starting Intizar Digital Library setup...');
  
  try {
    // Create folder
    const folder = getOrCreateFolder();
    console.log('✅ Drive Folder created/accessed.');
    console.log('📁 Folder ID:', folder.getId());
    console.log('📁 Folder Name:', folder.getName());
    console.log('📁 Folder URL:', folder.getUrl());

    // Create or access spreadsheet
    let spreadsheet;
    if (!CONFIG.SPREADSHEET_ID) {
      spreadsheet = SpreadsheetApp.create('Intizar Library Metadata');
      const id = spreadsheet.getId();
      PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
      console.log('✅ New Spreadsheet created!');
      console.log('📋 Spreadsheet ID:', id);
      console.log('🔗 Spreadsheet URL:', `https://docs.google.com/spreadsheets/d/${id}/edit`);
    } else {
      spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      console.log('✅ Using existing spreadsheet.');
      console.log('📋 Spreadsheet ID:', CONFIG.SPREADSHEET_ID);
    }

    // Ensure sheet exists with correct name
    let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
      console.log('✅ Created new sheet:', CONFIG.SHEET_NAME);
    } else {
      console.log('✅ Sheet already exists:', CONFIG.SHEET_NAME);
    }

    // Setup headers
    const headers = ['ID', 'Title', 'Author', 'Type', 'DateAdded', 'DriveFileId', 'DriveUrl'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);

    console.log('🎉 Setup completed successfully!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Check Script Properties are set:');
    console.log('   - GEMINI_API_KEY');
    console.log('   - ADMIN_USERNAME');
    console.log('   - ADMIN_PASSWORD');
    console.log('   - SPREADSHEET_ID');
    console.log('2. Deploy as Web App');
    console.log('3. Test the endpoints');

    return {
      success: true,
      folderId: folder.getId(),
      spreadsheetId: spreadsheet.getId(),
      sheetName: CONFIG.SHEET_NAME,
      message: 'Setup completed successfully!'
    };

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// === TEST FUNCTION ===
function testEndpoints() {
  console.log('🧪 Testing endpoints...');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${ScriptApp.getService().getUrl()}?action=health`,
      method: 'get'
    },
    {
      name: 'Get Documents',
      url: `${ScriptApp.getService().getUrl()}?action=getDocuments`,
      method: 'get'
    }
  ];
  
  tests.forEach(test => {
    console.log(`\nTesting: ${test.name}`);
    try {
      const response = UrlFetchApp.fetch(test.url, {
        method: test.method,
        muteHttpExceptions: true
      });
      console.log('Status:', response.getResponseCode());
      console.log('Response:', response.getContentText().substring(0, 200));
    } catch (error) {
      console.error('Error:', error.message);
    }
  });
}