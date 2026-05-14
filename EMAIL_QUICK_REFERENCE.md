# 📧 Email & Scheduling Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies (Already Done)
```bash
npm install nodemailer node-cron
```

### 2. Update `.env`
```bash
# Copy example and update
cp .env.example .env

# Edit with your Gmail credentials:
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
REPORT_TO=your-email@gmail.com
```

### 3. Test Email Delivery
```bash
npm run test:email
```

### 4. That's It! 🎉
- Morning reports send automatically at **8:00 AM daily**
- Nightly delta checks run at **11:00 PM daily**
- Both schedules are **configurable in `.env`**

---

## 📋 Email Template Features

### What Gets Sent
✅ **High Velocity Properties** (70+) — Your best flip candidates  
✅ **Evaluate Tier** (40-69) — Worth looking at  
✅ **Price Alerts** (5%+ drops, especially 5%+)  
✅ **DOM Alerts** (30/60/90/120/180 day milestones)  
✅ **Connector Status** (which MLS data sources are working)  

### Design Features
- 🎨 Beautiful gradient header with branding
- 📊 Color-coded stat boxes (green, orange, red)
- 📱 Fully responsive (works on mobile)
- 🔗 HTML + plain text versions
- 📌 Professional typography
- ✨ Hover effects on tables
- 🏷️ Status indicators for each connector

---

## ⚙️ Configuration Reference

### Email Providers

#### **Gmail** (Recommended for Testing)
```env
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```
Get app password: https://myaccount.google.com/apppasswords

#### **Outlook**
```env
EMAIL_PROVIDER=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### **SendGrid** (Best for Production)
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

#### **Custom SMTP** (AWS SES, Mailgun, etc.)
```env
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASSWORD=password
SMTP_TLS=true
```

### Scheduling

```env
# Morning report time (cron format)
REPORT_SCHEDULE=0 8 * * *         # 8:00 AM daily
# Alternative: 30 9 * * 1-5       # 9:30 AM Mon-Fri only

# Delta check time (cron format)
DELTA_CHECK_SCHEDULE=0 23 * * *   # 11:00 PM daily

# Your timezone (important!)
REPORT_TIMEZONE=America/Denver
# Or: America/Phoenix, America/Los_Angeles, UTC, etc.
```

### Cron Format Explained

```
0 8 * * *
│ │ │ │ │
│ │ │ │ └─ Day of Week (0=Sun, 1=Mon, ... 6=Sat)
│ │ │ └─── Month (1-12 or JAN-DEC)
│ │ └───── Day of Month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

**Common Schedules:**
- `0 8 * * *` — Every day at 8:00 AM
- `0 8 * * 1-5` — Monday-Friday at 8:00 AM
- `30 8,14 * * *` — 8:30 AM and 2:30 PM daily
- `0 */6 * * *` — Every 6 hours
- `0 9 1 * *` — First day of month at 9:00 AM

See: https://crontab.guru/

---

## 🛠️ Common Tasks

### Send Test Email
```bash
npm run test:email
```

### Check Email Configuration
```bash
node -e "
const { EmailService } = require('./dist/services/email-service');
const service = new EmailService();
console.log(service.getStatus());
"
```

### Manual Email (from Code)
```typescript
import { getEmailService } from './src/services/email-service';
import { EmailTemplateData } from './src/services/email-template';

const emailService = getEmailService();

const data: EmailTemplateData = {
  date: new Date().toLocaleString(),
  highVelocityCount: 3,
  evaluateCount: 5,
  priceAlerts: [],
  domAlerts: [],
  highVelocityProperties: [],
  evaluateProperties: [],
  connectorStatus: [],
};

await emailService.sendMorningReport(data);
```

### Check Logs
```bash
# Last 50 lines
tail -50 logs/email.log

# Follow in real-time
tail -f logs/email.log

# Count successful sends
grep "SENT" logs/email.log | wc -l
```

### Start Scheduler (in Application)
```typescript
import { getScheduler } from './src/services/report-scheduler';

const scheduler = getScheduler();
scheduler.start();

// Check status anytime
console.log(scheduler.getStatus());

// Manual runs
scheduler.runMorningReportNow();
scheduler.runDeltaCheckNow();

// Stop when done
scheduler.stop();
```

---

## 📞 Troubleshooting

### Email Not Arriving?

**Step 1: Check Configuration**
```bash
# Verify .env has all required fields
grep "^EMAIL" .env
grep "^REPORT" .env
```

**Step 2: Test SMTP Connection**
```bash
npm run test:email
```

**Step 3: Check Logs**
```bash
tail -20 logs/email.log
```

**Step 4: Gmail Specific**
- ✅ 2FA enabled? https://myaccount.google.com/security
- ✅ App password is 16 chars? https://myaccount.google.com/apppasswords
- ✅ Check Gmail security alerts: https://myaccount.google.com/security-checkup
- ✅ Try from different IP? (Gmail blocks suspicious locations)
- ✅ Check spam folder first

