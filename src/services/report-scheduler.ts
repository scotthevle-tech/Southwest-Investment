/**
 * Report Scheduler Service
 * Handles automated daily morning reports and nightly delta checks using node-cron
 * 
 * Usage:
 *   const scheduler = new ReportScheduler();
 *   scheduler.start();  // Starts both morning report and delta check jobs
 */

import cron from 'node-cron';
import { EmailService, getEmailService } from './email-service';
import { EmailTemplateData, PropertyRow } from './email-template';
import { PipelineOrchestratorService, PipelineConfig } from './pipeline-orchestrator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReportScheduler {
  private morningReportTask: cron.ScheduledTask | null = null;
  private deltaCheckTask: cron.ScheduledTask | null = null;
  private weeklyRefreshTask: cron.ScheduledTask | null = null;
  private emailService: EmailService;
  private pipeline: PipelineOrchestratorService | null = null;
  private isRunning: boolean = false;
  private pipelineConfig: PipelineConfig | null = null;

  constructor(config?: { pipelineConfig?: PipelineConfig }) {
    try {
      this.emailService = getEmailService();
      this.pipelineConfig = config?.pipelineConfig || null;
      
      if (this.pipelineConfig) {
        this.pipeline = new PipelineOrchestratorService(this.pipelineConfig);
      } else {
        console.warn('⚠️  Pipeline configuration not provided. Scheduler will run but pipeline features disabled.');
      }
    } catch (error) {
      console.error('❌ ReportScheduler initialization error:', error);
      throw new Error(`Failed to initialize ReportScheduler: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    const reportSchedule = process.env.REPORT_SCHEDULE || '0 8 * * *';
    const deltaSchedule = process.env.DELTA_CHECK_SCHEDULE || '0 23 * * *';
    const timezone = process.env.REPORT_TIMEZONE || 'UTC';

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  REPORT SCHEDULER STARTING                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Morning Report Task
    console.log(`📅 Morning Report Schedule: ${reportSchedule}`);
    console.log(`   Timezone: ${timezone}`);
    this.morningReportTask = cron.schedule(
      reportSchedule,
      () => this.runMorningReport(),
      { timezone }
    );
    console.log('   ✓ Scheduled\n');

    // Nightly Delta Check Task
    console.log(`📅 Nightly Delta Check Schedule: ${deltaSchedule}`);
    console.log(`   Timezone: ${timezone}`);
    this.deltaCheckTask = cron.schedule(
      deltaSchedule,
      () => this.runDeltaCheck(),
      { timezone }
    );
    console.log('   ✓ Scheduled\n');

    // Weekly Sunday Refresh (re-score all 40+ listings with fresh comps)
    const weeklySchedule = process.env.WEEKLY_REFRESH_SCHEDULE || '0 23 * * 0';
    console.log(`📅 Weekly Refresh Schedule: ${weeklySchedule}`);
    console.log(`   Timezone: ${timezone}`);
    this.weeklyRefreshTask = cron.schedule(
      weeklySchedule,
      () => this.runWeeklyRefresh(),
      { timezone }
    );
    console.log('   ✓ Scheduled\n');

    this.isRunning = true;
    console.log('All scheduled tasks are active\n');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (this.morningReportTask) this.morningReportTask.stop();
    if (this.deltaCheckTask) this.deltaCheckTask.stop();
    if (this.weeklyRefreshTask) this.weeklyRefreshTask.stop();

    this.isRunning = false;
    console.log('Scheduler stopped');
  }

  /**
   * Run morning report immediately (for testing)
   */
  async runMorningReportNow(): Promise<void> {
    console.log('\n⏰ Running morning report NOW...');
    await this.runMorningReport();
  }

  /**
   * Run delta check immediately (for testing)
   */
  async runDeltaCheckNow(): Promise<void> {
    console.log('\n⏰ Running delta check NOW...');
    await this.runDeltaCheck();
  }

  /**
   * Execute morning report (internal)
   */
  private async runMorningReport(): Promise<void> {
    const timestamp = new Date().toLocaleString();
    console.log(`\n[${timestamp}] 📨 Morning Report Starting...`);

    if (!this.pipeline) {
      console.error('❌ Pipeline not initialized. Skipping morning report.');
      return;
    }

    try {
      const stats = await this.pipeline.runTier1NewListings();

      const formatPrice = (n: number | null) => n ? `$${n.toLocaleString()}` : 'N/A';

      const toPropertyRow = (l: any): PropertyRow => ({
        mlsNumber: l.mlsNumber,
        address: `${l.address}, ${l.city} ${l.zipCode || ''}`,
        market: l.market,
        flipVelocityScore: l.flipVelocityScore || 0,
        flipVelocityLevel: l.flipVelocityLevel || 'Track Only',
        arv: formatPrice(l.modelARV),
        listPrice: formatPrice(l.listPrice),
        maxOffer: formatPrice(l.maxOffer),
        estimatedRehab: formatPrice(l.estimatedRehab),
        potentialProfit: formatPrice(l.potentialProfit),
        spreadPct: `${l.spreadToARVPct || 0}%`,
        renoScope: `${l.renoScopeScore || 0} (${l.renoRiskLevel || 'N/A'})`,
      });

      const highVelocity = await prisma.listing.findMany({
        where: { flipVelocityLevel: 'High Velocity', isActive: true },
        orderBy: { flipVelocityScore: 'desc' },
        take: 25,
      });

      const evaluate = await prisma.listing.findMany({
        where: { flipVelocityLevel: 'Evaluate', isActive: true },
        orderBy: { flipVelocityScore: 'desc' },
        take: 15,
      });

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentPriceAlerts = await prisma.priceAlert.findMany({
        where: { sentAt: { gte: yesterday } },
        include: { listing: true },
        take: 20,
      });
      const recentDOMAlerts = await prisma.dOMAlert.findMany({
        where: { sentAt: { gte: yesterday } },
        include: { listing: true },
        take: 20,
      });

      const emailData: EmailTemplateData = {
        date: timestamp,
        highVelocityCount: highVelocity.length,
        evaluateCount: evaluate.length,
        priceAlerts: recentPriceAlerts.map(a => ({
          propertyAddress: `${a.listing.address}, ${a.listing.city}`,
          alertType: a.alertType,
          value: `$${a.previousPrice.toLocaleString()} → $${a.newPrice.toLocaleString()} (${a.dropPct.toFixed(1)}%)`,
        })),
        domAlerts: recentDOMAlerts.map(a => ({
          propertyAddress: `${a.listing.address}, ${a.listing.city}`,
          alertType: a.alertType,
          value: a.alertType === 'FAILED_CONTRACT_REACTIVATED' ? 'Back to Active' : `${a.domMilestone} days`,
        })),
        highVelocityProperties: highVelocity.map(toPropertyRow),
        evaluateProperties: evaluate.map(toPropertyRow),
        connectorStatus: [
          { market: 'Las Vegas (Trestle)', status: 'pending' as const },
          { market: 'St. George (Spark)', status: 'healthy' as const },
          { market: 'Cedar City (Spark)', status: 'healthy' as const },
        ],
      };

      // Send email
      const sent = await this.emailService.sendMorningReport(emailData);

      if (sent) {
        console.log(`✅ Morning report sent successfully`);
        console.log(`   New Listings Processed: ${stats.newListingsCount}`);
        console.log(`   Updated Listings: ${stats.updatedListingsCount}`);
        console.log(`   Price Alerts: ${stats.priceAlertsCount}`);
        console.log(`   DOM Alerts: ${stats.domAlertsCount}`);
      } else {
        console.error('❌ Failed to send morning report');
      }
    } catch (error) {
      console.error('❌ Morning report error:', error);
      try {
        await this.emailService.sendAlertEmail(
          'MORNING REPORT FAILED',
          'The morning property analysis failed to complete',
          { error: error instanceof Error ? error.message : String(error) }
        );
      } catch (emailError) {
        console.error('❌ Failed to send error alert:', emailError);
      }
    }
  }

  /**
   * Execute delta check (internal)
   */
  private async runDeltaCheck(): Promise<void> {
    const timestamp = new Date().toLocaleString();
    console.log(`\n[${timestamp}] 🔄 Nightly Delta Check Starting...`);

    if (!this.pipeline) {
      console.error('❌ Pipeline not initialized. Skipping delta check.');
      return;
    }

    try {
      // Run Tier 2 delta check
      const stats = await this.pipeline.runTier2DeltaCheck();

      if (stats.priceAlertsCount > 0 || stats.domAlertsCount > 0) {
        const totalAlerts = stats.priceAlertsCount + stats.domAlertsCount;
        console.log(`✅ Delta check complete: ${totalAlerts} alerts triggered`);

        // Send alert email if significant activity
        if (totalAlerts >= 5) {
          await this.emailService.sendAlertEmail(
            'PRICE/DOM ALERTS',
            `${totalAlerts} property changes detected during nightly check`,
            { 
              priceAlerts: stats.priceAlertsCount,
              domAlerts: stats.domAlertsCount 
            }
          );
        }
      } else {
        console.log('✅ Delta check complete: No changes detected');
      }
    } catch (error) {
      console.error('❌ Delta check error:', error);
      try {
        await this.emailService.sendAlertEmail(
          'DELTA CHECK FAILED',
          'The nightly property check encountered an error',
          { error: error instanceof Error ? error.message : String(error) }
        );
      } catch (emailError) {
        console.error('❌ Failed to send error alert:', emailError);
      }
    }
  }

  /**
   * Execute weekly refresh (internal)
   */
  private async runWeeklyRefresh(): Promise<void> {
    const timestamp = new Date().toLocaleString();
    console.log(`\n[${timestamp}] Weekly Refresh Starting...`);

    if (!this.pipeline) {
      console.error('Pipeline not initialized. Skipping weekly refresh.');
      return;
    }

    try {
      const stats = await this.pipeline.runWeeklyRefresh();
      console.log(`Weekly refresh complete. Re-scored: ${stats.updatedListingsCount}, Errors: ${stats.errorCount}`);
    } catch (error) {
      console.error('Weekly refresh error:', error);
      try {
        await this.emailService.sendAlertEmail(
          'WEEKLY REFRESH FAILED',
          'The Sunday weekly refresh failed to complete',
          { error: error instanceof Error ? error.message : String(error) }
        );
      } catch (emailError) {
        console.error('Failed to send error alert:', emailError);
      }
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    morningReportTask: boolean;
    deltaCheckTask: boolean;
    nextDates?: { morningReport: Date; deltaCheck: Date };
  } {
    return {
      isRunning: this.isRunning,
      morningReportTask: !!this.morningReportTask,
      deltaCheckTask: !!this.deltaCheckTask,
      nextDates: this.morningReportTask && this.deltaCheckTask ? {
        morningReport: new Date(Date.now() + 24 * 60 * 60 * 1000), // Approximate next run
        deltaCheck: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } : undefined,
    };
  }
}

/**
 * Singleton instance
 */
let scheduler: ReportScheduler | null = null;

export function getScheduler(): ReportScheduler {
  if (!scheduler) {
    scheduler = new ReportScheduler();
  }
  return scheduler;
}
