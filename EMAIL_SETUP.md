# Email Configuration Guide

This guide walks you through setting up email delivery for daily morning reports using Nodemailer.

## Quick Start

### 1. Update `.env` with Your Email Configuration

Add these variables to your `.env` file:

```env
# ─────────────────────────────────────────────────────────────
# EMAIL CONFIGURATION (Nodemailer)
# ─────────────────────────────────────────────────────────────

# SMTP Provider: gmail | outlook | sendgrid | custom
EMAIL_PROVIDER=gmail

# Gmail Setup (if using Gmail)
# 1. Enable 2FA on your Google Account: https://myaccount.google.com/security
# 2. Generate App Password: https://myaccount.google.com/apppasswords
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password

# Outlook Setup (if using Outlook)
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-outlook-password

# SendGrid Setup (if using SendGrid)
# 1. Create account: https://sendgrid.com
# 2. Create API key with Mail Send permissions
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Custom SMTP (for other providers)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_TLS=true

# Email Report Settings
REPORT_FROM=noreply@southwestinvestment.local
REPORT_TO=your-email@gmail.com
REPORT_TO_CC=optional-cc@gmail.com
REPORT_SUBJECT=Daily Property Analysis - Southwest Investment

# Timezone for scheduling (use TZ database name)
# Examples: America/Denver, America/Phoenix, UTC
REPORT_TIMEZONE=America/Denver

# Cron schedule for morning report (default: 8:00 AM)
# Format: "0 8 * * *" = every day at 8:00 AM
REPORT_SCHEDULE=0 8 * * *

# Cron schedule for nightly delta check (default: 11:00 PM)
DELTA_CHECK_SCHEDULE=0 23 * * *
```

---

## Provider-Specific Setup

### 🔵 Gmail (Recommended for Testing)

**Pros:** Free, reliable, easy setup  
**Cons:** Lower send limits (limited for production volume)

**Steps:**

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow prompts

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character password
   - Copy this to `EMAIL_PASSWORD` in `.env`

3. **Test Configuration**
   ```bash
   npm run test:email
   ```

### 🔷 Outlook/Office 365

**Pros:** Enterprise-ready, good sending limits  
**Cons:** Requires Office 365 subscription

**SMTP Settings:**
```
SMTP_HOST: smtp-mail.outlook.com
SMTP_PORT: 587
SMTP_TLS: true
SMTP_USER: your-email@company.com
SMTP_PASSWORD: your-password
```

### 📧 SendGrid (Best for Production)

**Pros:** Highest reliability, great deliverability, $0-$400+/mo pricing  
**Cons:** Requires API key management

**Steps:**

1. Create account: https://sendgrid.com
2. Go to Settings → API Keys
3. Create key with "Mail Send" permission
4. Copy to `SENDGRID_API_KEY` in `.env`

**Configuration:**
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
REPORT_FROM=noreply@your-domain.com
REPORT_TO=you@example.com
```

### 🔧 Custom SMTP (AWS SES, Mailgun, etc.)

For any SMTP provider:

```env
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASSWORD=password
SMTP_TLS=true
REPORT_FROM=sender@your-domain.com
REPORT_TO=your-email@gmail.com
```

---

## Implementation in Code

### Using EmailTemplateService

```typescript
import { EmailTemplateService, EmailTemplateData } from './email-template';
import nodemailer from 'nodemailer';

// 1. Create template data
const emailData: EmailTemplateData = {
  date: new Date().toLocaleString(),
  highVelocityCount: 3,
  evaluateCount: 5,
  priceAlerts: [
    {
      propertyAddress: '1234 Peaceful St, Las Vegas NV 89102',
      alertType: 'PRICE_DROP',
      value: 'Price dropped $15,000 (3.6%) to $420,000',
    },
  ],
  domAlerts: [
    {
      propertyAddress: '5678 Oak Ave, Las Vegas NV 89109',
      alertType: 'DOM_MILESTONE',
      value: 'Hit 90-day milestone on market',
    },
  ],
  highVelocityProperties: [
    {
      address: '1234 Peaceful St',
      market: 'Las Vegas',
      flipVelocityScore: 78,
      flipVelocityLevel: 'High Velocity',
      arv: '$420,135',
      listPrice: '$285,000',
      renoScope: 'LOW',
    },
  ],
  evaluateProperties: [],
  connectorStatus: [
    {
      market: 'Las Vegas (MLXchange)',
      status: 'healthy',
      lastRun: '2026-05-08 23:15 UTC',
    },
    {
      market: 'St. George (Flex)',
      status: 'healthy',
      lastRun: '2026-05-08 23:18 UTC',
    },
    {
      market: 'Cedar City (Flex Iron)',
      status: 'pending',
      message: 'Awaiting API key configuration',
    },
  ],
};

