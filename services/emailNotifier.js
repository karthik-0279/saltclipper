require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Audit Log of Login Events (Stored in memory for Admin Dashboard visibility)
 */
const recentLoginEvents = [];

/**
 * Configure Nodemailer Transporter
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  return null;
}

/**
 * Send automated email alert when any user or admin logs in
 * 
 * @param {object} params
 * @param {string} params.userEmail - Email of the user logging in
 * @param {string} params.role - 'admin' or 'user'
 * @param {string} [params.method] - 'Password' or 'Google OAuth'
 * @param {string} [params.ipAddress] - IP address of the client
 * @param {string} [params.userAgent] - Browser / device user-agent
 * @returns {Promise<{ sent: boolean, method: string, messageId?: string, previewUrl?: string }>}
 */
async function sendLoginAlert({ userEmail, role = 'user', method = 'Password', ipAddress = '127.0.0.1', userAgent = 'Unknown' }) {
  const timestamp = new Date().toISOString();
  const readableTime = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
  const adminAlertEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_ID || 'admin@autoclip.ai';

  const eventRecord = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userEmail,
    role,
    method,
    ipAddress,
    userAgent,
    timestamp,
    readableTime
  };

  // Keep up to 50 recent events for Admin Dashboard
  recentLoginEvents.unshift(eventRecord);
  if (recentLoginEvents.length > 50) {
    recentLoginEvents.pop();
  }

  // Print security banner to console
  console.log(`\n=======================================================`);
  console.log(`🚨 [SECURITY ALERT] New Login Detected!`);
  console.log(`👤 User:      ${userEmail} (${role.toUpperCase()})`);
  console.log(`🔑 Method:    ${method}`);
  console.log(`🌐 IP:        ${ipAddress}`);
  console.log(`💻 Device:    ${userAgent.substring(0, 70)}`);
  console.log(`⏰ Time:      ${readableTime}`);
  console.log(`📧 Recipient: ${adminAlertEmail}`);
  console.log(`=======================================================\n`);

  const transporter = getTransporter();

  const emailSubject = `🚨 [AutoClip AI Security] New ${role === 'admin' ? 'ADMIN' : 'User'} Login: ${userEmail}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
        .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 580px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .badge-admin { background-color: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; }
        .badge-user { background-color: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid #6366f1; }
        .field-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
        .field-table td { padding: 10px 8px; border-bottom: 1px solid #334155; }
        .label { color: #94a3b8; font-weight: 600; width: 35%; }
        .value { color: #f8fafc; font-family: monospace; font-size: 13px; }
        .footer { margin-top: 24px; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2 style="margin-top: 0; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
          <span>🔔</span> Login Notification Alert
        </h2>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
          A new authentication event occurred on your <strong>AutoClip AI Studio</strong> installation.
        </p>

        <table class="field-table">
          <tr>
            <td class="label">User Email:</td>
            <td class="value"><strong>${userEmail}</strong></td>
          </tr>
          <tr>
            <td class="label">Assigned Role:</td>
            <td class="value">
              <span class="badge ${role === 'admin' ? 'badge-admin' : 'badge-user'}">${role}</span>
            </td>
          </tr>
          <tr>
            <td class="label">Login Method:</td>
            <td class="value">${method}</td>
          </tr>
          <tr>
            <td class="label">IP Address:</td>
            <td class="value">${ipAddress}</td>
          </tr>
          <tr>
            <td class="label">Timestamp:</td>
            <td class="value">${readableTime} (${timestamp})</td>
          </tr>
          <tr>
            <td class="label">User-Agent:</td>
            <td class="value">${userAgent}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; padding: 12px; background: rgba(15, 23, 42, 0.6); border-radius: 8px; font-size: 12px; color: #94a3b8;">
          🔒 <strong>Security Note:</strong> If this login was unauthorized, access your server or update the <code>ADMIN_PASSWORD</code> in your <code>.env</code> file immediately.
        </div>

        <div class="footer">
          AutoClip AI Automated Security Dispatcher &bull; Local Automated Studio
        </div>
      </div>
    </body>
    </html>
  `;

  // If real SMTP credentials are provided, send through the transport
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"AutoClip AI Security" <${process.env.SMTP_USER}>`,
        to: adminAlertEmail,
        subject: emailSubject,
        text: `New Login Detected:\nUser: ${userEmail}\nRole: ${role}\nMethod: ${method}\nIP: ${ipAddress}\nTime: ${readableTime}`,
        html: htmlContent
      });

      console.log(`[EMAIL NOTIFIER] Alert sent successfully via SMTP! Message ID: ${info.messageId}`);
      return { sent: true, method: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[EMAIL NOTIFIER ERROR] Could not send email via SMTP:`, err.message);
      return { sent: false, method: 'smtp', error: err.message };
    }
  }

  // Fallback: If SMTP credentials are not yet set in .env, generate an Ethereal preview account or log
  try {
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await testTransporter.sendMail({
      from: '"AutoClip AI Security" <security@autoclip.ai>',
      to: adminAlertEmail,
      subject: emailSubject,
      text: `New Login Detected:\nUser: ${userEmail}\nRole: ${role}\nTime: ${readableTime}`,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[EMAIL NOTIFIER] Preview link for alert: ${previewUrl}`);
    return { sent: true, method: 'ethereal_preview', previewUrl };
  } catch (testErr) {
    // If offline or test account fails, console alert was already printed
    return { sent: false, method: 'console_logged', note: 'Configure SMTP in .env for production email delivery' };
  }
}

/**
 * Returns recent login events for Admin Dashboard
 */
function getRecentEvents() {
  return [...recentLoginEvents];
}

module.exports = {
  sendLoginAlert,
  getRecentEvents
};
