const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const { t } = require('../utils/i18n');
// Create one reusable mail transport
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port:587,
  secure:false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});
transporter.verify()
  .then(() => console.log("✅ SMTP Connected"))
  .catch((err) => console.error("❌ SMTP Verify Error:", err));

// Load an HTML template file and replace {{placeholders}} with real values
const renderTemplate = (templateName, variables , lang ) => {
  const filePath = path.join(__dirname, '../templates', `${templateName}.html`);
  let html = fs.readFileSync(filePath, 'utf8');

  // Replace each {{key}} with the actual value
  Object.entries(variables).forEach(([key, value]) => {
    html = html.replaceAll(`{{${key}}}`, value);
  });

  return html;
};

// Core send function — used by all the specific senders below
const sendEmail = async ({ to, subject, template, variables }) => {
  const html = renderTemplate(template, variables);

  await transporter.sendMail({
    from: config.email.from,
    to,
    subject,
    html,
  });

  console.log(`📧 Email sent to ${to} — ${subject}`);
};

// ── Specific email senders ─────────────────────────────────

const sendVerificationEmail = (user, verificationUrl , lang= 'ar') =>
  sendEmail({
    to: user.email,
    subject: t(lang, 'EMAIL_SUBJECT_VERIFY'),
    template: lang === 'ar' ? 'emailVerification-ar' : 'emailVerification',
    variables: { name: user.name, verificationUrl },
  });

const sendPasswordResetEmail = (user, resetUrl, lang = 'ar') =>
  sendEmail({
    to: user.email,
    subject: t(lang, 'EMAIL_SUBJECT_RESET'),
    template: lang === 'ar' ? 'passwordReset-ar' : 'passwordReset',
    variables: { name: user.name, resetUrl },
  });

const sendEmailChangeEmail = (toEmail, user, changeUrl,lang='ar') =>
  sendEmail({
    to: toEmail,
    subject: t(lang, 'EMAIL_SUBJECT_CHANGE_EMAIL'),
    template: lang === 'ar' ? 'changeEmail-ar' : 'changeEmail',
    variables: { name: user.name, changeUrl, newEmail: toEmail },
  });

const sendSecurityAlertEmail = (user, action, lang = 'ar') =>
  sendEmail({
    to: user.email,
    subject: t(lang, 'EMAIL_SUBJECT_SECURITY_ALERT', { action }),
    template: lang === 'ar' ? 'securityAlert-ar' : 'securityAlert',
    variables: {
      name: user.name,
      action,
      time: new Date().toUTCString(),
      lockHours: config.securityLockHours,
    },
  });

 const sendDeleteAccountEmail = (user, lang = 'ar') => {
  const isAr = lang === 'ar';

  const formattedDate = new Date().toLocaleString(
    isAr ? 'ar-EG' : 'en-US',
    {
      year: 'numeric',
      month: isAr ? 'long' : 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  return sendEmail({
    to: user.email,
    subject: t(lang, 'EMAIL_SUBJECT_DELETE_ACCOUNT'),
    template: isAr ? 'accountDeleted-ar' : 'accountDeleted',
    variables: {
      name: user.name,
      time: formattedDate,
    },
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeEmail,
  sendSecurityAlertEmail,
  sendDeleteAccountEmail,
};