// 2. Generate HTML and text versions
const htmlContent = EmailTemplateService.generateHTML(emailData);
const textContent = EmailTemplateService.generateText(emailData);

// 3. Send email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_TLS === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

await transporter.sendMail({
  from: process.env.REPORT_FROM,
  to: process.env.REPORT_TO,
  cc: process.env.REPORT_TO_CC,
  subject: process.env.REPORT_SUBJECT,
  html: htmlContent,
  text: textContent,
});
```

---

## Testing Email Delivery

### Test Command
```bash
npm run test:email
```

This sends a test email with sample data to validate your configuration.

### Manual Test in Node REPL
```bash
node
> const nodemailer = require('nodemailer');
> const transport = nodemailer.createTransport({ ... });
> transport.verify((err, success) => console.log(err || 'Ready'));
> .exit
```

---

## Scheduling with node-cron

### Configuration in `.env`

```env
# Morning report (daily at 8:00 AM)
REPORT_SCHEDULE=0 8 * * *

# Nightly delta check (daily at 11:00 PM)
DELTA_CHECK_SCHEDULE=0 23 * * *

# Timezone (important!)
REPORT_TIMEZONE=America/Denver
```

### Cron Format Cheatsheet

```
┌───────────── second (0-59, optional)
│ ┌───────────── minute (0 - 59)
│ │ ┌───────────── hour (0 - 23)
│ │ │ ┌───────────── day of month (1 - 31)
│ │ │ │ ┌───────────── month (0 - 11, or JAN-DEC)
│ │ │ │ │ ┌───────────── day of week (0 - 7, or SUN-SAT)
│ │ │ │ │ │
│ │ │ │ │ │
* * * * * *
```

**Examples:**
- `0 8 * * *` = Every day at 8:00 AM
- `0 8 * * 1-5` = Monday-Friday at 8:00 AM
- `0 8,14 * * *` = Every day at 8:00 AM and 2:00 PM
- `0 */2 * * *` = Every 2 hours
- `30 9 * * 0` = Every Sunday at 9:30 AM

---

## Troubleshooting

### Email Not Sending?

**Check 1: Verify environment variables**
```bash
npm run env:verify
```

**Check 2: Test SMTP connection**
```bash
node -e "
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});
t.verify((err) => console.log(err ? 'ERROR: ' + err : 'Connected!'));
"
```

**Check 3: Review logs**
```bash
tail -f logs/email.log
```

### Gmail Not Working?

- [ ] Verify app password is 16 characters
- [ ] Check that 2FA is enabled on account
- [ ] Try from different IP address (Gmail blocks unfamiliar locations)
- [ ] Check Gmail security alerts: https://myaccount.google.com/security

### Outlook Not Working?

- [ ] Verify SMTP settings (smtp-mail.outlook.com:587)
- [ ] Check that TLS is enabled
- [ ] If using Office 365, enable "Allow less secure apps"

### Emails Going to Spam?

Set up SPF/DKIM records:

1. **SPF Record** (add to DNS)
   ```
   v=spf1 include:sendgrid.net ~all
   ```

2. **DKIM** (for SendGrid)
   - Follow SendGrid documentation to add public key to DNS

3. **Reply-To Header**
   ```
   Reply-To: your-email@gmail.com
   ```

---

## Email Preview

The template generates:
- ✅ Beautiful responsive HTML (works on mobile)
- ✅ Plain text fallback for email clients without HTML support
- ✅ Color-coded sections (green=High Velocity, orange=Evaluate, red=Alerts)
- ✅ Data tables with sorting hints
- ✅ Status indicators for each MLS connector
- ✅ Footer with usage disclaimers

**Sample sections:**
```
📊 SUMMARY
  High Velocity Opportunities: 3
  Evaluate Tier: 5
  Price Alerts: 2
  DOM Alerts: 1

⭐ HIGH VELOCITY OPPORTUNITIES
  [Table with address, score, ARV, list price]

💰 PRICE ALERTS
  [Alert for property with 3.6% price drop]

📅 DOM MILESTONES
  [Alert for property hitting 90-day mark]

⚙️  DATA SOURCE STATUS
  ✅ Las Vegas (MLXchange): Healthy
  ✅ St. George (Flex): Healthy
  ⏳ Cedar City: Pending (API key awaited)
```

---

## Next Steps

1. **Configure email provider** (Gmail recommended for testing)
2. **Update `.env`** with credentials
3. **Run test:** `npm run test:email`
4. **Verify receipt** in your inbox
5. **When ready for production:** Switch to SendGrid or AWS SES
6. **Set up scheduling** via node-cron (daily @ 8 AM)

---

## Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP Relay](https://sendgrid.com/docs/for-developers/sending-email/smtp-relay/)
- [cron Format](https://crontab.guru/)

