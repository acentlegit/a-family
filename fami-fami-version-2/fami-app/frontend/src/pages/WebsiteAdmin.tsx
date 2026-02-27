import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api, { getApiUrl } from '../config/api';
import axios from 'axios';
import '../styles/WebsiteAdmin.css';

interface ContentBlock {
  id?: string;
  blockType?: 'hero' | 'text' | 'image' | 'gallery' | 'form' | 'video' | 'map' | 'timeline' | 'testimonial' | 'stats' | 'custom';
  blockOrder?: number;
  contentData?: any;
  // Database field names (snake_case)
  block_type?: 'hero' | 'text' | 'image' | 'gallery' | 'form' | 'video' | 'map' | 'timeline' | 'testimonial' | 'stats' | 'custom';
  block_order?: number;
  content_data?: any;
}

interface Page {
  id?: number;
  pageType?: string;
  pageTitle?: string;
  pageSlug?: string;
  routePath?: string;
  isPublished?: boolean;
  contentBlocks?: ContentBlock[];
  // Database field names (snake_case)
  page_type?: string;
  page_title?: string;
  page_slug?: string;
  route_path?: string;
  is_published?: boolean;
  content_blocks?: ContentBlock[];
}

interface WebsiteConfig {
  id?: number;
  siteTitle: string;
  headerText: string;
  footerText: string;
  theme: 'light' | 'dark';
  layout: 'sidebar' | 'topnav';
  logoUrl: string;
  sampleImageUrl?: string;
  domain: string;
  description?: string;
  customPages?: string;
  sampleImage?: File | string;
}

