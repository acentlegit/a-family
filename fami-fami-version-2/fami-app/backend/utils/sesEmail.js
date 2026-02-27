/**
 * AWS SES Email Service
 * 
 * Alternative to SendGrid for BRD compliance
 * Required: "Email notifications via AWS Lambda + SES"
 */

const { SESClient, SendEmailCommand, SendTemplatedEmailCommand } = require('@aws-sdk/client-ses');

// Initialize SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Send email via AWS SES
 * @param {Object} options - Email options
 * @param {String|Array} options.to - Recipient email(s)
 * @param {String} options.subject - Email subject
 * @param {String} options.html - HTML content
 * @param {String} options.text - Plain text content (optional)
 * @param {String} options.from - Sender email (defaults to FROM_EMAIL env var)
 * @returns {Promise<Object>} - Send result
 */
async function sendEmail({ to, subject, html, text, from = null }) {
  const fromEmail = from || process.env.FROM_EMAIL || process.env.SES_FROM_EMAIL;
  
  if (!fromEmail) {
    throw new Error('FROM_EMAIL or SES_FROM_EMAIL must be configured');
  }

  // Ensure 'to' is an array
  const toAddresses = Array.isArray(to) ? to : [to];

  // Verify email addresses are in SES (required for sandbox mode)
  // In production, verify sender domain in SES console

  try {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
          ...(text && {
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    const response = await sesClient.send(command);
    
    console.log('✅ Email sent via SES:', response.MessageId);
    
    return {
      success: true,
      messageId: response.MessageId,
      provider: 'ses',
    };
  } catch (error) {
    console.error('❌ Error sending email via SES:', error);
    throw error;
  }
}

/**
 * Send templated email via SES
 * @param {Object} options - Template email options
 * @param {String|Array} options.to - Recipient email(s)
 * @param {String} options.templateName - SES template name
 * @param {Object} options.templateData - Template data (JSON string)
 * @param {String} options.from - Sender email
 * @returns {Promise<Object>} - Send result
 */
async function sendTemplatedEmail({ to, templateName, templateData, from = null }) {
  const fromEmail = from || process.env.FROM_EMAIL || process.env.SES_FROM_EMAIL;
  
  if (!fromEmail) {
    throw new Error('FROM_EMAIL or SES_FROM_EMAIL must be configured');
  }

  const toAddresses = Array.isArray(to) ? to : [to];

  try {
    const command = new SendTemplatedEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: toAddresses,
      },
      Template: templateName,
      TemplateData: JSON.stringify(templateData),
    });

    const response = await sesClient.send(command);
    
    console.log('✅ Templated email sent via SES:', response.MessageId);
    
    return {
      success: true,
      messageId: response.MessageId,
      provider: 'ses',
    };
  } catch (error) {
    console.error('❌ Error sending templated email via SES:', error);
    throw error;
  }
}

/**
 * Check if SES is configured
 * @returns {Boolean}
 */
function isSESConfigured() {
  return !!(
    process.env.AWS_REGION &&
    (process.env.FROM_EMAIL || process.env.SES_FROM_EMAIL)
  );
}

module.exports = {
  sendEmail,
  sendTemplatedEmail,
  isSESConfigured,
};
