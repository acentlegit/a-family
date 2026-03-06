require('dotenv').config();
const { sendEmail, sendBulkEmail } = require('../utils/email');

/**
 * Test SendGrid Configuration and Email Sending
 */
async function testSendGrid() {
  console.log('\n======================================================================');
  console.log('SENDGRID CONFIGURATION TEST');
  console.log('======================================================================\n');

  // Check environment variables
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;

  console.log('Configuration Check:');
  console.log('─────────────────────────────────────────────────────────────────────');
  
  if (!apiKey) {
    console.log('❌ SENDGRID_API_KEY: NOT SET');
    console.log('   Reason: Missing in .env file');
    console.log('   Fix: Add SENDGRID_API_KEY=your_api_key_here to .env file');
    console.log('   How to get API key:');
    console.log('     1. Go to https://app.sendgrid.com/');
    console.log('     2. Navigate to Settings > API Keys');
    console.log('     3. Create a new API key with "Mail Send" permissions');
    console.log('     4. Copy the key and add it to your .env file');
  } else {
    console.log('✅ SENDGRID_API_KEY: SET');
    console.log('   Key starts with:', apiKey.substring(0, 5) + '...');
    console.log('   Key length:', apiKey.length, 'characters');
  }

  console.log('');

  if (!fromEmail) {
    console.log('❌ FROM_EMAIL: NOT SET');
    console.log('   Reason: Missing in .env file');
    console.log('   Fix: Add FROM_EMAIL=your-verified-email@domain.com to .env file');
    console.log('   Important: The email must be verified in SendGrid');
    console.log('   How to verify:');
    console.log('     1. Go to https://app.sendgrid.com/');
    console.log('     2. Navigate to Settings > Sender Authentication');
    console.log('     3. Verify a Single Sender or Domain');
    console.log('     4. Use the verified email as FROM_EMAIL');
  } else {
    const isValidFromEmail = fromEmail && 
      fromEmail !== 'noreply@fami.app' && 
      fromEmail !== 'your-verified-sender@yourdomain.com' && 
      fromEmail !== 'your-email@gmail.com' &&
      fromEmail.includes('@');

    if (!isValidFromEmail) {
      console.log('⚠️  FROM_EMAIL: SET BUT INVALID');
      console.log('   Current value:', fromEmail);
      console.log('   Reason: Email appears to be a placeholder or invalid');
      console.log('   Fix: Set FROM_EMAIL to a verified sender email address');
    } else {
      console.log('✅ FROM_EMAIL: SET AND VALID');
      console.log('   Email:', fromEmail);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────────────\n');

  // Test email sending if configured
  if (apiKey && fromEmail && fromEmail.includes('@') && 
      fromEmail !== 'noreply@fami.app' && 
      fromEmail !== 'your-verified-sender@yourdomain.com' && 
      fromEmail !== 'your-email@gmail.com') {
    
    console.log('Testing Email Sending:');
    console.log('─────────────────────────────────────────────────────────────────────\n');

    // Test 1: Send a test email
    const testEmail = process.env.TEST_EMAIL || fromEmail;
    console.log(`📧 Sending test email to: ${testEmail}`);
    
    try {
      const result = await sendEmail({
        to: testEmail,
        subject: 'SendGrid Test Email',
        html: `
          <h2>SendGrid Configuration Test</h2>
          <p>This is a test email to verify SendGrid is working correctly.</p>
          <p><strong>Status:</strong> ✅ SendGrid is properly configured!</p>
          <p><strong>From:</strong> ${fromEmail}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `,
        text: 'SendGrid Configuration Test - This is a test email to verify SendGrid is working correctly. Status: SendGrid is properly configured!'
      });

      if (result) {
        console.log('✅ Test email sent successfully!');
        console.log('   Status Code:', result[0]?.statusCode || 'N/A');
        console.log('   Check your inbox at:', testEmail);
      } else {
        console.log('❌ Test email failed to send');
        console.log('   Check the error messages above for details');
      }
    } catch (error) {
      console.log('❌ Error sending test email:');
      console.log('   Error:', error.message);
      if (error.response?.body) {
        console.log('   Details:', JSON.stringify(error.response.body, null, 2));
      }
    }

    console.log('\n─────────────────────────────────────────────────────────────────────\n');
  } else {
    console.log('⚠️  Cannot test email sending - configuration incomplete');
    console.log('   Please configure SENDGRID_API_KEY and FROM_EMAIL first\n');
  }

  console.log('======================================================================\n');
}

// Run the test
testSendGrid()
  .then(() => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });
