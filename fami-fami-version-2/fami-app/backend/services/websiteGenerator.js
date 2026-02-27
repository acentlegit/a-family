const fs = require('fs');
const path = require('path');
const { query } = require('../database/pgClient');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

/**
 * Enhanced Website Generator - Unified Family Portal
 * Integrates: Family Tree, Gallery, Events, Bio Data Pages, Video Service
 * Based on WebGen codebase with full family portal features
 */

function slugify(s) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Fetch family data from PostgreSQL
 */
async function fetchFamilyData(familyId) {
  try {
    // Get family members
    const membersResult = await query(
      `SELECT m.*, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name
       FROM members m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.family_id = (SELECT id FROM families WHERE id::text = $1 OR name = $1 LIMIT 1)
       ORDER BY m.generation, m.first_name`,
      [familyId]
    );
    
    // Get family events
    const eventsResult = await query(
      `SELECT * FROM events 
       WHERE family_id = (SELECT id FROM families WHERE id::text = $1 OR name = $1 LIMIT 1)
       ORDER BY event_date DESC`,
      [familyId]
    );
    
    // Get media files (gallery)
    const mediaResult = await query(
      `SELECT * FROM media_files 
       WHERE family_id = (SELECT id FROM families WHERE id::text = $1 OR name = $1 LIMIT 1)
       ORDER BY created_at DESC
       LIMIT 100`,
      [familyId]
    );
    
    // Get family tree relationships
    const treeResult = await query(
      `SELECT * FROM family_tree_relationships 
       WHERE family_id = (SELECT id FROM families WHERE id::text = $1 OR name = $1 LIMIT 1)`,
      [familyId]
    );
    
    return {
      members: membersResult.rows || [],
      events: eventsResult.rows || [],
      media: mediaResult.rows || [],
      relationships: treeResult.rows || []
    };
  } catch (error) {
    console.error('Error fetching family data:', error);
    return { members: [], events: [], media: [], relationships: [] };
  }
}

/**
 * Generate D3.js Family Tree HTML
 */
function generateFamilyTreeHTML(members, relationships) {
  // Build tree structure
  const treeData = buildTreeStructure(members, relationships);
  
  return `
    <section class="family-tree-section">
      <h2>Family Tree</h2>
      <div id="family-tree-container"></div>
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <script>
        const treeData = ${JSON.stringify(treeData)};
        const width = 1200;
        const height = 800;
        
        const svg = d3.select("#family-tree-container")
          .append("svg")
          .attr("width", width)
          .attr("height", height);
        
        const g = svg.append("g")
          .attr("transform", "translate(50,50)");
        
        const tree = d3.tree().size([height - 100, width - 200]);
        const root = d3.hierarchy(treeData);
        tree(root);
        
        // Draw links
        g.selectAll(".link")
          .data(root.links())
          .enter()
          .append("path")
          .attr("class", "link")
          .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x))
          .style("fill", "none")
          .style("stroke", "#ccc")
          .style("stroke-width", "2px");
        
        // Draw nodes
        const node = g.selectAll(".node")
          .data(root.descendants())
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", d => \`translate(\${d.y},\${d.x})\`);
        
        node.append("circle")
          .attr("r", 30)
          .style("fill", "#2563eb")
          .style("stroke", "#fff")
          .style("stroke-width", "2px");
        
        node.append("text")
          .attr("dy", ".35em")
          .attr("x", d => d.children ? -40 : 40)
          .style("text-anchor", d => d.children ? "end" : "start")
          .text(d => d.data.name);
      </script>
      <style>
        .family-tree-section { margin-bottom: 40px; }
        #family-tree-container { 
          background: #fff; 
          border-radius: 12px; 
          padding: 20px; 
          overflow: auto;
          border: 1px solid #e2e8f0;
        }
        .link { stroke: #94a3b8; }
        .node text { font-size: 12px; fill: #0f172a; }
      </style>
    </section>
  `;
}

/**
 * Build tree structure from members and relationships
 */
function buildTreeStructure(members, relationships) {
  // Find root (members with no parents)
  const rootMembers = members.filter(m => !m.parent_id);
  if (rootMembers.length === 0 && members.length > 0) {
    return { name: members[0].first_name + ' ' + (members[0].last_name || ''), children: [] };
  }
  
  const root = rootMembers[0] || members[0];
  return buildNode(root, members, relationships);
}

function buildNode(member, allMembers, relationships) {
  const node = {
    name: `${member.first_name} ${member.last_name || ''}`,
    children: []
  };
  
  // Find children
  const children = allMembers.filter(m => m.parent_id === member.id);
  node.children = children.map(child => buildNode(child, allMembers, relationships));
  
  return node;
}

/**
 * Generate Gallery HTML from family media
 */
