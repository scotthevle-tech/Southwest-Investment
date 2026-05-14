/**
 * Email Service Test & Verification
 * Run: npm run test:email
 */

import { EmailService } from '../services/email-service';
import { EmailTemplateData } from '../services/email-template';

async function runEmailTest(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  SOUTHWEST INVESTMENT - EMAIL SERVICE TEST            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize service
    console.log('Step 1: Initializing Email Service...');
    const emailService = new EmailService();
    const status = emailService.getStatus();

    console.log(`  ✓ Provider: ${status.provider}`);
    console.log(`  ✓ From: ${status.fromAddress}`);
    console.log(`  ✓ To: ${status.toAddress}`);
    if (status.ccAddress) {
      console.log(`  ✓ CC: ${status.ccAddress}`);
    }
    console.log('');

    // Verify connection
    console.log('Step 2: Verifying SMTP Connection...');
    const isConnected = await emailService.verifyConnection();

    if (!isConnected) {
      console.error('\n❌ SMTP connection verification failed');
      console.error('   Please check your email configuration in .env');
      console.error('   See EMAIL_SETUP.md for troubleshooting');
      process.exit(1);
    }
    console.log('');

    // Prepare test data
    console.log('Step 3: Preparing Test Report Data...');
    const testData: EmailTemplateData = {
      date: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      }),
      highVelocityCount: 2,
      evaluateCount: 4,
      priceAlerts: [
        {
          propertyAddress: '1234 Peaceful St, Las Vegas NV 89102',
          alertType: 'PRICE_DROP',
          value: 'Price dropped $20,000 (4.8%) from $420,000 to $400,000',
        },
        {
          propertyAddress: '456 Dream Lane, St. George UT 84790',
          alertType: 'LARGE_DROP_5_PLUS',
          value: 'SIGNIFICANT price reduction: -$32,500 (7.2%) — now $420,875',
        },
      ],
      domAlerts: [
        {
          propertyAddress: '789 Market Ave, Las Vegas NV 89109',
          alertType: 'DOM_MILESTONE',
          value: 'Reached 90 days on market — time-sensitive opportunity',
        },
        {
          propertyAddress: '999 Equity Blvd, Cedar City UT 84720',
          alertType: 'DOM_MILESTONE',
          value: 'Reactivated after failed contract — Back to Active status',
        },
      ],
      highVelocityProperties: [
        {
          mlsNumber: '2345678',
          address: '1234 Peaceful St',
          market: 'Las Vegas',
          flipVelocityScore: 78,
          flipVelocityLevel: 'High Velocity',
          arv: '$420,135',
          listPrice: '$285,000',
          maxOffer: '$274,095',
          estimatedRehab: '$20,000',
          potentialProfit: '$72,621',
          spreadPct: '47.4%',
          renoScope: 'LOW',
        },
        {
          mlsNumber: '3456789',
          address: '456 Dream Lane',
          market: 'St. George',
          flipVelocityScore: 72,
          flipVelocityLevel: 'High Velocity',
          arv: '$476,910',
          listPrice: '$298,500',
          maxOffer: '$313,837',
          estimatedRehab: '$19,800',
          potentialProfit: '$105,419',
          spreadPct: '59.7%',
          renoScope: 'LOW',
        },
      ],
      evaluateProperties: [
        {
          mlsNumber: '4567890',
          address: '789 Market Ave',
          market: 'Las Vegas',
          flipVelocityScore: 64,
          flipVelocityLevel: 'Evaluate',
          arv: '$385,420',
          listPrice: '$265,000',
          maxOffer: '$229,794',
          estimatedRehab: '$40,000',
          potentialProfit: '$34,378',
          spreadPct: '45.4%',
          renoScope: 'MEDIUM',
        },
        {
          mlsNumber: '5678901',
          address: '999 Equity Blvd',
          market: 'Cedar City',
          flipVelocityScore: 58,
          flipVelocityLevel: 'Evaluate',
          arv: '$317,940',
          listPrice: '$198,000',
          maxOffer: '$162,558',
          estimatedRehab: '$60,000',
          potentialProfit: '$16,146',
          spreadPct: '60.6%',
          renoScope: 'HIGH',
        },
        {
          mlsNumber: '6789012',
          address: '321 Modern Home',
          market: 'Las Vegas',
          flipVelocityScore: 52,
          flipVelocityLevel: 'Evaluate',
          arv: '$395,000',
          listPrice: '$289,900',
          maxOffer: '$236,500',
          estimatedRehab: '$40,000',
          potentialProfit: '$17,600',
          spreadPct: '36.3%',
          renoScope: 'MEDIUM',
        },
        {
          mlsNumber: '7890123',
          address: '654 Opportunity Way',
          market: 'St. George',
          flipVelocityScore: 48,
          flipVelocityLevel: 'Evaluate',
          arv: '$421,000',
          listPrice: '$305,000',
          maxOffer: '$234,700',
          estimatedRehab: '$60,000',
          potentialProfit: '-$2,600',
          spreadPct: '38.0%',
          renoScope: 'HIGH',
        },
      ],
      connectorStatus: [
        {
          market: 'Las Vegas (MLXchange)',
          status: 'healthy',
          lastRun: new Date(Date.now() - 15 * 60000).toLocaleTimeString(),
          message: 'Latest pull: 47 active listings',
        },
        {
          market: 'St. George (Flex Washington)',
          status: 'healthy',
          lastRun: new Date(Date.now() - 12 * 60000).toLocaleTimeString(),
          message: 'Latest pull: 18 active listings',
        },
        {
          market: 'Cedar City (Flex Iron)',
          status: 'pending',
          message: 'Awaiting API key configuration',
        },
      ],
    };

    console.log('  ✓ High Velocity Properties: 2');
    console.log('  ✓ Evaluate Tier Properties: 4');
    console.log('  ✓ Price Alerts: 2');
    console.log('  ✓ DOM Alerts: 2');
    console.log('');

    // Send test email
    console.log('Step 4: Sending Test Email...');
    const sent = await emailService.sendMorningReport(testData);

    if (!sent) {
      console.error('\n❌ Failed to send test email');
      console.error('   Check logs/ directory for details');
      process.exit(1);
    }
    console.log('');

    // Success summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ✅ TEST PASSED - EMAIL SENT SUCCESSFULLY              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📧 Email Details:');
    console.log(`   To: ${status.toAddress}`);
    if (status.ccAddress) {
      console.log(`   CC: ${status.ccAddress}`);
    }
    console.log(`   Provider: ${status.provider}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Check your inbox for the test email');
    console.log('   2. Review the styling and layout');
    console.log('   3. If not received, check spam/junk folder');
    console.log('   4. See EMAIL_SETUP.md for troubleshooting');
    console.log('\n✅ Your email service is ready for production use!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED\n');
    console.error('Error:', error);
    console.error('\n📖 For help, see EMAIL_SETUP.md\n');
    process.exit(1);
  }
}

// Run test
runEmailTest().catch(console.error);
