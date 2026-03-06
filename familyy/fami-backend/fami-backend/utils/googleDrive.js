require('dotenv').config();
const { google } = require('googleapis');
const stream = require('stream');

// Get redirect URI - automatically determined from CLIENT_URL if not explicitly set
function getRedirectUri() {
  // If explicitly set, use it (for backward compatibility)
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  
  // Otherwise, automatically construct from CLIENT_URL
  const getClientUrl = require('./getClientUrl');
  const clientUrl = getClientUrl();
  // Remove trailing slash if present
  const baseUrl = clientUrl.replace(/\/$/, '');
  return `${baseUrl}/auth/google/callback`;
}

// Initialize Google Drive API
function getOAuthClient() {
  const redirectUri = getRedirectUri();
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

const oauth2Client = getOAuthClient();

// Check if Google Drive is configured
const checkConfiguration = () => {
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = getRedirectUri();
  const hasRedirectUri = !!redirectUri;
  const isValidSecret = hasClientSecret && 
    process.env.GOOGLE_CLIENT_SECRET !== 'GOCSPX-****QGaG' &&
    process.env.GOOGLE_CLIENT_SECRET.length > 10;

  const configured = hasClientId && hasClientSecret && hasRedirectUri && isValidSecret;

  // Debug logging
  console.log('🔍 Google Drive Configuration Check:');
  console.log('  GOOGLE_CLIENT_ID:', hasClientId ? '✅ Set' : '❌ Missing');
  console.log('  GOOGLE_CLIENT_SECRET:', hasClientSecret ? '✅ Set' : '❌ Missing');
  console.log('  Redirect URI:', redirectUri || '❌ Missing');
  console.log('    (Auto-detected from CLIENT_URL)' + (process.env.GOOGLE_REDIRECT_URI ? ' [Explicitly set]' : ''));
  console.log('  Secret Valid:', isValidSecret ? '✅ Valid' : '❌ Invalid');
  console.log('  Overall Status:', configured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED');

  if (!configured) {
    console.warn('⚠️  Google Drive not fully configured - using local storage for photos');
    if (!hasClientId) console.warn('   Missing: GOOGLE_CLIENT_ID');
    if (!hasClientSecret) console.warn('   Missing: GOOGLE_CLIENT_SECRET');
    if (!hasRedirectUri) console.warn('   Missing: CLIENT_URL or GOOGLE_REDIRECT_URI');
    if (hasClientSecret && !isValidSecret) console.warn('   Invalid: GOOGLE_CLIENT_SECRET format');
  } else {
    console.log('✅ Google Drive API configured');
  }

  return configured;
};

const isConfigured = checkConfiguration();

/**
 * Create or get folder in Google Drive
 * @param {String} folderName - Name of the folder
 * @param {String} parentFolderId - Parent folder ID (optional, defaults to root)
 * @returns {Promise<String>} - Folder ID
 */
const createOrGetFolder = async (folderName, parentFolderId = null) => {
  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Search for existing folder
    let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentFolderId) {
      query += ` and '${parentFolderId}' in parents`;
    } else {
      query += ` and 'root' in parents`;
    }
    
    const searchResponse = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      pageSize: 1
    });
    
    // If folder exists, return its ID
    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
      console.log(`📁 Folder "${folderName}" already exists: ${searchResponse.data.files[0].id}`);
      return searchResponse.data.files[0].id;
    }
    
    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentFolderId ? { parents: [parentFolderId] } : {})
    };
    
    const folderResponse = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name'
    });
    
    console.log(`✅ Created folder "${folderName}": ${folderResponse.data.id}`);
    return folderResponse.data.id;
  } catch (error) {
    console.error(`❌ Error creating/getting folder "${folderName}":`, error.message);
    throw error;
  }
};

/**
 * Get or create user's "fami" root folder
 * @param {String} userId - User ID (for logging purposes)
 * @returns {Promise<String>} - Fami folder ID
 */
