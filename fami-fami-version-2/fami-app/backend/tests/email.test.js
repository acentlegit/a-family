/**
 * Unit Tests for SendGrid Email Service
 * Run with: npm test -- email.test.js
 */

// Mock SendGrid before requiring email module
jest.mock('@sendgrid/mail', () => {
  const mockSend = jest.fn();
  return {
    setApiKey: jest.fn(),
    send: mockSend
  };
});

// Mock dotenv to prevent loading actual .env
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

const sgMail = require('@sendgrid/mail');

// Clear module cache to reload email module with new env vars
const clearEmailModuleCache = () => {
  delete require.cache[require.resolve('../utils/email')];
};

describe('SendGrid Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache
    clearEmailModuleCache();
    // Reset environment variables
    delete process.env.SENDGRID_API_KEY;
    delete process.env.FROM_EMAIL;
  });

  describe('sendEmail', () => {
    test('should return null when SENDGRID_API_KEY is not set', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message'
      });

      expect(result).toBeNull();
      expect(sgMail.send).not.toHaveBeenCalled();
    });

    test('should return null when FROM_EMAIL is not set', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      delete process.env.FROM_EMAIL;
      
      // Reload module with new env vars
      clearEmailModuleCache();
      const { sendEmail } = require('../utils/email');
      
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message'
      });

      expect(result).toBeNull();
      expect(sgMail.send).not.toHaveBeenCalled();
    });

    test('should return null when FROM_EMAIL is a placeholder', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'noreply@fami.app';
      
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message'
      });

      expect(result).toBeNull();
      expect(sgMail.send).not.toHaveBeenCalled();
    });

    test('should send email successfully when properly configured', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';
      
      // Reload module with new env vars
      clearEmailModuleCache();
      const { sendEmail } = require('../utils/email');
      
      const mockResponse = [{ statusCode: 202 }];
      sgMail.send.mockResolvedValue(mockResponse);

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>'
      });

      expect(result).toEqual(mockResponse);
      expect(sgMail.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'verified@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>'
      });
    });

    test('should handle email with only text content', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';
      
      const mockResponse = [{ statusCode: 202 }];
      sgMail.send.mockResolvedValue(mockResponse);

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message'
      });

      expect(result).toEqual(mockResponse);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          from: 'verified@example.com',
          subject: 'Test Subject',
          text: 'Test message',
          html: 'Test message'
        })
      );
    });

    test('should handle email with only HTML content', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';
      
      const mockResponse = [{ statusCode: 202 }];
      sgMail.send.mockResolvedValue(mockResponse);

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test message</p>'
      });

      expect(result).toEqual(mockResponse);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          from: 'verified@example.com',
          subject: 'Test Subject',
          text: 'Test message',
          html: '<p>Test message</p>'
        })
      );
    });

    test('should handle SendGrid API errors', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';
      
      const mockError = {
        response: {
          body: {
            errors: [{ message: 'Invalid API key' }]
          }
        }
      };
      sgMail.send.mockRejectedValue(mockError);

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message'
      });

      expect(result).toBeNull();
      expect(sgMail.send).toHaveBeenCalled();
    });

    test('should accept email in "email" field', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';
      
      const mockResponse = [{ statusCode: 202 }];
      sgMail.send.mockResolvedValue(mockResponse);

      const result = await sendEmail({
        email: 'test@example.com',
        subject: 'Test',
        text: 'Test message'
      });

      expect(result).toEqual(mockResponse);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com'
        })
      );
    });
  });

  describe('sendBulkEmail', () => {
    test('should return error when SENDGRID_API_KEY is not set', async () => {
      const result = await sendBulkEmail(
        ['test1@example.com', 'test2@example.com'],
        'Test Subject',
        '<p>Test</p>',
        'Test'
      );

      expect(result).toEqual({
        success: false,
        sent: 0,
        total: 0,
        error: 'SendGrid API key not configured'
      });
      expect(sgMail.send).not.toHaveBeenCalled();
    });

    test('should return error when FROM_EMAIL is not set', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';

      const result = await sendBulkEmail(
        ['test1@example.com', 'test2@example.com'],
        'Test Subject',
        '<p>Test</p>',
        'Test'
      );

      expect(result).toEqual({
        success: false,
        sent: 0,
        total: 0,
        error: 'FROM_EMAIL not configured'
      });
      expect(sgMail.send).not.toHaveBeenCalled();
    });

    test('should return error when no emails provided', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';

      const result = await sendBulkEmail(
        [],
        'Test Subject',
        '<p>Test</p>',
        'Test'
      );

      expect(result).toEqual({
        success: false,
        sent: 0,
        total: 0,
        error: 'No emails provided'
      });
    });

    test('should filter out invalid email addresses', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';

      const result = await sendBulkEmail(
        ['valid@example.com', 'invalid-email', '', null, 'another@example.com'],
        'Test Subject',
        '<p>Test</p>',
        'Test'
      );

      expect(result).toEqual({
        success: false,
        sent: 0,
        total: 2,
        error: 'No valid email addresses'
      });
    });

    test('should send bulk emails successfully', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';

      const mockResponse = [{ statusCode: 202 }];
      sgMail.send.mockResolvedValue(mockResponse);

      const emails = ['test1@example.com', 'test2@example.com', 'test3@example.com'];
      const result = await sendBulkEmail(
        emails,
        'Test Subject',
        '<p>Test</p>',
        'Test'
      );

      expect(result).toEqual({
        success: true,
        sent: 3,
        total: 3,
        failed: 0
      });
      expect(sgMail.send).toHaveBeenCalledWith({
        to: emails,
        from: 'verified@example.com',
        subject: 'Test Subject',
        text: 'Test',
        html: '<p>Test</p>'
      });
    });

    test('should handle batches larger than 1000', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';

      const mockResponse = [{ statusCode: 202 }];
      sgMail.send.mockResolvedValue(mockResponse);

      // Create 2500 email addresses
      const emails = Array.from({ length: 2500 }, (_, i) => `test${i}@example.com`);
      const result = await sendBulkEmail(
        emails,
        'Test Subject',
        '<p>Test</p>',
        'Test'
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBe(2500);
      expect(result.total).toBe(2500);
      // Should be called 3 times (1000 + 1000 + 500)
      expect(sgMail.send).toHaveBeenCalledTimes(3);
    });

    test('should handle errors in bulk sending', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test123456789';
      process.env.FROM_EMAIL = 'verified@example.com';

      const mockError = {
        response: {
          body: {
            errors: [{ message: 'Rate limit exceeded' }]
          }
        }
      };
      sgMail.send.mockRejectedValue(mockError);

      const emails = ['test1@example.com', 'test2@example.com'];
      const result = await sendBulkEmail(
        emails,
        'Test Subject',
        '<p>Test</p>',
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.sent).toBe(0);
      expect(result.total).toBe(2);
      expect(result.failed).toBe(2);
    });
  });
});
