/**
 * Express Server Setup
 * Serves reports via HTTP and runs the daily scheduler in the background
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import path from 'path';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Southwest Investment Software',
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REPORT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/reports/latest
 * Returns latest report for all three markets
 */
app.get('/api/reports/latest', async (req: Request, res: Response) => {
  try {
    const markets = ['Las Vegas', 'St. George', 'Cedar City'];
    const reports: any = {};

    for (const market of markets) {
      const latest = await prisma.dailyMarketReport.findFirst({
        where: { market },
        orderBy: { reportDate: 'desc' },
      });

      if (latest) {
        reports[market] = {
          date: latest.reportDate,
          highVelocityCount: latest.highVelocityCount,
          evaluateCount: latest.evaluateCount,
          trackOnlyCount: latest.trackOnlyCount,
          reportUrl: `/api/reports/${market.toLowerCase().replace(' ', '-')}/latest`,
        };
      }
    }

    res.json({
      status: 'success',
      markets: reports,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/reports/:market/latest
 * Returns latest report for specific market (HTML or JSON)
 */
app.get('/api/reports/:market/latest', async (req: Request, res: Response) => {
  try {
    const marketMap: { [key: string]: string } = {
      'las-vegas': 'Las Vegas',
      'st-george': 'St. George',
      'cedar-city': 'Cedar City',
    };

    const market = marketMap[req.params.market.toLowerCase()];
    if (!market) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid market. Use: las-vegas, st-george, cedar-city',
      });
    }

    const report = await prisma.dailyMarketReport.findFirst({
      where: { market },
      orderBy: { reportDate: 'desc' },
    });

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: `No reports found for ${market}`,
      });
    }

    // Return HTML if requested
    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(report.htmlReport);
    } else if (req.query.format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(report.textReport);
    } else {
      // Return JSON metadata
      res.json({
        status: 'success',
        market,
        reportDate: report.reportDate,
        highVelocityCount: report.highVelocityCount,
        evaluateCount: report.evaluateCount,
        trackOnlyCount: report.trackOnlyCount,
        priceDropAlertCount: report.priceDropAlertCount,
        domMilestoneCount: report.domMilestoneCount,
        links: {
          html: `/api/reports/${req.params.market}/latest?format=html`,
          text: `/api/reports/${req.params.market}/latest?format=text`,
        },
        generatedAt: report.generatedAt,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/reports/:market/:date
 * Returns report for specific market and date
 */
app.get('/api/reports/:market/:date', async (req: Request, res: Response) => {
  try {
    const marketMap: { [key: string]: string } = {
      'las-vegas': 'Las Vegas',
      'st-george': 'St. George',
      'cedar-city': 'Cedar City',
    };

    const market = marketMap[req.params.market.toLowerCase()];
    if (!market) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid market. Use: las-vegas, st-george, cedar-city',
      });
    }

    // Parse date (YYYY-MM-DD)
    const reportDate = new Date(req.params.date);
    if (isNaN(reportDate.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const report = await prisma.dailyMarketReport.findUnique({
      where: {
        market_reportDate: {
          market,
          reportDate,
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: `No report found for ${market} on ${req.params.date}`,
      });
    }

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(report.htmlReport);
    } else if (req.query.format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(report.textReport);
    } else {
      res.json({
        status: 'success',
        market,
        reportDate: report.reportDate,
        highVelocityCount: report.highVelocityCount,
        evaluateCount: report.evaluateCount,
        trackOnlyCount: report.trackOnlyCount,
        generatedAt: report.generatedAt,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/reports/:market/history
 * Returns last N reports for a market
 */
app.get('/api/reports/:market/history', async (req: Request, res: Response) => {
  try {
    const marketMap: { [key: string]: string } = {
      'las-vegas': 'Las Vegas',
      'st-george': 'St. George',
      'cedar-city': 'Cedar City',
    };

    const market = marketMap[req.params.market.toLowerCase()];
    if (!market) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid market. Use: las-vegas, st-george, cedar-city',
      });
    }

    const days = parseInt(req.query.days as string) || 30;

    const reports = await prisma.dailyMarketReport.findMany({
      where: { market },
      orderBy: { reportDate: 'desc' },
      take: days,
      select: {
        reportDate: true,
        generatedAt: true,
        highVelocityCount: true,
        evaluateCount: true,
        trackOnlyCount: true,
      },
    });

    res.json({
      status: 'success',
      market,
      days,
      reportCount: reports.length,
      reports,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// STATUS ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const latestRun = await prisma.runLog.findFirst({
      orderBy: { startedAt: 'desc' },
    });

    res.json({
      status: 'operational',
      lastRun: {
        type: latestRun?.runType,
        startedAt: latestRun?.startedAt,
        completedAt: latestRun?.completedAt,
        durationMs: latestRun?.durationMs,
        newListingsCount: latestRun?.newListingsCount,
        errorCount: latestRun?.errorCount,
      },
      scheduler: {
        status: 'running',
        timezone: process.env.REPORT_TIMEZONE || 'UTC',
        schedule: process.env.REPORT_SCHEDULE || '0 8 * * *',
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 404 HANDLER
// ═══════════════════════════════════════════════════════════════════════════

app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path,
    availableEndpoints: [
      'GET /health',
      'GET /api/reports/latest',
      'GET /api/reports/:market/latest',
      'GET /api/reports/:market/:date',
      'GET /api/reports/:market/history?days=30',
      'GET /api/status',
    ],
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════

export async function startServer() {
  const port = process.env.PORT || 3000;

  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.log(`\n╔═══════════════════════════════════════════════════════╗`);
      console.log(`║  EXPRESS SERVER RUNNING                              ║`);
      console.log(`╚═══════════════════════════════════════════════════════╝\n`);
      console.log(`📡 Server listening on port ${port}`);
      console.log(`🌍 Base URL: http://localhost:${port}`);
      console.log(`\n📊 Available Endpoints:`);
      console.log(`   GET  /health`);
      console.log(`   GET  /api/reports/latest`);
      console.log(`   GET  /api/reports/las-vegas/latest`);
      console.log(`   GET  /api/reports/st-george/latest`);
      console.log(`   GET  /api/reports/cedar-city/latest`);
      console.log(`   GET  /api/reports/:market/history?days=30`);
      console.log(`   GET  /api/status\n`);
      console.log(`   Format: ?format=html or ?format=text\n`);
      resolve();
    });
  });
}

export { app, prisma };