const getOrCreateFamiFolder = async (userId = null) => {
  return await createOrGetFolder('fami', null);
};

/**
 * Get or create event folder inside fami folder
 * @param {String} eventName - Event name
 * @param {String} famiFolderId - Fami root folder ID
 * @returns {Promise<String>} - Event folder ID
 */
const getOrCreateEventFolder = async (eventName, famiFolderId) => {
  // Sanitize event name for folder name (remove special characters)
  const sanitizedName = eventName.replace(/[<>:"/\\|?*]/g, '_').trim();
  return await createOrGetFolder(sanitizedName, famiFolderId);
};

/**
 * Upload file to Google Drive
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - Name of the file
 * @param {String} mimeType - MIME type of the file
 * @param {String} folderId - Optional folder ID to upload to
 * @param {String} eventName - Optional event name (creates event subfolder)
 * @returns {Promise<Object>} - File information including URLs
 */
const uploadToDrive = async (fileBuffer, fileName, mimeType, folderId = null, eventName = null) => {
  if (!checkConfiguration()) {
    throw new Error('Google Drive not configured');
  }

  try {
    // Check if credentials are set and valid
    const credentials = oauth2Client.credentials;
    if (!credentials || !credentials.access_token) {
      throw new Error('Google Drive credentials not set. Please reconnect your Google Drive account.');
    }
    
    // Check if token is expired and refresh if needed
    if (credentials.expiry_date && Date.now() >= credentials.expiry_date) {
      console.log('🔄 Access token expired, refreshing...');
      try {
        const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(newCredentials);
        console.log('✅ Token refreshed successfully');
      } catch (refreshError) {
        console.error('❌ Error refreshing token:', refreshError);
        throw new Error('Failed to refresh Google Drive token. Please reconnect your account.');
      }
    }
    
    // Use the current oauth2Client which should have credentials set
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Determine target folder
    let targetFolderId = folderId;
    
    // If eventName is provided, create folder structure: fami -> eventName
    if (eventName && !targetFolderId) {
      const famiFolderId = await getOrCreateFamiFolder();
      targetFolderId = await getOrCreateEventFolder(eventName, famiFolderId);
    } else if (!targetFolderId) {
      // Default to fami folder if no folder specified
      targetFolderId = await getOrCreateFamiFolder();
    }

    const fileMetadata = {
      name: fileName,
      mimeType: mimeType,
      ...(targetFolderId ? { parents: [targetFolderId] } : {})
    };

    // Convert buffer to readable stream (fixes pipe error)
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const media = {
      mimeType: mimeType,
      body: bufferStream
    };

    console.log('📤 Uploading to Google Drive:', fileName, targetFolderId ? `(folder: ${targetFolderId})` : '');

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, mimeType, webViewLink, webContentLink, thumbnailLink'
    });

    const fileId = response.data.id;

    // Make file publicly accessible for viewing
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
    } catch (permError) {
      console.warn('Could not set public permissions:', permError.message);
    }

    // Get public URL
    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    console.log('✅ File uploaded to Google Drive:', publicUrl);

    return {
      success: true,
      fileId: fileId,
      name: response.data.name,
      url: publicUrl,
      webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
      webContentLink: response.data.webContentLink,
      thumbnailLink: response.data.thumbnailLink
    };
  } catch (error) {
    console.error('❌ Error uploading to Google Drive:', error.message);
    throw error;
  }
};

// Alias for backward compatibility
const uploadToGoogleDrive = uploadToDrive;

/**
 * Delete file from Google Drive
 * @param {String} fileId - Google Drive file ID
 * @returns {Promise<Boolean>}
 */
const deleteFromDrive = async (fileId) => {
  if (!isConfigured) {
    return false;
  }

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    await drive.files.delete({ fileId });
    console.log('✅ File deleted from Google Drive:', fileId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting from Google Drive:', error.message);
    return false;
  }
};

