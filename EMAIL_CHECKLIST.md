# ✅ Email Implementation - Quick Start Checklist

## 🎯 Get Up and Running in 5 Minutes

Use this checklist to complete your email setup:

---

## ☐ Step 1: Gmail Configuration (2 min)

- [ ] Go to: https://myaccount.google.com/security
- [ ] Click "2-Step Verification" 
- [ ] Follow prompts to enable 2FA
- [ ] Go to: https://myaccount.google.com/apppasswords
- [ ] Select **Mail** and **Windows Computer**
- [ ] Google generates 16-character password
- [ ] Copy password (save in Notes app if needed)

---

## ☐ Step 2: Update `.env` File (1 min)

Open `.env` in your editor and add/update:

```env
# Email Provider
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=[paste-16-char-password-here]

# Report Recipients
REPORT_FROM=noreply@southwestinvestment.local
REPORT_TO=your-email@gmail.com
REPORT_TO_CC=optional-cc@gmail.com

# Scheduling (default times - you can customize)
REPORT_SCHEDULE=0 8 * * *
DELTA_CHECK_SCHEDULE=0 23 * * *
REPORT_TIMEZONE=America/Denver
```

**Save the file.**

---

## ☐ Step 3: Test Email Delivery (1 min)

```bash
npm run test:email
```

**Expected output:**
```
✅ TEST PASSED - EMAIL SENT SUCCESSFULLY
Email Details:
   To: your-email@gmail.com
   Provider: gmail
```

---

## ☐ Step 4: Verify Receipt (1 min)

- [ ] Check inbox for test email
- [ ] If not found, check **Spam/Junk** folder
- [ ] Review email styling and layout
- [ ] Click links to verify formatting
- [ ] ✅ Success if email looks good!

---

## 📋 Configuration Verified Checklist

- [ ] `.env` file updated with email credentials
- [ ] `EMAIL_PROVIDER=gmail` set
- [ ] `EMAIL_USER` has full email address
- [ ] `EMAIL_PASSWORD` is 16 characters
- [ ] `REPORT_TO` has your email
- [ ] `REPORT_TIMEZONE` matches your location
- [ ] `npm run test:email` completed successfully
- [ ] Test email received and reviewed

---

## 🎉 All Done!

Your email system is now configured and ready to use:

**✅ Automated emails will:**
- 📨 Send morning reports **daily at 8:00 AM**
- 🔄 Run nightly checks **daily at 11:00 PM**
- 💰 Alert on **price changes (5%+)**
- 📅 Alert on **DOM milestones (30/60/90/120/180)**

**✅ No more action needed** — emails send automatically once MLS APIs are connected.

---

## 🆘 Troubleshooting

**Email not arriving?**
```bash
npm run test:email
# Read error message carefully
```

**Gmail not working?**
1. Verify 2FA is enabled ✅
2. App password is 16 chars ✅
3. No spaces in PASSWORD field ✅
4. Check Spam/Junk folder 📨

**Need help?**
1. See EMAIL_SETUP.md (full guide)
2. Check EMAIL_QUICK_REFERENCE.md (cheat sheet)
3. Review logs/ directory for errors

---

## 📊 Optional Customizations

### Change Morning Report Time
Edit `.env`:
```env
REPORT_SCHEDULE=0 9 * * *    # 9:00 AM instead of 8:00 AM
REPORT_SCHEDULE=30 8 * * *   # 8:30 AM
REPORT_SCHEDULE=0 8 * * 1-5  # 8:00 AM Mon-Fri only
```

### Change Your Timezone
```env
REPORT_TIMEZONE=America/Phoenix      # Phoenix
REPORT_TIMEZONE=America/Los_Angeles  # LA
REPORT_TIMEZONE=UTC                  # UTC
```

### Add Multiple Recipients
```env
REPORT_TO=your-email@gmail.com
REPORT_TO_CC=partner@gmail.com,investor@gmail.com
```

### Switch Email Providers (Later)
See EMAIL_SETUP.md for Outlook, SendGrid, or custom SMTP setup.

---

## 📧 What Gets Emailed

### 🌅 Morning Report (8:00 AM)
- High Velocity properties (score 70+)
- Evaluate tier (score 40-69)
- Price alerts (5%+ drops)
- DOM milestones
- Connector status

### 🌙 Nightly Delta Check (11:00 PM)
- Quick status check
- Alert only if significant changes
- Runs Tier 2 silently

---

## 🔐 Security Reminders

✅ Keep `.env` file **private** (never commit to git)  
✅ Don't share app password over email  
✅ Rotate app passwords every 6 months  
✅ Never hardcode credentials in code  

```bash
# Verify .env is safe
git check-ignore .env
# Should output: .env
```

---

## 📚 Additional Resources

| File | Purpose |
|------|---------|
| EMAIL_SETUP.md | Complete setup guide (all providers) |
| EMAIL_QUICK_REFERENCE.md | Cheat sheet & common tasks |
| email-preview.html | Visual email preview |
| .env.example | Configuration template |

---

## 🚀 Next Steps (When APIs Arrive)

1. Implement MLXchange connector (Las Vegas)
2. Implement Flex Washington connector (St. George)
3. Implement Flex Iron connector (Cedar City)
4. Run `npm run prisma:migrate` to initialize database
5. Test Tier 1 pipeline with real listings
6. Email reports go live automatically!

---

## ✨ Features You Now Have

✅ **Beautiful HTML emails** with professional styling  
✅ **Automated daily scheduling** (no manual work)  
✅ **Multi-provider support** (Gmail, Outlook, SendGrid)  
✅ **Color-coded properties** (green, orange, red)  
✅ **Mobile-responsive** design  
✅ **Alert system** for urgent changes  
✅ **Comprehensive logging** for debugging  
✅ **Fully tested** and production-ready  

---

## 💬 Status

- **Email System:** ✅ READY
- **Scheduling:** ✅ READY  
- **Test Utility:** ✅ READY
- **Documentation:** ✅ COMPLETE
- **Next Blocker:** ⏳ MLS API Keys

**Timeline to production:** Once APIs arrive + ~2 days for integration

---

## 🎊 Congratulations!

You've successfully set up an enterprise-grade automated email reporting system. Your property flip analysis will now deliver curated opportunities directly to your inbox every morning! 

**Questions?** See EMAIL_SETUP.md or EMAIL_QUICK_REFERENCE.md

**Ready to test?** `npm run test:email`

---

**Completion Date:** ________  
**Tested By:** ________  
**Ready for Production:** ☐ YES

---

**Version:** 1.0.0 | **Status:** Production Ready | **Date:** May 8, 2026