async function generateGalleryHTML(mediaFiles, signedUrlGenerator) {
  if (!mediaFiles || mediaFiles.length === 0) {
    return '<section class="gallery-section"><p>No images available yet.</p></section>';
  }
  
  const images = mediaFiles
    .filter(m => m.file_type && m.file_type.startsWith('image/'))
    .slice(0, 50); // Limit to 50 images
  
  // Generate signed URLs for all images
  const imageUrls = await Promise.all(
    images.map(async (media) => {
      if (signedUrlGenerator && media.s3_key) {
        try {
          return await signedUrlGenerator(media.s3_key);
        } catch (error) {
          console.error('Error generating signed URL for media:', error);
          return media.s3_url || '';
        }
      }
      return media.s3_url || '';
    })
  );
  
  return `
    <section class="gallery-section">
      <h2>Family Gallery</h2>
      <div class="gallery-grid">
        ${images.map((media, index) => {
          const imageUrl = imageUrls[index] || '';
          return `
            <div class="gallery-item" data-index="${index}">
              <img src="${imageUrl}" alt="${media.description || media.file_name}" loading="lazy" />
              ${media.description ? `<p class="gallery-caption">${media.description}</p>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div id="gallery-modal" class="modal">
        <span class="close">&times;</span>
        <img class="modal-content" id="modal-image">
        <div id="caption"></div>
      </div>
      <script>
        const modal = document.getElementById('gallery-modal');
        const modalImg = document.getElementById('modal-image');
        const caption = document.getElementById('caption');
        
        document.querySelectorAll('.gallery-item img').forEach((img, index) => {
          img.onclick = function() {
            modal.style.display = 'block';
            modalImg.src = this.src;
            caption.innerHTML = this.alt;
          };
        });
        
        document.querySelector('.close').onclick = function() {
          modal.style.display = 'none';
        };
      </script>
      <style>
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .gallery-item {
          position: relative;
          cursor: pointer;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .gallery-item img {
          width: 100%;
          height: 250px;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .gallery-item:hover img {
          transform: scale(1.05);
        }
        .gallery-caption {
          padding: 10px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          margin: 0;
          font-size: 14px;
        }
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.9);
        }
        .modal-content {
          margin: auto;
          display: block;
          max-width: 90%;
          max-height: 90%;
          margin-top: 50px;
        }
        .close {
          position: absolute;
          top: 15px;
          right: 35px;
          color: #f1f1f1;
          font-size: 40px;
          font-weight: bold;
          cursor: pointer;
        }
        .close:hover {
          color: #fff;
        }
        #caption {
          margin: auto;
          display: block;
          width: 80%;
          text-align: center;
          color: #ccc;
          padding: 10px 0;
        }
      </style>
    </section>
  `;
}

/**
 * Generate Events/RSVP HTML
 */
function generateEventsHTML(events) {
  if (!events || events.length === 0) {
    return '<section class="events-section"><p>No upcoming events.</p></section>';
  }
  
  return `
    <section class="events-section">
      <h2>Family Events</h2>
      <div class="events-list">
        ${events.map(event => `
          <div class="event-card">
            <div class="event-date">
              <span class="event-day">${new Date(event.event_date).getDate()}</span>
              <span class="event-month">${new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
            </div>
            <div class="event-details">
              <h3>${event.title}</h3>
              ${event.description ? `<p>${event.description}</p>` : ''}
              ${event.location ? `<p class="event-location">📍 ${event.location}</p>` : ''}
              ${event.event_time ? `<p class="event-time">🕐 ${event.event_time}</p>` : ''}
              <div class="event-rsvp">
                <button class="rsvp-btn yes">Yes</button>
                <button class="rsvp-btn no">No</button>
                <button class="rsvp-btn maybe">Maybe</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <style>
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 20px;
        }
        .event-card {
          display: flex;
          gap: 20px;
          background: #fff;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .event-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          background: #2563eb;
          color: #fff;
          border-radius: 8px;
          padding: 10px;
        }
        .event-day {
          font-size: 28px;
          font-weight: bold;
        }
        .event-month {
          font-size: 14px;
          text-transform: uppercase;
        }
        .event-details {
          flex: 1;
        }
        .event-details h3 {
          margin: 0 0 10px 0;
          color: #0f172a;
        }
        .event-location, .event-time {
          margin: 5px 0;
          color: #64748b;
          font-size: 14px;
        }
        .event-rsvp {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .rsvp-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }
        .rsvp-btn.yes { background: #10b981; color: #fff; }
        .rsvp-btn.no { background: #ef4444; color: #fff; }
        .rsvp-btn.maybe { background: #f59e0b; color: #fff; }
      </style>
    </section>
  `;
}

/**
 * Generate Bio Data Page for Family Members
 */
function generateBioDataHTML(members) {
  if (!members || members.length === 0) {
    return '<section class="bio-section"><p>No member information available.</p></section>';
  }
  
  return `
    <section class="bio-section">
      <h2>Family Members</h2>
      <div class="members-grid">
        ${members.map(member => `
          <div class="member-card">
            ${member.profile_image_url ? `
              <img src="${member.profile_image_url}" alt="${member.first_name}" class="member-photo" />
            ` : `
              <div class="member-photo-placeholder">
                ${member.first_name.charAt(0)}${(member.last_name || '').charAt(0)}
              </div>
            `}
            <div class="member-info">
              <h3>${member.first_name} ${member.last_name || ''}</h3>
              ${member.relationship ? `<p class="member-relationship">${member.relationship}</p>` : ''}
              ${member.email ? `<p class="member-email">📧 ${member.email}</p>` : ''}
              ${member.phone ? `<p class="member-phone">📞 ${member.phone}</p>` : ''}
              ${member.date_of_birth ? `<p class="member-dob">🎂 ${new Date(member.date_of_birth).toLocaleDateString()}</p>` : ''}
              ${member.bio ? `<p class="member-bio">${member.bio}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      <style>
        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          margin-top: 20px;
        }
        .member-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          text-align: center;
        }
        .member-photo {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          margin: 0 auto 15px;
          display: block;
        }
        .member-photo-placeholder {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #2563eb;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          margin: 0 auto 15px;
        }
        .member-info h3 {
          margin: 0 0 10px 0;
          color: #0f172a;
        }
        .member-relationship {
          color: #2563eb;
          font-weight: 600;
          margin: 5px 0;
        }
        .member-email, .member-phone, .member-dob {
          margin: 5px 0;
          color: #64748b;
          font-size: 14px;
        }
        .member-bio {
          margin-top: 15px;
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
        }
      </style>
    </section>
  `;
}

/**
 * Convert page content blocks to HTML sections
 * Enhanced with family-specific blocks
 */
async function renderContentBlocks(blocks, familyData = null, signedUrlGenerator = null, processImageUrl = null) {
  if (!blocks || !Array.isArray(blocks)) return '';
  
  const html = await Promise.all(blocks.map(async (block) => {
    const type = block.block_type;
    // Parse content_data if it's a string (from database JSONB)
    let content = block.content_data || {};
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to parse content_data as JSON:', e);
        content = {};
      }
    }
    // Ensure content is an object
    if (!content || typeof content !== 'object') {
      content = {};
    }
    
    switch (type) {
      case 'hero':
        const heroImageUrl = content.image || content.imageUrl || '';
        const heroImage = processImageUrl ? await processImageUrl(heroImageUrl) : heroImageUrl;
        const heroTitle = content.title || content.heading || '';
        const heroSubtitle = content.subtitle || content.description || content.body || '';
        const heroButton1 = content.button1Text || content.buttonText || '';
        const heroButton1Link = content.button1Link || content.buttonLink || '#';
        const heroButton2 = content.button2Text || '';
        const heroButton2Link = content.button2Link || '#';
        
        return `
          <section class="hero-section">
            <div class="hero-container">
              <div class="hero-content">
                ${heroTitle ? `<h1 class="hero-title">${heroTitle}</h1>` : ''}
                ${heroSubtitle ? `<p class="hero-subtitle">${heroSubtitle}</p>` : ''}
                <div class="hero-buttons">
                  ${heroButton1 ? (() => {
                    let href = heroButton1Link || '#';
                    if (!href.startsWith('http') && !href.startsWith('mailto:') && href !== '#') {
                      // Make relative paths work in file:// context
                      if (href.startsWith('/')) {
                        // Convert absolute to relative
                        const pagePath = href.replace(/^\//, '').replace(/\/$/, '');
                        href = pagePath ? `./${pagePath}/` : './';
                      } else if (!href.startsWith('./') && !href.startsWith('../')) {
                        href = `./${href}/`;
                      }
                    }
                    return `<a href="${href}" class="btn btn-primary">${heroButton1}</a>`;
                  })() : ''}
                  ${heroButton2 ? (() => {
                    let href = heroButton2Link || '#';
                    if (!href.startsWith('http') && !href.startsWith('mailto:') && href !== '#') {
                      // Make relative paths work in file:// context
                      if (href.startsWith('/')) {
                        // Convert absolute to relative
                        const pagePath = href.replace(/^\//, '').replace(/\/$/, '');
                        href = pagePath ? `./${pagePath}/` : './';
                      } else if (!href.startsWith('./') && !href.startsWith('../')) {
                        href = `./${href}/`;
                      }
                    }
                    return `<a href="${href}" class="btn btn-secondary">${heroButton2}</a>`;
                  })() : ''}
                </div>
              </div>
              ${heroImage ? `
                <div class="hero-image">
                  <img src="${heroImage}" alt="${heroTitle || 'Hero'}" />
                </div>
              ` : ''}
            </div>
          </section>
        `;
      
      case 'text':
        // Extract text content, avoiding raw JSON display
        let textHeading = content.heading || content.title || '';
        let textBody = content.body || content.description || '';
        
        // If body looks like JSON, try to extract meaningful content
        if (textBody && textBody.trim().startsWith('{')) {
          try {
            const parsed = typeof textBody === 'string' ? JSON.parse(textBody) : textBody;
            textBody = parsed.body || parsed.description || parsed.text || '';
            if (!textHeading && parsed.title) textHeading = parsed.title;
            if (!textHeading && parsed.heading) textHeading = parsed.heading;
          } catch (e) {
            // If parsing fails, use the original text but clean it up
            textBody = textBody.replace(/^\{[\s\S]*"body"\s*:\s*"([^"]+)"[\s\S]*\}$/, '$1');
          }
        }
        
        // Don't display if it's still JSON-like
        if (textBody && (textBody.trim().startsWith('{') || textBody.trim().startsWith('['))) {
          textBody = ''; // Hide raw JSON
        }
        
        return `
          <section class="text-section">
            ${textHeading ? `<h2>${textHeading}</h2>` : ''}
            ${textBody ? `<div class="text-body">${textBody}</div>` : ''}
          </section>
        `;
      
      case 'image':
        const imageUrl = content.url || '';
        const processedImageUrl = processImageUrl ? await processImageUrl(imageUrl) : imageUrl;
        return `
          <section class="image-section">
            <img src="${processedImageUrl}" alt="${content.alt || ''}" />
            ${content.caption ? `<p class="caption">${content.caption}</p>` : ''}
          </section>
        `;
      
      case 'gallery':
        // Use family gallery if available, otherwise use custom images
        if (familyData && familyData.media && familyData.media.length > 0) {
          return await generateGalleryHTML(familyData.media, signedUrlGenerator);
        }
        const images = content.images || [];
        const processedGalleryImages = processImageUrl 
          ? await Promise.all(images.map(img => processImageUrl(img.url || '')))
          : images.map(img => img.url || '');
        return `
          <section class="gallery-section">
            <h2>${content.title || 'Gallery'}</h2>
            <div class="gallery-grid">
              ${images.map((img, index) => `
                <div class="gallery-item">
                  <img src="${processedGalleryImages[index] || img.url || ''}" alt="${img.alt || ''}" />
                </div>
              `).join('')}
            </div>
          </section>
        `;
      
      case 'family-tree':
        // Generate family tree from real data
        if (familyData && familyData.members && familyData.members.length > 0) {
          return generateFamilyTreeHTML(familyData.members, familyData.relationships);
        }
        return '<section class="family-tree-section"><p>Family tree data not available.</p></section>';
      
      case 'events':
        // Generate events from real data
        if (familyData && familyData.events && familyData.events.length > 0) {
          return generateEventsHTML(familyData.events);
        }
        return '<section class="events-section"><p>No events available.</p></section>';
      
      case 'bio-data':
        // Generate bio data pages
        if (familyData && familyData.members && familyData.members.length > 0) {
          return generateBioDataHTML(familyData.members);
        }
        return '<section class="bio-section"><p>No member information available.</p></section>';
      
      case 'form':
        return `
          <section class="form-section">
            <h2>${content.title || 'Contact Form'}</h2>
            <form>
              ${(content.fields || []).map(field => `
                <div class="form-field">
                  <label>${field.label || ''}</label>
                  <input type="${field.type || 'text'}" name="${field.name || ''}" />
                </div>
              `).join('')}
              <button type="submit">${content.submitText || 'Submit'}</button>
            </form>
          </section>
        `;
      
      case 'video':
        return `
          <section class="video-section">
            <h2>${content.title || 'Video'}</h2>
            <div class="video-container">
              <iframe 
                src="${content.url || ''}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
              </iframe>
            </div>
            ${content.caption ? `<p class="caption">${content.caption}</p>` : ''}
          </section>
        `;
      
      case 'map':
        return `
          <section class="map-section">
            <h2>${content.title || 'Location'}</h2>
            <div class="map-container">
              <iframe 
                src="https://www.google.com/maps/embed?pb=${content.embedCode || ''}" 
                width="100%" 
                height="450" 
                style="border:0;" 
                allowfullscreen="" 
                loading="lazy">
              </iframe>
            </div>
            ${content.address ? `<p class="address">${content.address}</p>` : ''}
          </section>
        `;
      
      case 'timeline':
        const events = content.events || [];
        return `
          <section class="timeline-section">
            <h2>${content.title || 'Timeline'}</h2>
            <div class="timeline">
              ${events.map((event, index) => `
                <div class="timeline-item ${index % 2 === 0 ? 'left' : 'right'}">
                  <div class="timeline-content">
                    <h3>${event.title || ''}</h3>
                    <p>${event.description || ''}</p>
                    <span class="timeline-date">${event.date || ''}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        `;
      
      case 'testimonial':
        const testimonials = content.testimonials || [];
        return `
          <section class="testimonial-section">
            <h2>${content.title || 'Testimonials'}</h2>
            <div class="testimonials-grid">
              ${testimonials.map(testimonial => `
                <div class="testimonial-card">
                  <div class="testimonial-text">"${testimonial.quote || ''}"</div>
                  <div class="testimonial-author">
                    ${testimonial.avatar ? `<img src="${testimonial.avatar}" alt="${testimonial.name || ''}" />` : ''}
                    <div>
                      <strong>${testimonial.name || ''}</strong>
                      <span>${testimonial.role || ''}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        `;
      
      case 'stats':
        const stats = content.stats || [];
        return `
          <section class="stats-section">
            <h2>${content.title || 'Statistics'}</h2>
            <div class="stats-grid">
              ${stats.map(stat => `
                <div class="stat-card">
                  <div class="stat-value">${stat.value || ''}</div>
                  <div class="stat-label">${stat.label || ''}</div>
                </div>
              `).join('')}
            </div>
          </section>
        `;
      
      default:
        // Render custom section with proper content display
        const customTitle = content.title || content.heading || '';
        const customSubtitle = content.subtitle || '';
        const customBody = content.body || content.description || '';
        const customImage = content.image || content.imageUrl || '';
        const processedCustomImage = processImageUrl && customImage ? await processImageUrl(customImage) : customImage;
        
        return `
          <section class="custom-section">
            ${customTitle ? `<h2>${customTitle}</h2>` : ''}
            ${customSubtitle ? `<h3>${customSubtitle}</h3>` : ''}
            ${customBody ? `<div class="custom-body">${customBody}</div>` : ''}
            ${processedCustomImage ? `<img src="${processedCustomImage}" alt="${customTitle || 'Image'}" class="custom-image" />` : ''}
          </section>
        `;
    }
  }));
  
  return html.join('');
}

/**
 * Generate HTML for a single page
 * Enhanced with family data integration
 */
async function generatePageHTML(page, config, allPages, familyData = null, signedUrlGenerator = null) {
  // Get config values (handle both snake_case and camelCase from database)
  const siteTitle = config.site_title || config.siteTitle || 'Family Portal';
  const theme = config.theme || 'light';
  const headerText = config.header_text || config.headerText || '';
  const description = config.description || '';
  const footerText = config.footer_text || config.footerText || '';
  const logoUrl = config.logo_url || config.logoUrl || '';
  const sampleImageUrl = config.sample_image_url || config.sampleImageUrl || '';
  const blocks = page.content_blocks || [];
  
  // Get image processor from config if available
  const processImageUrl = config.processImageUrl || null;
  
  // Render content blocks with family data
  const contentHTML = await renderContentBlocks(blocks, familyData, signedUrlGenerator, processImageUrl);
  
  // Use description for meta description, fallback to header text
  const metaDescription = description || headerText || siteTitle;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${metaDescription}">
  <meta name="author" content="${siteTitle}">
  <title>${page.page_title}${page.page_title !== siteTitle ? ' - ' + siteTitle : ''}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${getThemeCSS(theme, config)}
  </style>
</head>
<body data-theme="${theme}">
  <header class="main-header">
    <div class="header-container">
      <div class="brand">
        <a href="${page.page_type === 'homepage' ? './' : '../'}" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit;">
          ${logoUrl ? (() => {
            // Make logo URL relative for file:// compatibility
            let logoSrc = logoUrl;
            if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
              if (logoUrl.startsWith('./') || logoUrl.startsWith('../')) {
                logoSrc = logoUrl;
              } else {
                // Add relative path prefix based on current page location
                logoSrc = page.page_type === 'homepage' ? `./${logoUrl}` : `../${logoUrl}`;
              }
            }
            return `<img class="logo" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`;
          })() : ''}
          ${!logoUrl ? `<div class="logo-placeholder">${(siteTitle.charAt(0) || 'L').toUpperCase()}</div>` : ''}
          <div class="brand-title">${siteTitle}</div>
        </a>
      </div>
      <nav class="main-nav">
        ${allPages.map(p => {
          // Use relative paths for navigation that work in preview and file://
          let href = '';
          const currentPagePath = page.route_path.replace(/^\//, '').replace(/\/$/, '');
          const linkPagePath = p.route_path.replace(/^\//, '').replace(/\/$/, '');
          
          if (p.page_type === 'homepage' || linkPagePath === '') {
            // Homepage links
            href = currentPagePath === '' ? './' : '../';
          } else {
            // Other pages - use relative paths
            if (currentPagePath === '') {
              // From homepage, link to ./page-name/
              href = `./${linkPagePath}/`;
            } else {
              // From another page, go back to root then to target page
              href = `../${linkPagePath}/`;
            }
          }
          
          // Extract page name from title (remove site title prefix if present)
          let pageNavTitle = p.page_title || '';
          // Remove common prefixes like "Site Title - " or "Site Title: "
          if (siteTitle && pageNavTitle) {
            // Escape special regex characters in siteTitle
            const escapedSiteTitle = siteTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Try multiple patterns: "Site Title - Page", "Site Title: Page", "Site Title Page"
            const patterns = [
              new RegExp(`^${escapedSiteTitle}\\s*[-:]\\s*`, 'i'),  // "Site Title - " or "Site Title: "
              new RegExp(`^${escapedSiteTitle}\\s+`, 'i'),         // "Site Title "
              new RegExp(`^${escapedSiteTitle}$`, 'i')              // Just "Site Title" -> use page type
            ];
            
            for (const pattern of patterns) {
              if (pattern.test(pageNavTitle)) {
                pageNavTitle = pageNavTitle.replace(pattern, '').trim();
                break;
              }
            }
            
            // If title is empty after removal, use page type or slug as fallback
            if (!pageNavTitle) {
              pageNavTitle = p.page_type === 'homepage' ? 'Home' : 
                           (p.page_slug || p.page_type || 'Page');
            }
          }
          
          // Check if this link is active
          const isActive = currentPagePath === linkPagePath;
          return `<a href="${href}" class="nav-link${isActive ? ' active' : ''}">${pageNavTitle}</a>`;
        }).join('')}
      </nav>
    </div>
  </header>
  
  <main class="main-content">
    ${page.page_type === 'homepage' ? '' : `<h1 class="page-title">${page.page_title}</h1>`}
    ${sampleImageUrl && page.page_type === 'homepage' ? (() => {
      // Make sample image URL relative for file:// compatibility
      let imageSrc = sampleImageUrl;
      console.log(`🖼️ Sample image URL in generatePageHTML: ${sampleImageUrl}`);
      
      if (!sampleImageUrl.startsWith('http') && !sampleImageUrl.startsWith('data:')) {
        if (sampleImageUrl.startsWith('./') || sampleImageUrl.startsWith('../')) {
          imageSrc = sampleImageUrl;
        } else {
          // Add relative path prefix - homepage is at root, so use ./
          imageSrc = `./${sampleImageUrl.replace(/^\.\//, '')}`;
        }
      } else if (sampleImageUrl.startsWith('http://') || sampleImageUrl.startsWith('https://')) {
        // For preview URLs, try to extract relative path or keep as-is for now
        // In generated static site, we should have already copied it to assets
        console.log(`⚠️ Sample image is still a full URL, should have been copied to assets`);
        imageSrc = sampleImageUrl;
      }
      
      console.log(`🖼️ Final sample image src: ${imageSrc}`);
      return `
      <div style="text-align: center; margin: 60px 0; padding: 0 48px;">
        <img src="${imageSrc}" alt="Sample Style Image" style="max-width: 100%; max-height: 600px; width: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); display: block; margin: 0 auto;" onerror="console.error('Failed to load sample image:', this.src); this.style.display='none';" />
      </div>
    `;
    })() : ''}
    ${contentHTML}
  </main>
  
  <footer class="main-footer">
    <div class="footer-container">
      <p>${footerText || `© ${new Date().getFullYear()} ${siteTitle}. All rights reserved.`}</p>
    </div>
  </footer>
</body>
</html>`;
}

/**
 * Get CSS based on theme
 */
function getThemeCSS(theme, config = {}) {
  const isDark = theme === 'dark';
  // Professional dark theme colors (like BluePeak Fitness)
  const bgColor = isDark ? '#0a1628' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const cardBg = isDark ? '#0f1b2e' : '#ffffff';
  const borderColor = isDark ? '#1e2a3e' : '#e5e7eb';
  const primaryColor = isDark ? '#3b82f6' : '#2563eb';
  const headerBg = isDark ? '#0a1628' : '#ffffff';
  
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: ${bgColor};
      color: ${textColor};
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .main-header {
      background: ${headerBg};
      border-bottom: 1px solid ${borderColor};
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: ${isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)'};
    }
    .header-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px 48px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      height: 48px;
      width: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid ${borderColor};
    }
    .logo-placeholder {
      height: 48px;
      width: 48px;
      border-radius: 50%;
      background: ${primaryColor};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 18px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 700;
      color: ${textColor};
      letter-spacing: -0.5px;
    }
    .main-nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .nav-link {
      text-decoration: none;
      color: ${textColor};
      font-weight: 500;
      font-size: 15px;
      padding: 8px 16px;
      border-radius: 6px;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .nav-link:hover {
      background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
      color: ${primaryColor};
    }
    .nav-link.active {
      background: ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'};
      color: ${primaryColor};
      font-weight: 600;
    }
    .main-content {
      min-height: calc(100vh - 200px);
    }
    .page-title {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 32px;
      color: ${textColor};
      letter-spacing: -1px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
      padding: 0 48px;
      padding-top: 48px;
    }
    .hero-section {
      margin: 0;
      padding: 0;
      background: transparent;
    }
    .hero-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 64px;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
      padding: 80px 48px;
      min-height: 600px;
    }
    .hero-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .hero-title {
      font-size: 64px;
      font-weight: 800;
      line-height: 1.1;
      color: ${textColor};
      letter-spacing: -2px;
      margin: 0;
    }
    .hero-subtitle {
      font-size: 20px;
      font-weight: 400;
      color: ${isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'};
      line-height: 1.6;
      margin: 0;
    }
    .hero-buttons {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: ${primaryColor};
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .btn-primary:hover {
      background: ${isDark ? '#2563eb' : '#1d4ed8'};
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
    }
    .btn-secondary {
      background: transparent;
      color: ${textColor};
      border: 2px solid ${borderColor};
    }
    .btn-secondary:hover {
      background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
      border-color: ${primaryColor};
    }
    .hero-image {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,${isDark ? '0.5' : '0.2'});
    }
    .hero-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .text-section {
      margin-bottom: 48px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
      padding: 0 48px;
    }
    .text-section h2 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 20px;
      color: ${textColor};
      letter-spacing: -0.5px;
    }
    .text-section div {
      font-size: 18px;
      line-height: 1.8;
      color: ${isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'};
    }
    .gallery-section {
      max-width: 1200px;
      margin: 0 auto 48px;
      padding: 0 48px;
    }
    .gallery-section h2 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 32px;
      color: ${textColor};
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-top: 20px;
    }
    .gallery-item {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,${isDark ? '0.3' : '0.1'});
      transition: transform 0.3s ease;
    }
    .gallery-item:hover {
      transform: translateY(-4px);
    }
    .gallery-item img {
      width: 100%;
      height: 240px;
      object-fit: cover;
      display: block;
    }
    .form-section {
      background: ${cardBg};
      padding: 48px;
      border-radius: 16px;
      border: 1px solid ${borderColor};
      max-width: 800px;
      margin: 0 auto 48px;
      box-shadow: 0 4px 12px rgba(0,0,0,${isDark ? '0.2' : '0.05'});
    }
    .form-section h2 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 32px;
      color: ${textColor};
    }
    .form-field {
      margin-bottom: 20px;
    }
    .form-field label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .form-field input,
    .form-field textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid ${borderColor};
      border-radius: 8px;
      background: ${bgColor};
      color: ${textColor};
    }
    button, .btn-submit {
      background: ${primaryColor};
      color: #fff;
      border: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    button:hover, .btn-submit:hover {
      background: ${isDark ? '#2563eb' : '#1d4ed8'};
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
    }
    .video-section {
      margin-bottom: 30px;
    }
    .video-container {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
      border-radius: 12px;
    }
    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .map-section {
      margin-bottom: 30px;
    }
    .map-container {
      border-radius: 12px;
      overflow: hidden;
      margin-top: 20px;
    }
    .address {
      margin-top: 12px;
      color: ${textColor};
      font-size: 14px;
    }
    .timeline-section {
      margin-bottom: 30px;
    }
    .timeline {
      position: relative;
      padding: 20px 0;
    }
    .timeline-item {
      padding: 20px;
      margin-bottom: 20px;
      background: ${cardBg};
      border-radius: 12px;
      border: 1px solid ${borderColor};
    }
    .timeline-content h3 {
      margin: 0 0 8px 0;
      color: ${textColor};
    }
    .timeline-date {
      font-size: 12px;
      color: #64748b;
    }
    .testimonial-section {
      margin-bottom: 30px;
    }
    .testimonials-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .testimonial-card {
      background: ${cardBg};
      padding: 24px;
      border-radius: 12px;
      border: 1px solid ${borderColor};
    }
    .testimonial-text {
      font-style: italic;
      margin-bottom: 16px;
      color: ${textColor};
    }
    .testimonial-author {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .testimonial-author img {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      object-fit: cover;
    }
    .stats-section {
      margin-bottom: 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .stat-card {
      background: ${cardBg};
      padding: 24px;
      border-radius: 12px;
      border: 1px solid ${borderColor};
      text-align: center;
    }
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .stat-label {
      font-size: 14px;
      color: ${textColor};
    }
    .main-footer {
      border-top: 1px solid ${borderColor};
      background: ${headerBg};
      margin-top: 80px;
      padding: 40px 0;
    }
    .footer-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 48px;
      text-align: center;
    }
    .footer-container p {
      color: ${isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'};
      font-size: 15px;
    }
    
    /* Responsive Design */
    @media (max-width: 1024px) {
      .hero-container {
        grid-template-columns: 1fr;
        gap: 40px;
        padding: 60px 32px;
        text-align: center;
      }
      .hero-title {
        font-size: 48px;
      }
      .hero-image {
        max-width: 600px;
        margin: 0 auto;
      }
      .header-container {
        padding: 16px 32px;
      }
      .main-nav {
        gap: 4px;
      }
      .nav-link {
        font-size: 14px;
        padding: 6px 12px;
      }
    }
    @media (max-width: 768px) {
      .hero-container {
        padding: 40px 24px;
        min-height: auto;
      }
      .hero-title {
        font-size: 36px;
      }
      .hero-subtitle {
        font-size: 18px;
      }
      .hero-buttons {
        flex-direction: column;
        width: 100%;
      }
      .btn {
        width: 100%;
        text-align: center;
      }
      .header-container {
        flex-direction: column;
        gap: 16px;
        padding: 16px 24px;
      }
      .main-nav {
        width: 100%;
        justify-content: center;
        overflow-x: auto;
        padding-bottom: 8px;
      }
      .page-title {
        font-size: 32px;
        padding: 32px 24px 0;
      }
      .text-section, .gallery-section, .form-section {
        padding: 0 24px;
      }
      .footer-container {
        padding: 0 24px;
      }
    }
  `;
}

/**
 * Build static site files (similar to WebsiteGen's buildZipForSite)
 * Enhanced with family data integration
 */
async function buildStaticSite(familyId, config, pages) {
  // Use site title for folder name (like "bluepeak-fitness-site")
  // Fallback to domain or family ID if title not available
  const siteTitle = config.site_title || config.siteTitle || '';
  const folderName = siteTitle 
    ? `${slugify(siteTitle)}-site`
    : (config.domain ? `${slugify(config.domain)}-site` : `family-${familyId}-site`);
  
  const outDir = path.join(process.cwd(), 'generated_sites', folderName);
  
  // Ensure generated_sites directory exists
  const generatedSitesDir = path.join(process.cwd(), 'generated_sites');
  if (!fs.existsSync(generatedSitesDir)) {
    fs.mkdirSync(generatedSitesDir, { recursive: true });
  }
  
  // Remove old directory if it exists (clean build)
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  
  // Create output directory
  fs.mkdirSync(outDir, { recursive: true });
  
  // Create assets directory for logos and images
  const assetsDir = path.join(outDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  
  console.log(`📁 Generating website in: ${outDir}`);
  console.log(`📝 Site Title: ${siteTitle || 'Not set'}`);
  console.log(`📄 Pages to generate: ${pages.length}`);
  
  // Copy logo to assets folder if it exists
  let logoPath = null;
  if (config.logo_url || config.logoUrl) {
    const logoUrl = config.logo_url || config.logoUrl;
    try {
      // If logo is a local file path, copy it
      if (logoUrl.includes('/uploads/')) {
        // Handle both /uploads/website-logos/ and /uploads/ paths
        const logoSourcePath = logoUrl.startsWith('/uploads/')
          ? path.join(__dirname, '..', logoUrl)
          : path.join(__dirname, '..', 'uploads', logoUrl.split('/uploads/')[1]);
        
        if (fs.existsSync(logoSourcePath)) {
          const logoFilename = path.basename(logoSourcePath);
          const logoDestPath = path.join(assetsDir, logoFilename);
          fs.copyFileSync(logoSourcePath, logoDestPath);
          logoPath = `./assets/${logoFilename}`;
          console.log(`✅ Logo copied to: ${logoPath}`);
        } else {
          console.log(`⚠️ Logo file not found: ${logoSourcePath}`);
        }
      } else if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
        // For external URLs, use as-is (but these won't work in file:// context)
        logoPath = logoUrl;
        console.log(`⚠️ External logo URL (may not work in file://): ${logoUrl}`);
      } else if (logoUrl.startsWith('data:')) {
        // Data URL - save as file
        const base64Data = logoUrl.split(',')[1];
        const matches = logoUrl.match(/data:image\/(\w+);base64/);
        const extension = matches ? matches[1] : 'png';
        const logoFilename = `logo-${Date.now()}.${extension}`;
        const logoDestPath = path.join(assetsDir, logoFilename);
        fs.writeFileSync(logoDestPath, base64Data, 'base64');
        logoPath = `./assets/${logoFilename}`;
        console.log(`✅ Logo saved from data URL: ${logoPath}`);
      }
    } catch (error) {
      console.error('Error copying logo:', error);
      // Continue without logo if copy fails
    }
  }
  
  // Copy sample image to assets folder if it exists
  let sampleImagePath = null;
  if (config.sample_image_url || config.sampleImageUrl) {
    const sampleImageUrl = config.sample_image_url || config.sampleImageUrl;
    try {
      console.log(`📸 Processing sample image: ${sampleImageUrl}`);
      
      // Extract local path from full URL if it's a full URL
      let localPath = sampleImageUrl;
      if (sampleImageUrl.startsWith('http://') || sampleImageUrl.startsWith('https://')) {
        // Extract the path from URL (e.g., http://localhost:5000/uploads/sample-images/file.jpg -> /uploads/sample-images/file.jpg)
        try {
          const url = require('url');
          const parsedUrl = new url.URL(sampleImageUrl);
          localPath = parsedUrl.pathname;
          console.log(`📸 Extracted local path from URL: ${localPath}`);
        } catch (e) {
          // If URL parsing fails, try to extract manually
          const match = sampleImageUrl.match(/\/uploads\/[^?]+/);
          if (match) {
            localPath = match[0];
            console.log(`📸 Extracted path manually: ${localPath}`);
          } else {
            console.log(`⚠️ Could not extract path from URL: ${sampleImageUrl}`);
          }
        }
      }
      
      // If sample image is a local file path, copy it
      if (localPath.includes('/uploads/')) {
        const imageSourcePath = localPath.startsWith('/uploads/')
          ? path.join(__dirname, '..', localPath)
          : path.join(__dirname, '..', 'uploads', localPath.split('/uploads/')[1]);
        
        console.log(`📸 Looking for sample image at: ${imageSourcePath}`);
        
        if (fs.existsSync(imageSourcePath)) {
          const imageFilename = path.basename(imageSourcePath);
          const imageDestPath = path.join(assetsDir, imageFilename);
          fs.copyFileSync(imageSourcePath, imageDestPath);
          sampleImagePath = `./assets/${imageFilename}`;
          console.log(`✅ Sample image copied to: ${sampleImagePath}`);
        } else {
          console.log(`⚠️ Sample image file not found: ${imageSourcePath}`);
          // Try alternative path
          const altPath = path.join(__dirname, '..', 'uploads', 'sample-images', path.basename(localPath));
          if (fs.existsSync(altPath)) {
            const imageFilename = path.basename(altPath);
            const imageDestPath = path.join(assetsDir, imageFilename);
            fs.copyFileSync(altPath, imageDestPath);
            sampleImagePath = `./assets/${imageFilename}`;
            console.log(`✅ Sample image copied from alternative path: ${sampleImagePath}`);
          } else {
            console.log(`⚠️ Sample image also not found at alternative path: ${altPath}`);
          }
        }
      } else if (sampleImageUrl.startsWith('http://') || sampleImageUrl.startsWith('https://')) {
        // For external URLs that we couldn't extract a local path from, try to download
        try {
          const https = require('https');
          const http = require('http');
          const url = require('url');
          const parsedUrl = new url.URL(sampleImageUrl);
          const protocol = parsedUrl.protocol === 'https:' ? https : http;
          
          const imageFilename = `sample-${Date.now()}${path.extname(parsedUrl.pathname) || '.jpg'}`;
          const imageDestPath = path.join(assetsDir, imageFilename);
          
          await new Promise((resolve, reject) => {
            const file = fs.createWriteStream(imageDestPath);
            protocol.get(sampleImageUrl, (response) => {
              response.pipe(file);
              file.on('finish', () => {
                file.close();
                resolve();
              });
            }).on('error', (err) => {
              fs.unlinkSync(imageDestPath);
              reject(err);
            });
          });
          
          sampleImagePath = `./assets/${imageFilename}`;
          console.log(`✅ Sample image downloaded and saved to: ${sampleImagePath}`);
        } catch (error) {
          console.error('Error downloading sample image:', error);
          // Fallback to external URL
          sampleImagePath = sampleImageUrl;
          console.log(`⚠️ Using external sample image URL: ${sampleImageUrl}`);
        }
      }
    } catch (error) {
      console.error('Error copying sample image:', error);
      // Continue without sample image if copy fails
    }
  }
  
  // Update config with local logo path (always relative for file:// compatibility)
  // Ensure logo path always starts with ./ for homepage, or is already relative
  const finalLogoPath = logoPath 
    ? (logoPath.startsWith('./') || logoPath.startsWith('../') ? logoPath : `./${logoPath}`)
    : '';
  
  const finalSampleImagePath = sampleImagePath 
    ? (sampleImagePath.startsWith('./') || sampleImagePath.startsWith('../') ? sampleImagePath : `./${sampleImagePath}`)
    : '';
  
  const configWithLocalLogo = {
    ...config,
    logo_url: finalLogoPath,
    logoUrl: finalLogoPath,
    sample_image_url: finalSampleImagePath,
    sampleImageUrl: finalSampleImagePath
  };
  
  // Fetch family data for integration
  const familyData = await fetchFamilyData(familyId);
  
  // Create signed URL generator for private S3 media
  const signedUrlGenerator = async (s3Key) => {
    try {
      // Generate signed URL for private media (1 hour expiration)
      const { getSignedUrlForFamilyMedia } = require('../utils/s3SignedUrls');
      return await getSignedUrlForFamilyMedia(s3Key, familyId, null, 3600);
    } catch (error) {
      console.error('Error generating signed URL:', error);
      // Fallback to public URL if signed URL generation fails
      return s3Key ? `https://${process.env.AWS_S3_BUCKET || 'family-portal'}.s3.amazonaws.com/${s3Key}` : '';
    }
  };
  
  // Normalize page routes - ensure homepage has route_path of "/"
  const normalizedPages = pages.map(p => ({
    ...p,
    route_path: p.page_type === 'homepage' ? '/' : (p.route_path || `/${slugify(p.page_slug)}`)
  }));
  
  // Create image processor function for static site generation
  // This processes image URLs to work in file:// context (local preview)
  const processImageUrl = async (imageUrl) => {
    if (!imageUrl) return '';
    
    // If it's already a data URL, return as-is
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }
    
    // If it's an external URL (http/https), return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's a local upload path, copy to assets folder
    if (imageUrl.includes('/uploads/')) {
      try {
        const imageSourcePath = imageUrl.startsWith('/uploads/')
          ? path.join(__dirname, '..', imageUrl)
          : path.join(__dirname, '..', 'uploads', imageUrl.split('/uploads/')[1]);
        
        if (fs.existsSync(imageSourcePath)) {
          const imageFilename = path.basename(imageSourcePath);
          const imageDestPath = path.join(assetsDir, imageFilename);
          
          // Only copy if not already copied
          if (!fs.existsSync(imageDestPath)) {
            fs.copyFileSync(imageSourcePath, imageDestPath);
            console.log(`✅ Image copied to: ./assets/${imageFilename}`);
          }
          
          return `./assets/${imageFilename}`;
        } else {
          console.log(`⚠️ Image file not found: ${imageSourcePath}`);
          return imageUrl; // Return original if file doesn't exist
        }
      } catch (error) {
        console.error('Error copying image:', error);
        return imageUrl; // Return original on error
      }
    }
    
    // For relative paths, return as-is
    if (imageUrl.startsWith('./') || imageUrl.startsWith('../')) {
      return imageUrl;
    }
    
    // Default: return as-is
    return imageUrl;
  };
  
  // Add image processor to config
  configWithLocalLogo.processImageUrl = processImageUrl;
  
  // Generate index.html (homepage)
  const homepage = normalizedPages.find(p => p.page_type === 'homepage') || normalizedPages[0];
  if (homepage) {
    console.log(`✅ Generating homepage: index.html`);
    const homepageHTML = await generatePageHTML(homepage, configWithLocalLogo, normalizedPages, familyData, signedUrlGenerator);
    fs.writeFileSync(
      path.join(outDir, 'index.html'),
      homepageHTML,
      'utf8'
    );
  } else if (normalizedPages.length > 0) {
    // If no homepage, use first page as index
    console.log(`✅ Generating index.html from first page: ${normalizedPages[0].page_title}`);
    const indexHTML = await generatePageHTML(normalizedPages[0], configWithLocalLogo, normalizedPages, familyData, signedUrlGenerator);
    fs.writeFileSync(
      path.join(outDir, 'index.html'),
      indexHTML,
      'utf8'
    );
  }
  
  // Generate other pages
  for (const page of normalizedPages) {
    if (page.page_type === 'homepage') continue;
    
    // Clean route path and create directory structure
    const pagePath = page.route_path.replace(/^\//, '').replace(/\/$/, '') || slugify(page.page_slug);
    if (!pagePath) continue; // Skip if no valid path
    
    const pageDir = path.join(outDir, pagePath);
    fs.mkdirSync(pageDir, { recursive: true });
    
    console.log(`✅ Generating page: ${pagePath}/index.html`);
    const pageHTML = await generatePageHTML(page, configWithLocalLogo, normalizedPages, familyData, signedUrlGenerator);
    fs.writeFileSync(
      path.join(pageDir, 'index.html'),
      pageHTML,
      'utf8'
    );
  }
  
  // Create a README file with website information
  const readmeContent = `# ${siteTitle || 'Generated Website'}

This website was generated on ${new Date().toLocaleString()}.

## Website Details
- Site Title: ${siteTitle || 'Not set'}
- Domain: ${config.domain || 'Not set'}
- Theme: ${config.theme || 'light'}
- Layout: ${config.layout || 'sidebar'}
- Total Pages: ${pages.length}

## Pages
${pages.map((p, i) => `${i + 1}. ${p.page_title} (${p.route_path})`).join('\n')}

## How to Use
1. Open index.html in your web browser
2. All pages are linked and functional
3. This is a complete, standalone website

## Generated Files
- index.html (Homepage)
${pages.filter(p => p.page_type !== 'homepage').map(p => `- ${p.route_path.replace(/^\//, '')}/index.html`).join('\n')}

---
Generated by Fami Family Portal Website Generator
`;
  
  fs.writeFileSync(
    path.join(outDir, 'README.txt'),
    readmeContent,
    'utf8'
  );
  
  console.log(`✅ Website generated successfully in: ${outDir}`);
  console.log(`📂 Total files created: ${pages.length + 1} (${pages.length} pages + index.html + README.txt)`);
  
  return {
    directory: outDir,
    folderName: folderName,
    siteTitle: siteTitle,
    pagesGenerated: pages.length
  };
}

module.exports = {
  buildStaticSite,
  generatePageHTML,
  renderContentBlocks,
  fetchFamilyData,
  generateFamilyTreeHTML,
  generateGalleryHTML,
  generateEventsHTML,
  generateBioDataHTML,
};
