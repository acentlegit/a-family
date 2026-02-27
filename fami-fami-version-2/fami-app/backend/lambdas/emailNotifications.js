/**
 * AWS Lambda Function for Email Notifications
 * 
 * This function is triggered daily (via EventBridge/CloudWatch Events)
 * to send birthday and anniversary reminders
 * 
 * Environment Variables Required:
 * - PG_HOST: PostgreSQL host
 * - PG_DATABASE: Database name
 * - PG_USER: Database user
 * - PG_PASSWORD: Database password
 * - SENDGRID_API_KEY: SendGrid API key
 * - FROM_EMAIL: Sender email address
 */

const { Pool } = require('pg');
const sgMail = require('@sendgrid/mail');
const { sendEmail: sendSESEmail, isSESConfigured } = require('../utils/sesEmail');

// Initialize SendGrid (fallback)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Determine email provider (SES preferred for BRD compliance)
const useSES = process.env.EMAIL_PROVIDER === 'ses' || (isSESConfigured() && !process.env.SENDGRID_API_KEY);

// PostgreSQL connection
const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

/**
 * Get upcoming birthdays (next 7 days)
 */
async function getUpcomingBirthdays() {
  const query = `
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.email,
      m.date_of_birth,
      f.name as family_name,
      u.email as family_admin_email
    FROM members m
    JOIN families f ON m.family_id = f.id
    JOIN users u ON f.created_by = u.id
    WHERE 
      EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '7 days')
      AND EXTRACT(DAY FROM m.date_of_birth) BETWEEN EXTRACT(DAY FROM CURRENT_DATE) 
        AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '7 days')
      AND m.email IS NOT NULL
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get upcoming anniversaries (next 7 days)
 * Note: This assumes you have an anniversaries table or can derive from member relationships
 */
async function getUpcomingAnniversaries() {
  // This is a placeholder - you'll need to implement based on your data model
  // For now, returning empty array
  return [];
}

/**
 * Send birthday reminder email
 */
async function sendBirthdayReminder(member, familyName, adminEmail) {
  const birthdayDate = new Date(member.date_of_birth);
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthdayDate.getFullYear();
  
  const emailContent = {
    to: member.email,
    subject: `🎉 Upcoming Birthday: ${member.first_name} ${member.last_name}`,
    html: `
      <h2>Birthday Reminder</h2>
      <p>Hello ${member.first_name},</p>
      <p>This is a reminder that your birthday is coming up soon!</p>
      <p><strong>Date:</strong> ${birthdayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
      <p><strong>Age:</strong> ${age} years old</p>
      <p><strong>Family:</strong> ${familyName}</p>
      <p>We hope you have a wonderful celebration!</p>
      <br>
      <p>Best regards,<br>Family Portal Team</p>
    `,
  };
  
  try {
    if (useSES) {
      // Use AWS SES (BRD compliant)
      await sendSESEmail(emailContent);
      console.log(`Birthday reminder sent via SES to ${member.email}`);
    } else {
      // Fallback to SendGrid
      await sgMail.send({
        ...emailContent,
        from: process.env.FROM_EMAIL,
      });
      console.log(`Birthday reminder sent via SendGrid to ${member.email}`);
    }
    return { success: true, email: member.email, provider: useSES ? 'ses' : 'sendgrid' };
  } catch (error) {
    console.error(`Error sending birthday reminder to ${member.email}:`, error);
    return { success: false, email: member.email, error: error.message };
  }
}

/**
 * Send anniversary reminder email
 */
async function sendAnniversaryReminder(anniversary) {
  // Placeholder for anniversary reminders
  // Implement based on your data model
  return { success: true };
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Email notification Lambda triggered');
  
  try {
    // Get upcoming birthdays
    const birthdays = await getUpcomingBirthdays();
    console.log(`Found ${birthdays.length} upcoming birthdays`);
    
    // Send birthday reminders
    const birthdayResults = await Promise.all(
      birthdays.map(member => 
        sendBirthdayReminder(member, member.family_name, member.family_admin_email)
      )
    );
    
    // Get upcoming anniversaries
    const anniversaries = await getUpcomingAnniversaries();
    console.log(`Found ${anniversaries.length} upcoming anniversaries`);
    
    // Send anniversary reminders
    const anniversaryResults = await Promise.all(
      anniversaries.map(anniversary => 
        sendAnniversaryReminder(anniversary)
      )
    );
    
    // Summary
    const successful = birthdayResults.filter(r => r.success).length;
    const failed = birthdayResults.filter(r => !r.success).length;
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Email notifications processed',
        birthdays: {
          total: birthdays.length,
          successful,
          failed,
        },
        anniversaries: {
          total: anniversaries.length,
          successful: anniversaryResults.filter(r => r.success).length,
          failed: anniversaryResults.filter(r => !r.success).length,
        },
      }),
    };
  } catch (error) {
    console.error('Error in email notification Lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  } finally {
    await pool.end();
  }
};

// For local testing
if (require.main === module) {
  exports.handler({}).then(result => {
    console.log('Result:', result);
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
