const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
const { config } = require('../config');
const { t } = require('../utils/i18n');
const  AppError  = require('../utils/appError');


const resend = new Resend(config.resendApiKey);


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
const sendEmail = async ({ to, subject, template, variables , lang }) => {
  const html = renderTemplate(template, variables);

  // console.log('🚀 Sending email...');
  // console.log('FROM:', config.email.from);
  // console.log('TO:', to);
  // console.log('KEY EXISTS:', !!config.resendApiKey);

  const { error , data } = await resend.emails.send({
    from: config.email.from,
    to,
    subject,
    html,
  });

  // console.log('RESEND DATA:', data);
  // console.log('RESEND ERROR:', error);
  
  if (error) {
    console.error('Error sending email:', error);
    throw new AppError(t(lang, 'EMAIL_SEND_FAILED'), 500, 'EMAIL_SEND_FAILED');
  }

  console.log(`📧 Email sent to ${to} — ${subject}`);
};

// ── Specific email senders ─────────────────────────────────

const sendVerificationEmail = (user, verificationUrl , lang= 'ar') =>
  sendEmail({
    to: user.email,
    subject: t(lang, 'EMAIL_SUBJECT_VERIFY'),
    template: lang === 'ar' ? 'emailVerification-ar' : 'emailVerification',
    variables: { name: user.name, verificationUrl },
    lang,
  });

const sendPasswordResetEmail = (user, resetUrl, lang = 'ar') =>
  sendEmail({
    to: user.email,
    subject: t(lang, 'EMAIL_SUBJECT_RESET'),
    template: lang === 'ar' ? 'passwordReset-ar' : 'passwordReset',
    variables: { name: user.name, resetUrl },
    lang,
  });

const sendEmailChangeEmail = (toEmail, user, changeUrl,lang='ar') =>
  sendEmail({
    to: toEmail,
    subject: t(lang, 'EMAIL_SUBJECT_CHANGE_EMAIL'),
    template: lang === 'ar' ? 'changeEmail-ar' : 'changeEmail',
    variables: { name: user.name, changeUrl, newEmail: toEmail },
    lang,
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
    lang,
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
    lang,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailChangeEmail,
  sendSecurityAlertEmail,
  sendDeleteAccountEmail,
};