// Alias for backward compatibility
const deleteFromGoogleDrive = deleteFromDrive;

/**
 * Get file info from Google Drive
 * @param {String} fileId - Google Drive file ID
 * @returns {Promise<Object>}
 */
const getFileInfo = async (fileId) => {
  if (!isConfigured) {
    throw new Error('Google Drive not configured');
  }

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink'
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error getting file info from Google Drive:', error.message);
    throw error;
  }
};

/**
 * List files in Google Drive folder
 * @param {String} folderId - Google Drive folder ID (optional)
 * @param {Number} pageSize - Number of files to return
 * @returns {Promise<Array>}
 */
const listDriveFiles = async (folderId = null, pageSize = 50) => {
  if (!isConfigured) {
    throw new Error('Google Drive not configured');
  }

  try {
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const query = folderId 
      ? `'${folderId}' in parents and trashed = false`
      : process.env.GOOGLE_DRIVE_FOLDER_ID
        ? `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`
        : 'trashed = false';

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)',
      pageSize: pageSize,
      orderBy: 'modifiedTime desc'
    });

    return response.data.files || [];
  } catch (error) {
    console.error('❌ Error listing files from Google Drive:', error.message);
    throw error;
  }
};

// Alias for backward compatibility
const listFiles = listDriveFiles;

/**
 * Set OAuth2 credentials (for authenticated requests)
 * @param {Object} tokens - OAuth2 tokens
 * @returns {Promise<Object>} - Updated tokens if refreshed
 */
const setCredentials = async (tokens) => {
  if (!tokens || !tokens.access_token) {
    throw new Error('Invalid tokens provided');
  }
  
  oauth2Client.setCredentials(tokens);
  
  // Check if token needs refresh
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
    if (!tokens.refresh_token) {
      throw new Error('Token expired and no refresh token available. Please reconnect Google Drive.');
    }
    
    try {
      console.log('🔄 Refreshing expired access token...');
      const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(newCredentials);
      
      // Return updated tokens to save to database
      const updatedTokens = {
        ...tokens,
        access_token: newCredentials.access_token,
        expiry_date: newCredentials.expiry_date
      };
      
      console.log('✅ Token refreshed successfully');
      return updatedTokens;
    } catch (refreshError) {
      console.error('❌ Error refreshing token:', refreshError);
      throw new Error('Failed to refresh Google Drive token. Please reconnect your account.');
    }
  }
  
  console.log('✅ Google Drive credentials set');
  return tokens;
};

/**
 * Get authorization URL for OAuth2
 * @returns {String} - Authorization URL
 */
const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'openid',
    'email',
    'profile'
  ];

  // Recreate OAuth client to ensure latest redirect URI
  const freshOAuthClient = getOAuthClient();
  const redirectUri = getRedirectUri();
  
  console.log('🔗 Generating Auth URL with redirect URI:', redirectUri);

  const authUrl = freshOAuthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Forces refresh_token on repeat logins
    scope: scopes
  });
  
  console.log('🔗 Generated Auth URL:', authUrl);

  return authUrl;
};

/**
 * Get tokens from authorization code
 * @param {String} code - Authorization code
 * @returns {Promise<Object>} - Tokens
 */
const getTokensFromCode = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
    throw error;
  }
};

// Export isConfigured as a function to check dynamically
const isConfiguredFunction = () => {
  return checkConfiguration();
};

module.exports = {
  uploadToDrive,
  uploadToGoogleDrive, // Alias for backward compatibility
  deleteFromDrive,
  deleteFromGoogleDrive, // Alias for backward compatibility
  getFileInfo,
  listDriveFiles,
  listFiles, // Alias for backward compatibility
  setCredentials,
  getAuthUrl,
  getTokensFromCode,
  isConfigured: isConfiguredFunction, // Export as function for dynamic checking
  getOAuthClient,
  createOrGetFolder,
  getOrCreateFamiFolder,
  getOrCreateEventFolder
};