**Step 5: Outlook Specific**
- ✅ SMTP Host: smtp-mail.outlook.com
- ✅ Port: 587
- ✅ TLS: true
- ✅ Try "Allow less secure apps" setting

### Email Looks Wrong?

- Check in different email client (Gmail web vs Outlook app vs mobile)
- Click "Show original" to see raw headers
- Test in browser: save HTML to file, open in Chrome
- Check for special characters in address that need escaping

### Scheduler Not Running?

```bash
# Check if running in background
ps aux | grep node

# Verify cron schedule is valid
npm run test:scheduler

# Check system timezone
date

# Force timezone in .env
REPORT_TIMEZONE=America/Denver
```

---

## 📧 Email Template Customization

### Change Colors

Edit `src/services/email-template.ts`:

```css
/* Change header gradient */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Try: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); */
}

/* Change accent color */
.score-high {
  background-color: #d1fae5;  /* Green */
  color: #065f46;
}
```

### Change Logo/Branding

```html
<!-- In header section, change this: -->
<h1>🏠 Southwest Investment</h1>
<!-- To this: -->
<h1>🏠 Your Company Name</h1>
```

### Add Custom Sections

```typescript
// In EmailTemplateService.generateHTML(), add new section:
${customData ? `
<div class="section">
  <div class="section-header">
    <div class="section-icon" style="background-color: #8b5cf6;">📌</div>
    <h2 class="section-title">Custom Section</h2>
  </div>
  <!-- Your content here -->
</div>
` : ''}
```

---

## 🔐 Security Best Practices

### ✅ DO
- Store credentials in `.env` (never in code)
- Use app passwords, not main password
- Enable 2FA on email account
- Rotate API keys periodically
- Use SMTP TLS encryption
- Set restrictive file permissions on `.env`

### ❌ DON'T
- Hardcode email credentials in source
- Share `.env` file via email/chat
- Use personal password for SMTP
- Disable TLS/encryption
- Log sensitive data
- Leave credentials in git history

### Git Safety
```bash
# Ensure .env is ignored
echo ".env" >> .gitignore
echo "*.log" >> .gitignore

# Check git won't accidentally commit secrets
git check-ignore .env    # Should print: .env

# If already committed, remove
git rm --cached .env
git commit -m "Remove .env from tracking"
```

---

## 📊 Example Output

### What You'll Receive Each Morning

```
📧 From: noreply@southwestinvestment.local
To: your-email@gmail.com
Subject: Daily Property Analysis - Southwest Investment

┌─────────────────────────────────────────────────────────┐
│ ⭐ HIGH VELOCITY OPPORTUNITIES: 3                      │
├─────────────────────────────────────────────────────────┤
│ 1234 Peaceful St, Las Vegas NV 89102                    │
│ Score: 78 (High Velocity) | ARV: $420,135 | Risk: LOW │
│                                                         │
│ 456 Dream Lane, St. George UT 84790                     │
│ Score: 72 (High Velocity) | ARV: $476,910 | Risk: LOW │
└─────────────────────────────────────────────────────────┘

📊 SUMMARY
  • High Velocity Properties: 3
  • Evaluate Tier: 5
  • Price Alerts: 2
  • DOM Alerts: 1

💰 PRICE ALERTS
  ► 1234 Peaceful St — Price dropped $20K (4.8%)
  ► 456 Dream Lane — Major drop $32.5K (7.2%)

📅 DOM MILESTONES
  ► 789 Market Ave — Hit 90-day mark

⚙️  DATA CONNECTORS
  ✅ Las Vegas (MLXchange) — Healthy, 47 listings
  ✅ St. George (Flex) — Healthy, 18 listings
  ⏳ Cedar City (Flex Iron) — Pending
```

---

## 🎯 Next Steps

1. ✅ **Update `.env`** with email credentials
2. ✅ **Run `npm run test:email`** to verify setup
3. ✅ **Check inbox** for test email
4. ✅ **Configure cron schedule** if needed (defaults work!)
5. ✅ **Start application** — emails send automatically
6. 📧 **Enjoy daily reports** at 8 AM + nightly updates

---

## 📚 Additional Resources

- [Nodemailer Docs](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SendGrid SMTP](https://sendgrid.com/docs/for-developers/sending-email/smtp-relay/)
- [Cron Format Tool](https://crontab.guru/)
- [Node-Cron Docs](https://www.npmjs.com/package/node-cron)
- [Timezone List](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

---

## 💬 Support

**Email not working?**
1. Check EMAIL_SETUP.md for detailed provider configuration
2. Run npm run test:email for diagnostics
3. Check logs/email.log for error details
4. See Troubleshooting section above

**Want to customize the email?**
1. Edit src/services/email-template.ts for styling
2. Modify EmailTemplateData interface for new fields
3. Update email-service.ts to pass new data

**Need different schedule?**
1. Edit REPORT_SCHEDULE in .env
2. Use crontab.guru to validate format
3. Change REPORT_TIMEZONE if needed

---

**Last Updated:** May 8, 2026  
**Version:** 1.0.0 (Initial Release)

