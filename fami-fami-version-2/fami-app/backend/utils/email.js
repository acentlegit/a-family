require("dotenv").config();
const sgMail = require("@sendgrid/mail");

// Initialize SendGrid API Key
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.warn("⚠️  Missing SENDGRID_API_KEY in .env - Email notifications will be disabled");
} else {
  sgMail.setApiKey(apiKey);
  console.log("✅ SendGrid API Key configured (starts with:", apiKey.substring(0, 5) + "...)");
}

// Get FROM_EMAIL from environment
const fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
const isValidFromEmail = fromEmail && 
  fromEmail !== 'noreply@fami.app' && 
  fromEmail !== 'your-verified-sender@yourdomain.com' && 
  fromEmail !== 'your-email@gmail.com' &&
  fromEmail.includes('@');

if (!isValidFromEmail) {
  console.warn("⚠️  FROM_EMAIL not properly configured in .env");
  console.warn("⚠️  Current value:", fromEmail || 'not set');
  console.warn("⚠️  Please set FROM_EMAIL to a verified sender email address");
} else {
  console.log("✅ FROM_EMAIL configured:", fromEmail);
}

const sendEmail = async (options) => {
  const recipientEmail = options.email || options.to;

  console.log("📧 Attempting to send email to:", recipientEmail);
  console.log("📧 SendGrid API Key present:", !!apiKey, apiKey ? "(starts with " + apiKey.substring(0, 3) + "...)" : "");
  console.log("📧 FROM_EMAIL:", fromEmail);

  if (!apiKey) {
    console.warn("⚠️  SendGrid not configured - skipping email to:", recipientEmail);
    return null;
  }

  if (!isValidFromEmail) {
    console.error("❌ Missing or invalid FROM_EMAIL in .env");
    console.error("❌ Current FROM_EMAIL value:", fromEmail || 'not set');
    console.error("❌ Please set FROM_EMAIL to a verified sender email address in your .env file");
    return null;
  }

  try {
    const msg = {
      to: recipientEmail,
      from: fromEmail,
      subject: options.subject,
      text: options.text || options.html?.replace(/<[^>]*>/g, '') || '',
      html: options.html || options.text || '',
      attachments: options.attachments?.length ? options.attachments : undefined
    };

    console.log("📧 Sending email via SendGrid...");
    const response = await sgMail.send(msg);
    console.log("✅ Email sent successfully to:", recipientEmail);
    console.log("✅ Status Code:", response[0].statusCode);
    return response;
  } catch (err) {
    console.error("❌ Failed to send email to:", recipientEmail);
    if (err.response?.body) {
      console.error("❌ SendGrid Error Details:", JSON.stringify(err.response.body, null, 2));
    } else {
      console.error("❌ Error message:", err.message);
    }
    return null;
  }
};

const sendBulkEmail = async (emails, subject, html, text) => {
  if (!apiKey) {
    console.warn("⚠️  Cannot send bulk email - SendGrid API key missing");
    return { success: false, sent: 0, total: 0, error: 'SendGrid API key not configured' };
  }

  if (!isValidFromEmail) {
    console.error("❌ Cannot send bulk email - FROM_EMAIL not properly configured");
    console.error("❌ Current FROM_EMAIL value:", fromEmail || 'not set');
    return { success: false, sent: 0, total: 0, error: 'FROM_EMAIL not configured' };
  }

  if (!emails || emails.length === 0) {
    console.warn("⚠️  Cannot send bulk email - no emails provided");
    return { success: false, sent: 0, total: 0, error: 'No emails provided' };
  }

  const validEmails = emails.filter(email => email && typeof email === 'string' && email.includes('@'));
  if (validEmails.length === 0) {
    console.warn("⚠️  No valid email addresses provided for bulk send");
    return { success: false, sent: 0, total: emails.length, error: 'No valid email addresses' };
  }

  console.log(`📧 Preparing to send bulk email to ${validEmails.length} recipients...`);
  console.log(`📧 SendGrid API Key present: ${!!apiKey}`);
  console.log(`📧 FROM_EMAIL: ${fromEmail}`);
  
  let totalSent = 0;
  const batchSize = 1000;
  
  for (let i = 0; i < validEmails.length; i += batchSize) {
    const batch = validEmails.slice(i, i + batchSize);
    try {
      const msg = {
        to: batch,
        from: fromEmail,
        subject: subject,
        text: text || html?.replace(/<[^>]*>/g, '') || '',
        html: html || text || ''
      };
      
      console.log(`📧 Sending batch ${Math.floor(i / batchSize) + 1} to ${batch.length} recipients...`);
      const response = await sgMail.send(msg);
      console.log(`✅ Bulk email sent successfully to ${batch.length} recipients`);
      console.log("✅ Status Code:", response[0].statusCode);
      totalSent += batch.length;
    } catch (err) {
      console.error(`❌ Failed to send bulk email to batch starting at index ${i}`);
      if (err.response?.body) {
        console.error("❌ SendGrid Error Details:", JSON.stringify(err.response.body, null, 2));
      } else {
        console.error("❌ Error message:", err.message);
      }
    }
  }

  const result = {
    success: totalSent > 0,
    sent: totalSent,
    total: validEmails.length,
    failed: validEmails.length - totalSent
  };

  console.log(`📧 Bulk email summary: ${totalSent}/${validEmails.length} emails sent successfully`);
  return result;
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.sendBulkEmail = sendBulkEmail;
