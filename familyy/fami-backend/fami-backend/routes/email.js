const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { sendEmail } = require("../utils/email");

// @route   POST /api/email/send
// @desc    Send an email via SendGrid (simple API)
// @access  Private
router.post("/send", protect, async (req, res) => {
  try {
    const { to, email, subject, text, html, attachments } = req.body;
    const recipient = to || email;

    if (!recipient) {
      return res.status(400).json({ success: false, message: "Recipient email (to/email) is required" });
    }
    if (!subject) {
      return res.status(400).json({ success: false, message: "Subject is required" });
    }
    if (!text && !html) {
      return res.status(400).json({ success: false, message: "Either text or html content is required" });
    }

    const normalizedAttachments = Array.isArray(attachments)
      ? attachments.map(att => ({
          filename: att.filename,
          content: att.content, // base64 string
          type: att.type
        })).filter(att => att.filename && att.content)
      : undefined;

    const response = await sendEmail({
      to: recipient,
      subject,
      text,
      html,
      attachments: normalizedAttachments
    });

    if (!response) {
      return res.status(500).json({ success: false, message: "Email not sent (check SendGrid config)" });
    }

    res.json({ success: true, message: "Email sent", statusCode: response[0]?.statusCode || 202 });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
