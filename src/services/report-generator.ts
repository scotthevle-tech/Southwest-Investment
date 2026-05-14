/**
 * Morning Report Generator
 * Generates the HTML/text morning report for Scott with momentum tracking
 */

import { Listing, MorningReport, RunLogEntry } from '../types';
import { PropertyScoreTrend } from './score-history-tracker';

export class MorningReportGeneratorService {
  /**
   * Generate HTML morning report with momentum tracking
   */
  generateHTML(report: MorningReport, trends?: PropertyScoreTrend[]): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Southwest Investment -- ${report.date} Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; max-width: 1400px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-left: 4px solid #3498db; padding-left: 15px; background: #ecf0f1; padding: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background-color: #3498db; color: white; padding: 12px; text-align: left; font-weight: bold; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:hover { background-color: #f5f5f5; }
    .score-high { color: #27ae60; font-weight: bold; }
    .score-medium { color: #f39c12; font-weight: bold; }
    .score-low { color: #e74c3c; font-weight: bold; }
    .trend-up { color: #27ae60; font-weight: bold; font-size: 18px; }
    .trend-down { color: #e74c3c; font-weight: bold; font-size: 18px; }
    .trend-stable { color: #95a5a6; font-weight: bold; font-size: 18px; }
    .delta-positive { color: #27ae60; }
    .delta-negative { color: #e74c3c; }
    .new-badge { background: #2ecc71; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 5px; }
    .persistent-badge { background: #e74c3c; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 5px; }
    .summary { background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .section-card { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .footer { margin-top: 40px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #bdc3c7; padding-top: 15px; }
  </style>
</head>
<body>
  <h1>Southwest Investment -- ${report.date}</h1>
  
  <div class="section-card">
    <h2>Summary</h2>
    <div class="summary">
      <p><strong>High Velocity Candidates:</strong> ${report.highVelocityCandidates.length}</p>
      <p><strong>Evaluate Candidates:</strong> ${report.evaluateCandidates.length}</p>
      <p><strong>Price Alerts:</strong> ${report.priceDropAlerts.length}</p>
      <p><strong>DOM Milestones:</strong> ${report.domMilestones.length}</p>
    </div>
  </div>

  ${trends ? this.generateMomentumSectionHTML(trends) : ''}

  ${trends ? this.generateCoreMetricsAnalysisHTML(trends) : ''}

  <div class="section-card">
    <h2>High Velocity Candidates (70+) - All Markets</h2>
    ${this.generatePropertiesHTML(report.highVelocityCandidates, 'high', trends)}
  </div>

  <div class="section-card">
    <h2>Worth Evaluating (40-69)</h2>
    ${this.generatePropertiesHTML(report.evaluateCandidates, 'medium', trends)}
  </div>

  <div class="section-card">
    <h2>Price Drop Alerts (>=5%)</h2>
    ${this.generatePriceAlertsHTML(report.priceDropAlerts)}
  </div>

  <div class="section-card">
    <h2>DOM Milestones (90/120/180 today)</h2>
    ${this.generateDOMAlertHTML(report.domMilestones)}
  </div>

  <div class="section-card">
    <h2>Connector Status</h2>
    ${this.generateConnectorStatusHTML(report.connectorStatus)}
  </div>

  <div class="footer">
    <p>Southwest Investment Software | Automated Flip Analysis with Momentum Tracking</p>
    <p>Report generated: ${new Date().toISOString()}</p>
    <p>Legend: ↑ Improving | ↓ Declining | → Stable | 🆕 New to List | 🔴 3+ Days Consecutive</p>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate plain text report with momentum
   */
  generateText(report: MorningReport, trends?: PropertyScoreTrend[]): string {
    let text = `
SOUTHWEST INVESTMENT -- ${report.date}
${'='.repeat(100)}

SUMMARY
${'-'.repeat(100)}
High Velocity Candidates: ${report.highVelocityCandidates.length}
Evaluate Candidates: ${report.evaluateCandidates.length}
Price Alerts: ${report.priceDropAlerts.length}
DOM Milestones: ${report.domMilestones.length}

`;

    if (trends) {
      text += this.generateMomentumSectionText(trends);
      text += '\n\n';
      text += this.generateCoreMetricsAnalysisText(trends);
      text += '\n\n';
    }

    text += `
HIGH VELOCITY CANDIDATES (70+)
${'-'.repeat(100)}
${this.generatePropertiesText(report.highVelocityCandidates, trends)}

EVALUATE CANDIDATES (40-69)
${'-'.repeat(100)}
${this.generatePropertiesText(report.evaluateCandidates, trends)}

PRICE DROP ALERTS (>=5%)
${'-'.repeat(100)}
${this.generatePriceAlertsText(report.priceDropAlerts)}

DOM MILESTONES (90/120/180 today)
${'-'.repeat(100)}
${this.generateDOMAlertText(report.domMilestones)}

CONNECTOR STATUS
${'-'.repeat(100)}
${this.generateConnectorStatusText(report.connectorStatus)}

`;
    return text;
  }

  private generateMomentumSectionHTML(trends: PropertyScoreTrend[]): string {
    const topMomentum = trends
      .filter(t => t.yesterday && t.scoreDelta > 0)
      .sort((a, b) => (b.scoreDelta || 0) - (a.scoreDelta || 0))
      .slice(0, 5);

    const newEntrants = trends.filter(t => t.isNewToList).slice(0, 5);
    const persistent = trends
      .filter(t => t.appearanceCount >= 3 && (t.trend === 'UP' || t.trend === 'STABLE'))
      .sort((a, b) => (b.appearanceCount || 0) - (a.appearanceCount || 0))
      .slice(0, 5);

    let html = '<div class="section-card"><h2>📈 Momentum & Trends</h2>';

    // Top Momentum
    if (topMomentum.length > 0) {
      html += '<h3>Top Gainers This Week</h3>';
      html += '<table>';
      html += '<tr><th>Address</th><th>Trend</th><th>Score Change</th><th>Days On List</th><th>7-Day History</th></tr>';
      for (const trend of topMomentum) {
        const trendIcon =
          trend.trend === 'UP' ? '↑' : trend.trend === 'DOWN' ? '↓' : '→';
        const trendClass = trend.trend === 'UP' ? 'trend-up' : trend.trend === 'DOWN' ? 'trend-down' : 'trend-stable';
        const deltaClass = (trend.scoreDelta || 0) > 0 ? 'delta-positive' : 'delta-negative';
        html += `<tr>`;
        html += `<td>${trend.address} (${trend.market})</td>`;
        html += `<td class="${trendClass}">${trendIcon}</td>`;
        html += `<td class="${deltaClass}">${trend.scoreDelta > 0 ? '+' : ''}${trend.scoreDelta}</td>`;
        html += `<td>${trend.appearanceCount} days</td>`;
        html += `<td>${trend.sevenDayHistory.join(' → ')}</td>`;
        html += '</tr>';
      }
      html += '</table>';
    }

    // New Entrants
    if (newEntrants.length > 0) {
      html += '<h3>🆕 New to High Velocity (70+)</h3>';
      html += '<table>';
      html += '<tr><th>Address</th><th>Market</th><th>Score</th><th>Price</th><th>DOM</th></tr>';
      for (const trend of newEntrants) {
        html += `<tr>`;
        html += `<td>${trend.address}</td>`;
        html += `<td>${trend.market}</td>`;
        html += `<td class="score-high">${trend.today.score}</td>`;
        html += `<td>$${(trend.today.listPrice || 0).toLocaleString()}</td>`;
        html += `<td>${trend.today.dom || 'N/A'}</td>`;
        html += '</tr>';
      }
      html += '</table>';
    }

    // Persistent High Performers
    if (persistent.length > 0) {
      html += '<h3>🔴 Persistent High Performers (3+ Days, Improving)</h3>';
      html += '<table>';
      html += '<tr><th>Address</th><th>Consecutive Days</th><th>Score</th><th>Trend</th></tr>';
      for (const trend of persistent) {
        const trendIcon =
          trend.trend === 'UP' ? '↑' : trend.trend === 'DOWN' ? '↓' : '→';
        const trendClass = trend.trend === 'UP' ? 'trend-up' : trend.trend === 'DOWN' ? 'trend-down' : 'trend-stable';
        html += `<tr>`;
        html += `<td>${trend.address}</td>`;
        html += `<td>${trend.appearanceCount} days</td>`;
        html += `<td class="score-high">${trend.today.score}</td>`;
        html += `<td class="${trendClass}">${trendIcon}</td>`;
        html += '</tr>';
      }
      html += '</table>';
    }

    html += '</div>';
    return html;
  }

  private generateCoreMetricsAnalysisHTML(trends: PropertyScoreTrend[]): string {
    let html = '<div class="section-card"><h2>🎯 Core Metrics Analysis (DOM | Price | Condition)</h2>';

    // DOM Acceleration Section
    const domAccelerators = trends
      .filter(t => t.domMetrics.trend === 'INCREASING')
      .sort((a, b) => (b.domMetrics.delta || 0) - (a.domMetrics.delta || 0))
      .slice(0, 8);

    if (domAccelerators.length > 0) {
      html += '<h3>📈 Increasing Days on Market (Longer DOM = Higher Motivation)</h3>';
      html += '<table style="font-size: 13px;">';
      html += '<tr><th>Address</th><th>Market</th><th>DOM Today</th><th>+DOM</th><th>Score</th><th>Price</th></tr>';
      for (const trend of domAccelerators) {
        html += `<tr style="background: ${trend.domMetrics.delta! > 7 ? '#ffe6e6' : '#fff4e6'};">`;
        html += `<td>${trend.address}</td>`;
        html += `<td>${trend.market}</td>`;
        html += `<td style="font-weight:bold;">${trend.domMetrics.dom}</td>`;
        html += `<td style="color: #e74c3c; font-weight: bold;">+${trend.domMetrics.delta}</td>`;
        html += `<td class="score-high">${trend.today.score}</td>`;
        html += `<td>$${(trend.priceMetrics.price || 0).toLocaleString()}</td>`;
        html += '</tr>';
      }
      html += '</table>';
    }

    // Price Drop Section
    const priceDroppers = trends
      .filter(t => t.priceMetrics.velocity && t.priceMetrics.velocity < 0)
      .sort((a, b) => (a.priceMetrics.velocity || 0) - (b.priceMetrics.velocity || 0))
      .slice(0, 8);

    if (priceDroppers.length > 0) {
      html += '<h3>💰 Price Drop Velocity (% per week - Most Aggressive)</h3>';
      html += '<table style="font-size: 13px;">';
      html += '<tr><th>Address</th><th>Market</th><th>Price Today</th><th>Drop/Week %</th><th>Days Since Drop</th><th>Accelerating?</th><th>Score</th></tr>';
      for (const trend of priceDroppers) {
        const accelClass = trend.priceMetrics.accelerating ? 'score-high' : '';
        const accelText = trend.priceMetrics.accelerating ? '⚠️ YES' : 'No';
        html += `<tr style="background: ${trend.priceMetrics.accelerating ? '#ffe6e6' : '#f5f5f5'};">`;
        html += `<td>${trend.address}</td>`;
        html += `<td>${trend.market}</td>`;
        html += `<td>$${(trend.priceMetrics.price || 0).toLocaleString()}</td>`;
        html += `<td style="color: #e74c3c; font-weight: bold;">${trend.priceMetrics.velocity?.toFixed(2)}%</td>`;
        html += `<td>${trend.priceMetrics.daysSinceDrop || 'None'}</td>`;
        html += `<td class="${accelClass}">${accelText}</td>`;
        html += `<td class="score-high">${trend.today.score}</td>`;
        html += '</tr>';
      }
      html += '</table>';
    }

    // Condition Deterioration Section
    const deteriorating = trends
      .filter(t => t.conditionMetrics.trend === 'DETERIORATING' || t.conditionMetrics.newFlags.length > 0)
      .sort((a, b) => (b.conditionMetrics.newFlags.length || 0) - (a.conditionMetrics.newFlags.length || 0))
      .slice(0, 8);

    if (deteriorating.length > 0) {
      html += '<h3>⚠️ Condition Deterioration (New Risk Flags)</h3>';
      html += '<table style="font-size: 13px;">';
      html += '<tr><th>Address</th><th>Market</th><th>Reno Score Δ</th><th>New Risk Flags</th><th>Total Risk Flags</th><th>Score</th></tr>';
      for (const trend of deteriorating) {
        const scoreClass = trend.conditionMetrics.scoreDelta && trend.conditionMetrics.scoreDelta < -10 ? 'score-low' : '';
        const flagsText = trend.conditionMetrics.newFlags.length > 0 
          ? trend.conditionMetrics.newFlags.slice(0, 2).join('; ') 
          : 'None new';
        html += `<tr style="background: ${trend.conditionMetrics.newFlags.length > 0 ? '#ffe6e6' : '#f5f5f5'};">`;
        html += `<td>${trend.address}</td>`;
        html += `<td>${trend.market}</td>`;
        html += `<td style="color: #e74c3c; font-weight: bold;">${trend.conditionMetrics.scoreDelta || 0}</td>`;
        html += `<td style="font-size: 11px; color: #e74c3c;">${flagsText}</td>`;
        html += `<td>${trend.conditionMetrics.riskFlagCount}</td>`;
        html += `<td class="score-high">${trend.today.score}</td>`;
        html += '</tr>';
      }
      html += '</table>';
    }

    if (domAccelerators.length === 0 && priceDroppers.length === 0 && deteriorating.length === 0) {
      html += '<p><em>No significant core metric changes today.</em></p>';
    }

    html += '</div>';
    return html;
  }

  private generateMomentumSectionText(trends: PropertyScoreTrend[]): string {
    const topMomentum = trends
      .filter(t => t.yesterday && t.scoreDelta > 0)
      .sort((a, b) => (b.scoreDelta || 0) - (a.scoreDelta || 0))
      .slice(0, 5);

    let text = `
MOMENTUM & TRENDS
${'-'.repeat(100)}

TOP GAINERS THIS WEEK
`;
    for (const trend of topMomentum) {
      const trendIcon = trend.trend === 'UP' ? '↑' : trend.trend === 'DOWN' ? '↓' : '→';
      text += `\n${trend.address} (${trend.market})`;
      text += `\n  Trend: ${trendIcon} | Score Change: ${trend.scoreDelta > 0 ? '+' : ''}${trend.scoreDelta} | Days on List: ${trend.appearanceCount}`;
      text += `\n  7-Day: ${trend.sevenDayHistory.join(' → ')}\n`;
    }

    return text + '\n';
  }

  private generateCoreMetricsAnalysisText(trends: PropertyScoreTrend[]): string {
    let text = `
CORE METRICS ANALYSIS - DOM | PRICE | CONDITION
${'-'.repeat(100)}

1. DAYS ON MARKET ACCELERATION
`;
    const domAccelerators = trends
      .filter(t => t.domMetrics.trend === 'INCREASING')
      .sort((a, b) => (b.domMetrics.delta || 0) - (a.domMetrics.delta || 0))
      .slice(0, 5);

    if (domAccelerators.length > 0) {
      for (const trend of domAccelerators) {
        text += `\n${trend.address} (${trend.market})`;
        text += `\n  DOM: ${trend.domMetrics.dom} days (+${trend.domMetrics.delta} from yesterday)`;
        text += `\n  Score: ${trend.today.score}\n`;
      }
    } else {
      text += '\nNo properties with increasing DOM.\n';
    }

    text += `
2. PRICE DROP VELOCITY
${'-'.repeat(100)}
`;
    const priceDroppers = trends
      .filter(t => t.priceMetrics.velocity && t.priceMetrics.velocity < 0)
      .sort((a, b) => (a.priceMetrics.velocity || 0) - (b.priceMetrics.velocity || 0))
      .slice(0, 5);

    if (priceDroppers.length > 0) {
      for (const trend of priceDroppers) {
        text += `\n${trend.address} (${trend.market})`;
        text += `\n  Price: $${(trend.priceMetrics.price || 0).toLocaleString()}`;
        text += `\n  Weekly Velocity: ${trend.priceMetrics.velocity?.toFixed(2)}%`;
        text += `\n  Days Since Drop: ${trend.priceMetrics.daysSinceDrop || 'None'}`;
        text += `\n  Accelerating: ${trend.priceMetrics.accelerating ? 'YES ⚠️' : 'No'}`;
        text += `\n  Score: ${trend.today.score}\n`;
      }
    } else {
      text += '\nNo properties with price drops.\n';
    }

    text += `
3. CONDITION DETERIORATION
${'-'.repeat(100)}
`;
    const deteriorating = trends
      .filter(t => t.conditionMetrics.trend === 'DETERIORATING' || t.conditionMetrics.newFlags.length > 0)
      .slice(0, 5);

    if (deteriorating.length > 0) {
      for (const trend of deteriorating) {
        text += `\n${trend.address} (${trend.market})`;
        text += `\n  Reno Score Change: ${trend.conditionMetrics.scoreDelta || 0}`;
        text += `\n  New Risk Flags: ${trend.conditionMetrics.newFlags.join(', ') || 'None'}`;
        text += `\n  Total Risk Flags: ${trend.conditionMetrics.riskFlagCount}`;
        text += `\n  Score: ${trend.today.score}\n`;
      }
    } else {
      text += '\nNo properties with condition deterioration.\n';
    }

    return text;
  }

  private generatePropertiesHTML(listings: Listing[], tier: 'high' | 'medium' | 'low', trends?: PropertyScoreTrend[]): string {
    if (listings.length === 0) {
      return '<p><em>No properties in this tier.</em></p>';
    }

    let html = '<table><tr>';
    html += '<th>Address</th><th>Market</th><th>Price</th><th>Flip Velocity</th><th>Trend</th><th>DOM</th><th>ARV</th>';
    html += '</tr>';

    // Create lookup for trends
    const trendMap = new Map(trends?.map(t => [t.listingId, t]) || []);

    for (const listing of listings) {
      const trend = trendMap.get(listing.id);
      const scoreClass =
        listing.flipVelocityScore! >= 70 ? 'score-high' : listing.flipVelocityScore! >= 40 ? 'score-medium' : 'score-low';

      let trendIcon = '';
      let trendClass = '';
      let badges = '';

      if (trend) {
        if (trend.trend === 'UP') {
          trendIcon = '↑';
          trendClass = 'trend-up';
        } else if (trend.trend === 'DOWN') {
          trendIcon = '↓';
          trendClass = 'trend-down';
        } else {
          trendIcon = '→';
          trendClass = 'trend-stable';
        }
        if (trend.isNewToList) badges += ' <span class="new-badge">NEW</span>';
        if (trend.appearanceCount >= 3) badges += ' <span class="persistent-badge">3+ DAYS</span>';
      }

      html += `<tr>`;
      html += `<td>${listing.address}${listing.zipCode ? ` (${listing.zipCode})` : ''}${badges}</td>`;
      html += `<td>${listing.market}</td>`;
      html += `<td>$${listing.listPrice.toLocaleString()}</td>`;
      html += `<td class="${scoreClass}">${listing.flipVelocityScore}</td>`;
      html += `<td class="${trendClass}">${trendIcon}</td>`;
      html += `<td>${listing.dom || 'N/A'}</td>`;
      html += `<td>$${listing.modelARV?.toLocaleString() || 'TBD'}</td>`;
      html += '</tr>';
    }

    html += '</table>';
    return html;
  }

  private generatePropertiesText(listings: Listing[], trends?: PropertyScoreTrend[]): string {
    if (listings.length === 0) {
      return 'No properties in this tier.\n';
    }

    const trendMap = new Map(trends?.map(t => [t.listingId, t]) || []);
    let text = '';

    for (const listing of listings) {
      const trend = trendMap.get(listing.id);
      const trendIcon =
        trend?.trend === 'UP' ? '↑' : trend?.trend === 'DOWN' ? '↓' : '→';
      const badges = (trend?.isNewToList ? '[NEW] ' : '') + (trend?.appearanceCount! >= 3 ? '[3+ DAYS] ' : '');

      text += `\n${listing.address} ${badges}\n`;
      text += `  Market: ${listing.market}\n`;
      text += `  Price: $${listing.listPrice.toLocaleString()}\n`;
      text += `  Flip Velocity Score: ${listing.flipVelocityScore} ${trendIcon}\n`;
      text += `  DOM: ${listing.dom || 'N/A'}\n`;
      text += `  Est. ARV: $${listing.modelARV?.toLocaleString() || 'TBD'}\n`;

      if (trend) {
        text += `  Score History: ${trend.sevenDayHistory.join(' → ')}\n`;
      }
    }
    return text;
  }

  private generatePriceAlertsHTML(alerts: MorningReport['priceDropAlerts']): string {
    if (alerts.length === 0) {
      return '<p><em>No price alerts.</em></p>';
    }

    let html = '<table><tr>';
    html += '<th>Address</th><th>Old Price</th><th>New Price</th><th>Drop %</th><th>Score Impact</th>';
    html += '</tr>';

    for (const alert of alerts) {
      const dropPct = alert.dropPct.toFixed(1);
      html += `<tr>`;
      html += `<td>${alert.listing.address}</td>`;
      html += `<td>$${alert.previousPrice.toLocaleString()}</td>`;
      html += `<td>$${alert.newPrice.toLocaleString()}</td>`;
      html += `<td class="${alert.dropPct >= 5 ? 'score-high' : 'score-medium'}">${dropPct}%</td>`;
      html += `<td>${alert.dropPct >= 5 ? 'May improve score' : 'Monitor'}</td>`;
      html += '</tr>';
    }

    html += '</table>';
    return html;
  }

  private generatePriceAlertsText(alerts: MorningReport['priceDropAlerts']): string {
    if (alerts.length === 0) {
      return 'No price alerts.\n';
    }

    let text = '';
    for (const alert of alerts) {
      text += `\n${alert.listing.address}\n`;
      text += `  Old: $${alert.previousPrice.toLocaleString()} → New: $${alert.newPrice.toLocaleString()}\n`;
      text += `  Drop: ${alert.dropPct.toFixed(1)}%\n`;
    }
    return text;
  }

  private generateDOMAlertHTML(listings: Listing[]): string {
    if (listings.length === 0) {
      return '<p><em>No DOM milestones today.</em></p>';
    }

    let html = '<ul>';
    for (const listing of listings) {
      html += `<li><strong>${listing.address}</strong> - ${listing.dom} DOM (${listing.market})</li>`;
    }
    html += '</ul>';
    return html;
  }

  private generateDOMAlertText(listings: Listing[]): string {
    if (listings.length === 0) {
      return 'No DOM milestones today.\n';
    }

    let text = '';
    for (const listing of listings) {
      text += `${listing.address} - ${listing.dom} DOM (${listing.market})\n`;
    }
    return text;
  }

  private generateConnectorStatusHTML(status: Record<string, string>): string {
    let html = '<table><tr><th>Connector</th><th>Status</th></tr>';
    for (const [connector, stat] of Object.entries(status)) {
      const statusClass = stat.includes('✓') ? 'score-high' : 'score-low';
      html += `<tr><td>${connector}</td><td class="${statusClass}">${stat}</td></tr>`;
    }
    html += '</table>';
    return html;
  }

  private generateConnectorStatusText(status: Record<string, string>): string {
    let text = '';
    for (const [connector, stat] of Object.entries(status)) {
      text += `${connector}: ${stat}\n`;
    }
    return text;
  }
}

