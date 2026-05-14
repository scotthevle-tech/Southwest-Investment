import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { MLXchangeConnector } from './connectors/mlxchange-connector';
import { FlexConnector } from './connectors/flex-connector';
import { validateConfig, logConfiguration, ValidatedConfig } from './utils/config';

dotenv.config();

// Validate configuration first
let config: ValidatedConfig;
try {
  config = validateConfig();
} catch (error) {
  console.error('❌ Configuration Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const prisma = new PrismaClient();

/**
 * Graceful shutdown handler
 * Ensures database connections are closed properly
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n📛 ${signal} received - shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   SOUTHWEST INVESTMENT SOFTWARE                          ║');
  console.log('║   Automated Flip Finder & Cash Offer Engine              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Log validated configuration
  logConfiguration(config);
  console.log();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('QUICK START');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. TEST SCORING ALGORITHMS (no APIs required):');
  console.log('   npm run test:scoring\n');

  console.log('2. INITIALIZE DATABASE:');
  console.log('   npm run prisma:migrate\n');

  console.log('3. VIEW DATABASE SCHEMA:');
  console.log('   npm run prisma:studio\n');

  console.log('4. CONFIGURE ENVIRONMENT:');
  console.log('   Copy .env.example to .env');
  console.log('   Fill in MLS API keys (MLXchange, Flex Washington, Flex Iron)');
  console.log('   Fill in Anthropic API key\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('NEXT STEPS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('When you have API keys:');
  console.log('1. Update .env with real endpoints and API keys');
  console.log('2. Implement connector API methods in src/connectors/');
  console.log('3. Build pipeline-orchestrator Tier 1/2/3 runner');
  console.log('4. Set up email scheduling (Nodemailer + node-cron)\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('ARCHITECTURE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Flip Velocity Score Formula:');
  console.log('  score = (opportunity × 0.40) + (zipAbsorption × 0.30)');
  console.log('        + (renoScope × 0.20) + (buyerPool × 0.10)\n');

  console.log('Thresholds:');
  console.log('  70-100:  High Velocity   (ready to analyze)');
  console.log('  40-69:   Evaluate        (manual review needed)');
  console.log('  0-39:    Track Only      (watching market)\n');

  console.log('Markets:');
  console.log('  • Las Vegas (Clark Co., NV)       — MLXchange API');
  console.log('  • St. George (Washington Co., UT) — Flex API');
  console.log('  • Cedar City (Iron Co., UT)       — Flex API\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('PROJECT FILES');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📄 Documentation:');
  console.log('   README.md                      — Full guide');
  console.log('   SETUP.md                       — Implementation checklist');
  console.log('   .github/copilot-instructions.md — Dev guidelines\n');

  console.log('🔧 Core Services:');
  console.log('   src/analyzer/                  — Scoring algorithms (6 modules)');
  console.log('   src/connectors/                — MLS data source framework');
  console.log('   src/services/                  — Business logic (pipeline, alerts)');
  console.log('   src/config/                    — Markets, thresholds, keywords\n');

  console.log('💾 Database:');
  console.log('   prisma/schema.prisma           — 8-table schema');
  console.log('   Run: npm run prisma:migrate\n');

  console.log('🧪 Testing:');
  console.log('   src/tests/scoring-test-runner.ts   — Full algorithm validation');
  console.log('   src/utils/test-fixtures.ts         — Sample data\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('STATUS: Ready for API Integration');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