const WebsiteAdmin: React.FC = () => {
  const { familyId } = useParams<{ familyId: string }>();
  const [families, setFamilies] = useState<any[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(familyId || '');
  const [config, setConfig] = useState<WebsiteConfig>({
    siteTitle: '',
    headerText: '',
    footerText: '',
    theme: 'light',
    layout: 'sidebar',
    logoUrl: '',
    domain: '',
    description: '',
    customPages: '',
    sampleImage: undefined,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string>('');
  const [sampleImageFileName, setSampleImageFileName] = useState<string>('');
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [showPageForm, setShowPageForm] = useState(false);
  const [newPage, setNewPage] = useState<Partial<Page>>({
    pageType: 'custom',
    pageTitle: '',
    pageSlug: '',
    routePath: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [familiesError, setFamiliesError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Load families list
    const loadFamilies = async () => {
      setLoadingFamilies(true);
      setFamiliesError(null);
      try {
        console.log('Loading families...');
        const response = await api.get('/families');
        console.log('Families response:', response.data);
        const familiesList = response.data.data || response.data || [];
        setFamilies(familiesList);
        
        // If no familyId in URL but families exist, use first family
        if (!familyId && familiesList.length > 0) {
          setSelectedFamilyId(familiesList[0]._id || familiesList[0].id);
        } else if (familyId) {
          setSelectedFamilyId(familyId);
        }
      } catch (error: any) {
        console.error('Error loading families:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to load families';
        setFamiliesError(errorMessage);
        // If it's a 401, the api interceptor will handle redirect
        if (error.response?.status !== 401) {
          setFamiliesError(`Error: ${errorMessage}. Please check if you're logged in and have access to families.`);
        }
      } finally {
        setLoadingFamilies(false);
      }
    };
    
    loadFamilies();
  }, [familyId]);

  useEffect(() => {
    if (selectedFamilyId) {
      loadConfig();
      loadPages();
    }
  }, [selectedFamilyId]);

  const generateWebsiteWithAI = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }

    // Get site title from config (handle both camelCase and snake_case)
    // Also try to read directly from the input field as a fallback
    const siteTitleInput = document.querySelector('input[placeholder="My Family Website"]') as HTMLInputElement;
    const siteTitleFromInput = siteTitleInput?.value?.trim() || '';
    const siteTitle = (config.siteTitle || (config as any).site_title || siteTitleFromInput || '').trim();
    
    console.log('Site Title Check:', {
      configSiteTitle: config.siteTitle,
      configSite_title: (config as any).site_title,
      inputValue: siteTitleFromInput,
      finalSiteTitle: siteTitle
    });
    
    if (!siteTitle) {
      alert('Please enter a Site Title first');
      return;
    }

    if (!window.confirm('This will generate pages using AI based on your current configuration. This may take 1-2 minutes. Continue?')) {
      return;
    }

    setLoading(true);
    console.log('🤖 AI generation started - this may take 1-2 minutes...');
    
    try {
      console.log('🤖 Generating website with AI using current config...');
      console.log('Config:', config);
      
      // Use existing form values to generate website (handle both field name formats)
      const headerText = config.headerText || (config as any).header_text || '';
      const footerText = config.footerText || (config as any).footer_text || '';
      const theme = config.theme || (config as any).theme || 'light';
      const description = config.description || headerText || '';
      const customPages = config.customPages || '';
      
      // Calculate number of pages based on custom pages or existing pages
      let numberOfPages = pages.length > 0 ? pages.length : 4;
      if (customPages) {
        const customPagesList = customPages.split(',').map(p => p.trim()).filter(p => p.length > 0);
        numberOfPages = Math.max(numberOfPages, customPagesList.length + 1); // +1 for homepage
      }
      
      // AI generation can take 2-5 minutes, so use much longer timeout
      // Use axios directly with extended timeout for this long-running request
      const apiUrl = getApiUrl();
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${apiUrl}/website-admin/generate-with-ai/${selectedFamilyId}`,
        {
          customerDetails: {
            familyName: siteTitle,
            description: description || headerText,
            numberOfPages: numberOfPages,
            theme: theme,
            additionalInfo: footerText,
            customPages: customPages,
            domain: config.domain || ''
          }
        },
        {
          timeout: 300000, // 5 minutes timeout for AI generation
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      );

      if (response.data.success) {
        // Reload config and pages
        await loadConfig();
        await loadPages();
        
        // Automatically open preview after generation (silently, no alert)
        console.log('🔄 Auto-opening preview...');
        await generatePreview();
      } else {
        throw new Error(response.data.error || 'Failed to generate website');
      }
    } catch (error: any) {
      console.error('Error generating website with AI:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('exceeded')) {
        alert(
          '⏱️ Request timed out. AI generation is taking longer than expected.\n\n' +
          'This is normal for AI generation (can take 2-5 minutes).\n\n' +
          'Possible reasons:\n' +
          '• Ollama is processing a large request\n' +
          '• Your computer may be slow\n' +
          '• Ollama model needs to be downloaded\n\n' +
          'Please check:\n' +
          '1. Is Ollama running? (ollama serve)\n' +
          '2. Check backend console for progress\n' +
          '3. Try again - the request may still be processing on the backend'
        );
      } else {
        // Get detailed error message
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error generating website with AI';
        const errorDetails = error.response?.data?.details || error.response?.data?.hint || '';
        const fullErrorMessage = errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage;
        
        alert(`Error: ${fullErrorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    if (!selectedFamilyId) return;
    try {
      const response = await api.get(`/website-admin/config/${selectedFamilyId}`);
      if (response.data.success && response.data.config) {
        const dbConfig = response.data.config;
        // Normalize field names from database (snake_case) to state format (camelCase)
        setConfig({
          id: dbConfig.id,
          siteTitle: dbConfig.site_title || dbConfig.siteTitle || '',
          headerText: dbConfig.header_text || dbConfig.headerText || '',
          footerText: dbConfig.footer_text || dbConfig.footerText || '',
          theme: dbConfig.theme || 'light',
          layout: dbConfig.layout || 'sidebar',
          logoUrl: dbConfig.logo_url || dbConfig.logoUrl || '',
          sampleImageUrl: dbConfig.sample_image_url || dbConfig.sampleImageUrl || '',
          domain: dbConfig.domain || '',
          description: dbConfig.description || '',
          customPages: dbConfig.custom_pages || dbConfig.customPages || ''
        });
        
        // Set sample image file name if URL exists
        if (dbConfig.sample_image_url || dbConfig.sampleImageUrl) {
          const imageUrl = dbConfig.sample_image_url || dbConfig.sampleImageUrl;
          const fileName = imageUrl.split('/').pop() || 'sample-image.jpg';
          setSampleImageFileName(fileName);
        }
        
        // Set logo preview if logoUrl exists
        if (dbConfig.logo_url || dbConfig.logoUrl) {
          const logoUrl = dbConfig.logo_url || dbConfig.logoUrl;
          // Construct full URL if it's a relative path
          const baseUrl = getApiUrl().replace('/api', '');
          const fullLogoUrl = logoUrl.startsWith('http') 
            ? logoUrl 
            : (logoUrl.startsWith('/') ? `${baseUrl}${logoUrl}` : `${baseUrl}/${logoUrl}`);
          setLogoPreview(fullLogoUrl);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadPages = async () => {
    if (!selectedFamilyId) return;
    try {
      const response = await api.get(`/website-admin/pages/${selectedFamilyId}`);
      if (response.data.success) {
        // Handle both array and object responses
        const pagesData = response.data.pages || response.data.data || [];
        setPages(Array.isArray(pagesData) ? pagesData : []);
      }
    } catch (error: any) {
      console.error('Error loading pages:', error);
      // Don't show alert for loading errors, just log
    }
  };

  const saveConfig = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }
    setLoading(true);
    try {
      console.log('Saving config for family:', selectedFamilyId);
      console.log('Config data:', config);
      const response = await api.post(`/website-admin/config/${selectedFamilyId}`, config);
      console.log('Save config response:', response);
      if (response.data.success) {
        alert('Configuration saved successfully!');
        // Reload config to get updated data
        await loadConfig();
      } else {
        throw new Error(response.data.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Error saving config:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error URL:', error.config?.url);
      
      let errorMessage = 'Error saving configuration';
      if (error.response?.status === 404) {
        errorMessage = 'API route not found. Please ensure the backend server is running and the route is registered.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Error saving configuration: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const createPage = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }
    if (!newPage.pageTitle) {
      alert('Please fill in page title');
      return;
    }

    // Auto-generate slug if not provided
    const pageSlug = newPage.pageSlug || newPage.pageTitle.toLowerCase().replace(/\s+/g, '-');
    const routePath = newPage.routePath || `/${pageSlug}`;

    setLoading(true);
    try {
      const response = await api.post(`/website-admin/pages/${selectedFamilyId}`, {
        pageType: newPage.pageType || 'custom',
        pageTitle: newPage.pageTitle,
        pageSlug: pageSlug,
        routePath: routePath,
        contentBlocks: [],
      });
      
      if (response.data.success) {
        // Reload pages to get the updated list
        await loadPages();
        setNewPage({
          pageType: 'custom',
          pageTitle: '',
          pageSlug: '',
          routePath: '',
        });
        setShowPageForm(false);
        alert('Page created successfully!');
      } else {
        throw new Error(response.data.error || 'Failed to create page');
      }
    } catch (error: any) {
      console.error('Error creating page:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error creating page';
      alert(`Error creating page: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePage = async (page: Page) => {
    setLoading(true);
    try {
      const response = await api.put(`/website-admin/pages/${page.id}`, page);
      if (response.data.success) {
        setPages(pages.map(p => p.id === page.id ? response.data.page : p));
        alert('Page updated successfully!');
      }
    } catch (error) {
      console.error('Error updating page:', error);
      alert('Error updating page');
    } finally {
      setLoading(false);
    }
  };

  const deletePage = async (pageId: number) => {
    if (!window.confirm('Are you sure you want to delete this page?')) return;

    setLoading(true);
    try {
      await api.delete(`/website-admin/pages/${pageId}`);
      setPages(pages.filter(p => p.id !== pageId));
      if (selectedPage?.id === pageId) {
        setSelectedPage(null);
      }
      alert('Page deleted successfully!');
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Error deleting page');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post(`/website-admin/preview/${selectedFamilyId}`);
        if (response.data.success) {
          const previewUrl = response.data.previewUrl || response.data.localPath;
          
          if (previewUrl) {
            // Get backend base URL (remove /api from API URL)
            const apiUrl = getApiUrl();
            const backendBaseUrl = apiUrl.replace('/api', '');

            // If it's a local path, construct the full URL using backend base URL
            const fullUrl = previewUrl.startsWith('http')
              ? previewUrl
              : `${backendBaseUrl}${previewUrl}`;
            setPreviewUrl(fullUrl);
            
            // Open preview silently without alert
            window.open(fullUrl, '_blank');
          } else {
            alert('Preview generated but URL not available');
          }
        } else {
          throw new Error(response.data.error || 'Failed to generate preview');
        }
    } catch (error: any) {
      console.error('Error generating preview:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error generating preview';
      alert(`Error generating preview: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const publishWebsite = async () => {
    if (!selectedFamilyId) {
      alert('Please select a family first');
      return;
    }
    
    if (!window.confirm('Are you sure you want to publish the website? This will deploy to S3.')) return;

    setLoading(true);
    try {
      const response = await api.post(`/website-admin/publish/${selectedFamilyId}`);
      if (response.data.success) {
        const s3Url = response.data.s3Url || 'N/A';
        const cloudfrontUrl = response.data.cloudfrontUrl || response.data.cloudFrontUrl || 'N/A';
        alert(`Website published successfully!\n\nS3 URL: ${s3Url}\nCloudFront URL: ${cloudfrontUrl}`);
        await loadPages(); // Reload to update published status
      } else {
        throw new Error(response.data.error || 'Failed to publish website');
      }
    } catch (error: any) {
      console.error('Error publishing website:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error publishing website';
      alert(`Error publishing website: ${errorMessage}\n\nPlease check:\n- AWS credentials are configured\n- S3 bucket exists\n- Backend logs for details`);
    } finally {
      setLoading(false);
    }
  };

  const addContentBlock = (page: Page, blockType: ContentBlock['blockType']) => {
    const currentBlocks = page.contentBlocks || page.content_blocks || [];
    const newBlock: ContentBlock = {
      blockType: blockType || undefined,
      blockOrder: currentBlocks.length,
      contentData: getDefaultContentData(blockType),
    };

    const updatedPage = {
      ...page,
      contentBlocks: [...currentBlocks, newBlock],
    };

    updatePage(updatedPage);
  };

  const getDefaultContentData = (blockType: ContentBlock['blockType']) => {
    switch (blockType) {
      case 'hero':
        return { title: '', subtitle: '', image: '' };
      case 'text':
        return { heading: '', body: '' };
      case 'image':
        return { url: '', alt: '', caption: '' };
      case 'gallery':
        return { title: 'Gallery', images: [] };
      case 'form':
        return { title: 'Contact Form', fields: [] };
      case 'video':
        return { title: 'Video', url: '', caption: '' };
      case 'map':
        return { title: 'Location', embedCode: '', address: '' };
      case 'timeline':
        return { title: 'Timeline', events: [] };
      case 'testimonial':
        return { title: 'Testimonials', testimonials: [] };
      case 'stats':
        return { title: 'Statistics', stats: [] };
      default:
        return {};
    }
  };

  if (loadingFamilies) {
    return (
      <Layout>
        <div className="website-admin">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Loading families...</h2>
            <p>Please wait while we fetch your families.</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (familiesError) {
    return (
      <Layout>
        <div className="website-admin">
          <div style={{ padding: '40px', textAlign: 'center', background: '#fee', borderRadius: '8px', margin: '20px' }}>
            <h2 style={{ color: '#c33' }}>Error Loading Families</h2>
            <p style={{ color: '#666' }}>{familiesError}</p>
            <button 
              onClick={() => window.location.reload()} 
              style={{ 
                marginTop: '20px', 
                padding: '10px 20px', 
                background: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (families.length === 0 && !selectedFamilyId) {
    return (
      <Layout>
        <div className="website-admin">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>No Families Found</h2>
            <p>You need to create or join a family first to use Website.</p>
            <a href="/families" style={{ color: '#007bff', textDecoration: 'underline' }}>
              Go to My Families
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="website-admin">
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
          <h1>Website</h1>
          {families.length > 0 && (
            <select
              value={selectedFamilyId}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                minWidth: '200px'
              }}
            >
              <option value="">Select a Family</option>
              {families.map((family) => (
                <option key={family._id || family.id} value={family._id || family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="admin-actions">
          <button 
            onClick={generateWebsiteWithAI} 
            disabled={loading || !selectedFamilyId} 
            className="btn"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              marginRight: '10px'
            }}
          >
            🤖 Generate
          </button>
          <button onClick={generatePreview} disabled={loading || !selectedFamilyId} className="btn btn-preview">
            Preview
          </button>
          <button onClick={publishWebsite} disabled={loading || !selectedFamilyId} className="btn btn-publish">
            Publish to S3
          </button>
        </div>
      </div>

      {!selectedFamilyId && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', margin: '20px' }}>
          <h2>Select a Family</h2>
          <p>Please select a family from the dropdown above to configure its website.</p>
        </div>
      )}

      {selectedFamilyId && (
      <div className="admin-content">
        {/* Configuration Panel */}
        <div className="config-panel">
          <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>Website Configuration</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>Configure your website settings and branding</p>
          </div>

          {/* Basic Information Section */}
          <div className="form-section">
            <h3 className="section-title">Basic Information</h3>
            
            <div className="form-group">
              <label>
                Site Title <span className="required">*</span>
              </label>
              <input
                type="text"
                value={config.siteTitle}
                onChange={(e) => setConfig({ ...config, siteTitle: e.target.value })}
                placeholder="My Family Website"
                className="form-input"
              />
              <small className="form-hint">This will appear in the navigation and page titles</small>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={config.description || ''}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Describe your website in a few words..."
                rows={3}
                className="form-textarea"
              />
              <small className="form-hint">Brief description of your website (used for SEO and AI generation)</small>
            </div>

            <div className="form-group">
              <label>Domain</label>
              <input
                type="text"
                value={config.domain}
                onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                placeholder="myfamily.com"
                className="form-input"
              />
              <small className="form-hint">Your website domain (optional)</small>
            </div>
          </div>

          {/* Content Section */}
          <div className="form-section">
            <h3 className="section-title">Content</h3>
            
            <div className="form-group">
              <label>Header Text</label>
              <textarea
                value={config.headerText}
                onChange={(e) => setConfig({ ...config, headerText: e.target.value })}
                placeholder="Welcome to our family portal..."
                rows={3}
                className="form-textarea"
              />
              <small className="form-hint">Text displayed in the website header</small>
            </div>

            <div className="form-group">
              <label>Footer Text</label>
              <textarea
                value={config.footerText}
                onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                placeholder="© 2024 Family Portal. All rights reserved."
                rows={2}
                className="form-textarea"
              />
              <small className="form-hint">Text displayed in the website footer</small>
            </div>
          </div>

          {/* Branding Section */}
          <div className="form-section branding-section">
            <h3 className="section-title">Branding</h3>
            
            <div className="form-group">
              <label>Logo</label>
              <label className="file-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && selectedFamilyId) {
                      setLogoFileName(file.name);
                      // Create preview immediately
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setLogoPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                      
                      // Upload logo to server
                      try {
                        setLoading(true);
                        const formData = new FormData();
                        formData.append('logo', file);
                        
                        console.log('📤 Uploading logo for family:', selectedFamilyId);
                        console.log('📤 File:', file.name, file.size, 'bytes');
                        console.log('📤 API Base URL:', getApiUrl());
                        
                        // Construct the full URL to ensure it's correct
                        const apiBaseUrl = getApiUrl();
                        const uploadUrl = `${apiBaseUrl}/website-admin/upload-logo/${selectedFamilyId}`;
                        console.log('📤 Full Upload URL:', uploadUrl);
                        
                        // Use axios directly with full URL to avoid routing issues
                        const token = localStorage.getItem('token');
                        const uploadResponse = await axios.post(
                          uploadUrl,
                          formData,
                          {
                            headers: {
                              'Authorization': token ? `Bearer ${token}` : '',
                              // Don't set Content-Type - let browser set it with boundary
                            },
                            timeout: 30000
                          }
                        );
                        
                        console.log('📥 Upload response:', uploadResponse.data);
                        
                        if (uploadResponse.data.success) {
                          const logoUrl = uploadResponse.data.logoUrl;
                          // Construct full URL for preview
                          const baseUrl = apiBaseUrl.replace('/api', '');
                          const fullLogoUrl = logoUrl.startsWith('http') 
                            ? logoUrl 
                            : `${baseUrl}${logoUrl}`;
                          
                          setConfig({ ...config, logoUrl: fullLogoUrl });
                          setLogoPreview(fullLogoUrl);
                          console.log('✅ Logo uploaded successfully:', fullLogoUrl);
                          alert('Logo uploaded successfully!');
                        } else {
                          throw new Error(uploadResponse.data.message || 'Upload failed');
                        }
                      } catch (error: any) {
                        console.error('❌ Error uploading logo:', error);
                        console.error('❌ Error response:', error.response?.data);
                        console.error('❌ Error status:', error.response?.status);
                        
                        let errorMessage = 'Error uploading logo';
                        if (error.response?.status === 404) {
                          errorMessage = 'Upload endpoint not found. Please restart the backend server.';
                        } else if (error.response?.data?.error) {
                          errorMessage = error.response.data.error;
                        } else if (error.response?.data?.message) {
                          errorMessage = error.response.data.message;
                        } else if (error.message) {
                          errorMessage = error.message;
                        }
                        
                        alert(errorMessage);
                        // Keep the preview even if upload fails (user can see what they selected)
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  className="file-input"
                />
                <span className="file-upload-button">Choose File</span>
                <span className="file-name">{logoFileName || 'No file chosen'}</span>
              </label>
              {(logoPreview || config.logoUrl) && (
                <div className="logo-preview">
                  <img 
                    src={logoPreview || config.logoUrl} 
                    alt="Logo preview" 
                    className="logo-preview-img"
                  />
                  <span className="logo-preview-label">✓ Logo Preview</span>
                </div>
              )}
              <small className="form-hint">Upload your logo (recommended: square image, 200×200px or larger)</small>
            </div>

            <div className="form-group">
              <label>Sample Image <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</span></label>
              <label className="file-upload-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && selectedFamilyId) {
                      setSampleImageFileName(file.name);
                      
                      // Upload sample image to server
                      try {
                        setLoading(true);
                        const formData = new FormData();
                        formData.append('sampleImage', file);
                        
                        const apiBaseUrl = getApiUrl();
                        const uploadUrl = `${apiBaseUrl}/website-admin/upload-sample-image/${selectedFamilyId}`;
                        const token = localStorage.getItem('token');
                        const uploadResponse = await axios.post(
                          uploadUrl,
                          formData,
                          {
                            headers: {
                              'Authorization': token ? `Bearer ${token}` : '',
                            },
                            timeout: 30000
                          }
                        );
                        
                        if (uploadResponse.data.success) {
                          const imageUrl = uploadResponse.data.imageUrl;
                          setConfig({ ...config, sampleImageUrl: imageUrl });
                          alert('Sample image uploaded successfully!');
                        } else {
                          throw new Error(uploadResponse.data.message || 'Upload failed');
                        }
                      } catch (error: any) {
                        console.error('❌ Error uploading sample image:', error);
                        alert(error.response?.data?.message || error.message || 'Error uploading sample image');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }}
                  className="file-input"
                />
                <span className="file-upload-button">Choose File</span>
                <span className="file-name">{sampleImageFileName || 'No file chosen'}</span>
              </label>
              <small className="form-hint">Sample image for AI to understand your style (optional)</small>
            </div>
          </div>

          {/* Pages & Design Section */}
          <div className="form-section">
            <h3 className="section-title">Pages & Design</h3>
            
            <div className="form-group">
              <label>Custom Pages</label>
              <input
                type="text"
                value={config.customPages || ''}
                onChange={(e) => setConfig({ ...config, customPages: e.target.value })}
                placeholder="About, Services, Pricing, FAQ"
                className="form-input"
              />
              <small className="form-hint">
                Enter page names separated by commas. These will be included when generating with AI.
                <br />
                <strong>Example:</strong> About, Services, Pricing, FAQ, Contact
              </small>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label>Theme</label>
                <select
                  value={config.theme}
                  onChange={(e) => setConfig({ ...config, theme: e.target.value as 'light' | 'dark' })}
                  className="form-select"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
                <small className="form-hint">Choose your website color scheme</small>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Layout</label>
                <select
                  value={config.layout}
                  onChange={(e) => setConfig({ ...config, layout: e.target.value as 'sidebar' | 'topnav' })}
                  className="form-select"
                >
                  <option value="sidebar">Sidebar</option>
                  <option value="topnav">Top Navigation</option>
                </select>
                <small className="form-hint">Choose navigation layout</small>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
            <button 
              onClick={saveConfig} 
              disabled={loading || !config.siteTitle.trim()} 
              className="btn btn-primary btn-save"
              style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600 }}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Pages Panel */}
        <div className="pages-panel">
          <div className="pages-header">
            <h2>Pages</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <small style={{ color: '#666', fontSize: '12px' }}>
                {pages.length > 0 ? `${pages.length} page${pages.length > 1 ? 's' : ''} created` : 'No pages yet'}
              </small>
              <button onClick={() => setShowPageForm(!showPageForm)} className="btn btn-add">
                + Add Page Manually
              </button>
            </div>
          </div>


          {showPageForm && (
            <div className="page-form">
              <h3>Create New Page</h3>
              <div className="form-group">
                <label>Page Type</label>
                <select
                  value={newPage.pageType}
                  onChange={(e) => setNewPage({ ...newPage, pageType: e.target.value })}
                >
                  <option value="homepage">Homepage</option>
                  <option value="contact">Contact</option>
                  <option value="blog">Blog</option>
                  <option value="gallery">Gallery</option>
                  <option value="events">Events</option>
                  <option value="family-tree">Family Tree</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="form-group">
                <label>Page Title</label>
                <input
                  type="text"
                  value={newPage.pageTitle}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNewPage({
                      ...newPage,
                      pageTitle: title,
                      pageSlug: title.toLowerCase().replace(/\s+/g, '-'),
                      routePath: `/${title.toLowerCase().replace(/\s+/g, '-')}`,
                    });
                  }}
                  placeholder="About Us"
                />
              </div>
              <div className="form-group">
                <label>Route Path</label>
                <input
                  type="text"
                  value={newPage.routePath}
                  onChange={(e) => setNewPage({ ...newPage, routePath: e.target.value })}
                  placeholder="/about"
                />
              </div>
              <button onClick={createPage} disabled={loading} className="btn btn-primary">
                Create Page
              </button>
            </div>
          )}

          <div className="pages-list">
            {pages.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <p>No pages created yet. Click "+ Add Page" to create your first page.</p>
              </div>
            ) : (
              pages.map((page) => {
                const pageId = page.id;
                const pageTitle = page.page_title || page.pageTitle || 'Untitled Page';
                const pageType = page.page_type || page.pageType || 'custom';
                const routePath = page.route_path || page.routePath || '/';
                const isPublished = page.is_published || page.isPublished || false;
                
                return (
                  <div key={pageId || page.page_slug || Math.random()} className="page-item">
                    <div className="page-info">
                      <h3>{pageTitle}</h3>
                      <p className="page-type">{pageType}</p>
                      <p className="page-route">{routePath}</p>
                      {isPublished && <span className="badge published">Published</span>}
                    </div>
                    <div className="page-actions">
                      <button onClick={() => setSelectedPage(page)} className="btn btn-edit">
                        Edit
                      </button>
                      <button onClick={() => deletePage(pageId!)} className="btn btn-delete">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {selectedPage && (
            <div className="page-editor">
              <h3>Edit Page: {selectedPage.page_title || selectedPage.pageTitle || 'Untitled'}</h3>
              <div className="content-blocks">
                <h4>Content Blocks</h4>
                <div className="block-actions">
                  <button onClick={() => addContentBlock(selectedPage, 'hero')} className="btn btn-sm">
                    + Hero
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'text')} className="btn btn-sm">
                    + Text
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'image')} className="btn btn-sm">
                    + Image
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'gallery')} className="btn btn-sm">
                    + Gallery
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'form')} className="btn btn-sm">
                    + Form
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'video')} className="btn btn-sm">
                    + Video
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'map')} className="btn btn-sm">
                    + Map
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'timeline')} className="btn btn-sm">
                    + Timeline
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'testimonial')} className="btn btn-sm">
                    + Testimonial
                  </button>
                  <button onClick={() => addContentBlock(selectedPage, 'stats')} className="btn btn-sm">
                    + Stats
                  </button>
                </div>
                <div className="blocks-list">
                  {(selectedPage.contentBlocks || selectedPage.content_blocks || []).map((block, index) => {
                    const blockType = block.blockType || block.block_type || 'custom';
                    const contentData = block.contentData || block.content_data || {};
                    return (
                      <div key={index} className="block-item">
                        <strong>{blockType}</strong>
                        <pre>{JSON.stringify(contentData, null, 2)}</pre>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
      </div>
    </Layout>
  );
};

export default WebsiteAdmin;
