/**
 * Main Application Entry Point
 * Runs Express server AND daily report scheduler simultaneously
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { startServer } from './server';
import { ReportScheduler } from './services/report-scheduler';
import { PipelineOrchestratorService } from './services/pipeline-orchestrator';
import { MLXchangeConnector } from './connectors/mlxchange-connector';
import { FlexConnector } from './connectors/flex-connector';
import { validateConfig, logConfiguration } from './utils/config';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   SOUTHWEST INVESTMENT SOFTWARE                      ║');
  console.log('║   Automated Flip Finder & Cash Offer Engine          ║');
  console.log('║   WITH WEB REPORTING & DAILY SCHEDULER               ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Validate configuration
    const config = validateConfig();
    logConfiguration(config);
    console.log();

    // Initialize connectors
    console.log('🔗 Initializing MLS Connectors...\n');

    // MLS API endpoints (placeholder - will be replaced with actual endpoints)
    const MLXCHANGE_BASE_URL = process.env.MLXCHANGE_BASE_URL || 'https://api.mlxchange.com';
    const FLEX_BASE_URL = process.env.FLEX_BASE_URL || 'https://api.flexmls.com';

    const mlxchangeConnector = new MLXchangeConnector({
      market: 'Las Vegas',
      baseURL: MLXCHANGE_BASE_URL,
      apiKey: config.mlxchangeApiKey || '',
      savedSearchId: process.env.MLXCHANGE_SAVED_SEARCH_ID || '',
    });

    const flexWashingtonConnector = new FlexConnector({
      market: 'St. George',
      baseURL: FLEX_BASE_URL,
      apiKey: config.flexWashingtonApiKey || '',
      savedSearchId: process.env.FLEX_WASHINGTON_SAVED_SEARCH_ID || '',
    });

    const flexIronConnector = new FlexConnector({
      market: 'Cedar City',
      baseURL: FLEX_BASE_URL,
      apiKey: config.flexIronApiKey || '',
      savedSearchId: process.env.FLEX_IRON_SAVED_SEARCH_ID || '',
    });

    // Create pipeline for each market
    const markets = [
      {
        name: 'Las Vegas',
        connectors: [mlxchangeConnector],
      },
      {
        name: 'St. George',
        connectors: [flexWashingtonConnector],
      },
      {
        name: 'Cedar City',
        connectors: [flexIronConnector],
      },
    ];

    // Initialize scheduler
    console.log('📅 Initializing Report Scheduler...\n');

    const scheduler = new ReportScheduler({
      pipelineConfig: {
        prisma,
        connectors: [mlxchangeConnector, flexWashingtonConnector, flexIronConnector],
        market: 'All',
      },
    });

    // Register graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n\n📛 ${signal} received - shutting down gracefully...`);
      scheduler.stop();
      await prisma.$disconnect();
      console.log('✅ Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Start Express server
    await startServer();

    // Start scheduler (runs in background)
    scheduler.start();

    console.log('✅ Application fully initialized and running\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('RUNNING: Express Server + Daily Report Scheduler');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
