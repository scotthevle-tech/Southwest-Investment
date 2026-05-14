import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { startServer } from './server';
import { ReportScheduler } from './services/report-scheduler';
import { SparkConnector } from './connectors/spark-connector';
import { TrestleConnector } from './connectors/trestle-connector';
import { BaseConnector } from './connectors/base-connector';
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
    const config = validateConfig();
    logConfiguration(config);
    console.log();

    console.log('Initializing MLS Connectors...\n');

    const connectors: BaseConnector[] = [];

    // Las Vegas via Trestle
    if (config.trestleEnabled && config.trestleClientId) {
      try {
        const trestle = new TrestleConnector({
          market: 'Las Vegas',
          baseURL: 'https://api-trestle.corelogic.com/trestle/odata',
          clientId: config.trestleClientId,
          clientSecret: config.trestleClientSecret,
        });
        connectors.push(trestle);
        console.log('   [LV] Trestle connector initialized');
        if (!config.trestleClientSecret) {
          console.log('   [LV] WARNING: No API password set - auth will fail until TRESTLE_CLIENT_SECRET is configured');
        }
      } catch (error) {
        console.error('   [LV] Failed to init Trestle connector:', error instanceof Error ? error.message : error);
      }
    } else {
      console.log('   [LV] Trestle connector disabled');
    }

    // St. George via Spark
    if (config.sparkWashingtonEnabled && config.sparkWashingtonAccessToken) {
      try {
        const sparkWashington = new SparkConnector({
          market: 'St. George',
          baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
          accessToken: config.sparkWashingtonAccessToken,
          feedId: config.sparkWashingtonFeedId,
        });
        connectors.push(sparkWashington);
        console.log('   [SG] Spark/Washington connector initialized');
      } catch (error) {
        console.error('   [SG] Failed to init Spark connector:', error instanceof Error ? error.message : error);
      }
    } else {
      console.log('   [SG] Spark/Washington connector disabled');
    }

    // Cedar City via Spark
    if (config.sparkIronEnabled && config.sparkIronAccessToken) {
      try {
        const sparkIron = new SparkConnector({
          market: 'Cedar City',
          baseURL: 'https://replication.sparkapi.com/Version/3/Reso/OData',
          accessToken: config.sparkIronAccessToken,
          feedId: config.sparkIronFeedId,
        });
        connectors.push(sparkIron);
        console.log('   [CC] Spark/Iron connector initialized');
      } catch (error) {
        console.error('   [CC] Failed to init Spark connector:', error instanceof Error ? error.message : error);
      }
    } else {
      console.log('   [CC] Spark/Iron connector disabled');
    }

    console.log(`\n   Active connectors: ${connectors.length}/3\n`);

    // Initialize scheduler
    console.log('Initializing Report Scheduler...\n');

    const scheduler = new ReportScheduler({
      pipelineConfig: {
        prisma,
        connectors,
        market: 'All',
      },
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received - shutting down gracefully...`);
      scheduler.stop();
      await prisma.$disconnect();
      console.log('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    await startServer();
    scheduler.start();

    console.log('Application fully initialized and running\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('RUNNING: Express Server + Daily Report Scheduler');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Fatal Error:', error instanceof Error ? error.message : String(error));
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
