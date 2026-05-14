/**
 * Professional Email Template for Morning Reports
 * Generates beautiful, responsive HTML emails for property flip analysis
 */

export interface EmailTemplateData {
  date: string;
  highVelocityCount: number;
  evaluateCount: number;
  priceAlerts: AlertItem[];
  domAlerts: AlertItem[];
  highVelocityProperties: PropertyRow[];
  evaluateProperties: PropertyRow[];
  connectorStatus: ConnectorStatusItem[];
}

export interface AlertItem {
  propertyAddress: string;
  alertType: string;
  value: string;
}

export interface PropertyRow {
  mlsNumber: string;
  address: string;
  market: string;
  flipVelocityScore: number;
  flipVelocityLevel: string;
  arv: string;
  listPrice: string;
  renoScope: string;
}

export interface ConnectorStatusItem {
  market: string;
  status: 'healthy' | 'error' | 'pending';
  lastRun?: string;
  message?: string;
}

export class EmailTemplateService {
  /**
   * Generate complete HTML email with professional styling
   */
  static generateHTML(data: EmailTemplateData): string {
    const { 
      date, 
      highVelocityCount, 
      evaluateCount, 
      priceAlerts, 
      domAlerts,
      highVelocityProperties,
      evaluateProperties,
      connectorStatus 
    } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Southwest Investment - Daily Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background-color: #f7f9fc;
            color: #1a1a1a;
            line-height: 1.6;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        /* Header Section */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 40px 30px;
            text-align: center;
            border-bottom: 4px solid #764ba2;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 5px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        
        .header p {
            font-size: 14px;
            opacity: 0.95;
            margin: 0;
        }
        
        /* Summary Stats */
        .stats-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background-color: #f7f9fc;
            border-bottom: 1px solid #e0e6f2;
        }
        
        .stat-box {
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            text-align: center;
        }
        
        .stat-box.high-velocity {
            border-left-color: #10b981;
        }
        
        .stat-box.evaluate {
            border-left-color: #f59e0b;
        }
        
        .stat-box.alerts {
            border-left-color: #ef4444;
        }
        
        .stat-number {
            font-size: 36px;
            font-weight: 700;
            color: #667eea;
            margin: 10px 0;
        }
        
        .stat-box.high-velocity .stat-number {
            color: #10b981;
        }
        
        .stat-box.evaluate .stat-number {
            color: #f59e0b;
        }
        
        .stat-box.alerts .stat-number {
            color: #ef4444;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        
        /* Section Headers */
        .section {
            padding: 30px;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e0e6f2;
        }
        
        .section-icon {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            margin-right: 12px;
            color: #ffffff;
            font-weight: bold;
        }
        
        .section-icon.high {
            background-color: #10b981;
        }
        
        .section-icon.evaluate {
            background-color: #f59e0b;
        }
        
        .section-icon.alert {
            background-color: #ef4444;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0;
        }
        
        /* Tables */
        .table-wrapper {
            overflow-x: auto;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background-color: #ffffff;
        }
        
        thead {
            background-color: #f3f4f6;
            border-bottom: 2px solid #e0e6f2;
        }
        
        th {
            padding: 12px 15px;
            text-align: left;
            font-size: 12px;
            font-weight: 700;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 14px 15px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 14px;
            color: #1a1a1a;
        }
        
        tbody tr:hover {
            background-color: #fafbfc;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
        }
        
        /* Score Badges */
        .score-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-align: center;
            min-width: 50px;
        }
        
        .score-high {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .score-evaluate {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .score-track {
            background-color: #fee2e2;
            color: #7f1d1d;
        }
        
        /* Alerts Section */
        .alert-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .alert-item {
            padding: 12px;
            margin-bottom: 10px;
            background-color: #fff7ed;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .alert-item.price {
            background-color: #fee2e2;
            border-left-color: #ef4444;
        }
        
        .alert-address {
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 4px;
        }
        
        .alert-detail {
            color: #6b7280;
            font-size: 13px;
        }
        
        /* Connector Status */
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
        }
        
        .status-item {
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #e0e6f2;
            background-color: #f9fafb;
        }
        
        .status-item.healthy {
            border-left-color: #10b981;
            background-color: #ecfdf5;
        }
        
        .status-item.error {
            border-left-color: #ef4444;
            background-color: #fef2f2;
        }
        
        .status-item.pending {
            border-left-color: #f59e0b;
            background-color: #fffbeb;
        }
        
        .status-market {
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 6px;
            font-size: 14px;
        }
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 6px;
            vertical-align: middle;
        }
        
        .status-healthy .status-indicator {
            background-color: #10b981;
        }
        
        .status-error .status-indicator {
            background-color: #ef4444;
        }
        
        .status-pending .status-indicator {
            background-color: #f59e0b;
        }
        
        .status-text {
            font-size: 13px;
            color: #6b7280;
        }
        
        /* Footer */
        .footer {
            background-color: #f9fafb;
            padding: 20px 30px;
            border-top: 1px solid #e0e6f2;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        
        .footer-divider {
            height: 1px;
            background-color: #e0e6f2;
            margin: 15px 0;
        }
        
        /* Empty State */
        .empty-state {
            padding: 30px;
            text-align: center;
            color: #9ca3af;
            background-color: #f9fafb;
            border-radius: 6px;
            margin: 20px 0;
        }
        
        .empty-icon {
            font-size: 40px;
            margin-bottom: 10px;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
            .header {
                padding: 30px 20px;
            }
            
            .section {
                padding: 20px;
            }
            
            .stats-container {
                grid-template-columns: 1fr;
                gap: 15px;
                padding: 20px;
            }
            
            th, td {
                padding: 10px 8px;
                font-size: 13px;
            }
            
            .section-title {
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🏠 Southwest Investment</h1>
            <p>Daily Property Flip Analysis Report</p>
            <p style="font-size: 13px; margin-top: 8px;">Generated: ${date}</p>
        </div>
        
        <!-- Summary Stats -->
        <div class="stats-container">
            <div class="stat-box high-velocity">
                <div class="stat-label">High Velocity</div>
                <div class="stat-number">${highVelocityCount}</div>
                <div class="stat-label">Ready to Deep Dive</div>
            </div>
            <div class="stat-box evaluate">
                <div class="stat-label">Evaluate</div>
                <div class="stat-number">${evaluateCount}</div>
                <div class="stat-label">Worth Reviewing</div>
            </div>
            <div class="stat-box alerts">
                <div class="stat-label">Alerts</div>
                <div class="stat-number">${(priceAlerts?.length || 0) + (domAlerts?.length || 0)}</div>
                <div class="stat-label">Price & DOM Changes</div>
            </div>
        </div>
        
        <!-- High Velocity Properties -->
        ${highVelocityProperties && highVelocityProperties.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <div class="section-icon high">⭐</div>
                <h2 class="section-title">High Velocity Opportunities</h2>
            </div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>MLS #</th>
                            <th>Address</th>
                            <th>Market</th>
                            <th>Score</th>
                            <th>ARV</th>
                            <th>List Price</th>
                            <th>Reno Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${highVelocityProperties.map(prop => `
                        <tr>
                            <td style="font-family: monospace; font-size: 13px;">${prop.mlsNumber}</td>
                            <td><strong>${prop.address}</strong></td>
                            <td>${prop.market}</td>
                            <td><span class="score-badge score-high">${prop.flipVelocityScore}</span></td>
                            <td>${prop.arv}</td>
                            <td>${prop.listPrice}</td>
                            <td><span class="score-badge score-high">${prop.renoScope}</span></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}
        
        <!-- Evaluate Properties -->
        ${evaluateProperties && evaluateProperties.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <div class="section-icon evaluate">📋</div>
                <h2 class="section-title">Evaluate Tier</h2>
            </div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>MLS #</th>
                            <th>Address</th>
                            <th>Market</th>
                            <th>Score</th>
                            <th>ARV</th>
                            <th>List Price</th>
                            <th>Reno Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${evaluateProperties.map(prop => `
                        <tr>
                            <td style="font-family: monospace; font-size: 13px;">${prop.mlsNumber}</td>
                            <td><strong>${prop.address}</strong></td>
                            <td>${prop.market}</td>
                            <td><span class="score-badge score-evaluate">${prop.flipVelocityScore}</span></td>
                            <td>${prop.arv}</td>
                            <td>${prop.listPrice}</td>
                            <td><span class="score-badge score-evaluate">${prop.renoScope}</span></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        ` : ''}
        
        <!-- Price Alerts -->
        ${priceAlerts && priceAlerts.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <div class="section-icon alert">💰</div>
                <h2 class="section-title">Price Alerts</h2>
            </div>
            <ul class="alert-list">
                ${priceAlerts.map(alert => `
                <li class="alert-item price">
                    <div class="alert-address">${alert.propertyAddress}</div>
                    <div class="alert-detail">${alert.value}</div>
                </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
        
        <!-- DOM Alerts -->
        ${domAlerts && domAlerts.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <div class="section-icon alert">📅</div>
                <h2 class="section-title">Days on Market Milestones</h2>
            </div>
            <ul class="alert-list">
                ${domAlerts.map(alert => `
                <li class="alert-item">
                    <div class="alert-address">${alert.propertyAddress}</div>
                    <div class="alert-detail">${alert.value}</div>
                </li>
                `).join('')}
            </ul>
        </div>
        ` : ''}
        
        <!-- Connector Status -->
        <div class="section">
            <div class="section-header">
                <div class="section-icon" style="background-color: #6366f1;">⚙️</div>
                <h2 class="section-title">Data Source Status</h2>
            </div>
            <div class="status-grid">
                ${connectorStatus && connectorStatus.length > 0 ? connectorStatus.map(status => `
                <div class="status-item status-${status.status}">
                    <div class="status-market">
                        <span class="status-indicator"></span>
                        ${status.market}
                    </div>
                    <div class="status-text">
                        ${status.status === 'healthy' ? '✅ Healthy' : status.status === 'error' ? '❌ Error' : '⏳ Pending'}
                        ${status.lastRun ? `<br/><small>Last: ${status.lastRun}</small>` : ''}
                    </div>
                    ${status.message ? `<div class="status-text" style="margin-top: 6px; font-size: 12px;">${status.message}</div>` : ''}
                </div>
                `).join('') : ''}
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <strong>Southwest Investment Software</strong>
            <div class="footer-divider"></div>
            <p>Automated property flip analysis for Southern Utah & Nevada markets</p>
            <p style="margin-top: 10px; color: #9ca3af;">Las Vegas • St. George • Cedar City</p>
            <p style="margin-top: 10px; font-size: 11px; color: #d1d5db;">
                This is an automated report. Do your own due diligence before making investment decisions.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text version for email fallback
   */
  static generateText(data: EmailTemplateData): string {
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('SOUTHWEST INVESTMENT - DAILY PROPERTY FLIP ANALYSIS');
    lines.push(`Generated: ${data.date}`);
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    
    // Stats Summary
    lines.push('SUMMARY');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push(`High Velocity Opportunities:   ${data.highVelocityCount}`);
    lines.push(`Evaluate Tier:                 ${data.evaluateCount}`);
    lines.push(`Total Alerts (Price + DOM):    ${(data.priceAlerts?.length || 0) + (data.domAlerts?.length || 0)}`);
    lines.push('');
    
    // High Velocity Properties
    if (data.highVelocityProperties && data.highVelocityProperties.length > 0) {
      lines.push('⭐ HIGH VELOCITY OPPORTUNITIES');
      lines.push('───────────────────────────────────────────────────────────────');
      data.highVelocityProperties.forEach(prop => {
        lines.push(`  ${prop.address}`);
        lines.push(`    MLS #:        ${prop.mlsNumber}`);
        lines.push(`    Market:       ${prop.market}`);
        lines.push(`    Score:        ${prop.flipVelocityScore} (${prop.flipVelocityLevel})`);
        lines.push(`    ARV:          ${prop.arv}`);
        lines.push(`    List Price:   ${prop.listPrice}`);
        lines.push(`    Reno Risk:    ${prop.renoScope}`);
        lines.push('');
      });
    }
    
    // Evaluate Properties
    if (data.evaluateProperties && data.evaluateProperties.length > 0) {
      lines.push('📋 EVALUATE TIER');
      lines.push('───────────────────────────────────────────────────────────────');
      data.evaluateProperties.forEach(prop => {
        lines.push(`  ${prop.address}`);
        lines.push(`    MLS #:        ${prop.mlsNumber}`);
        lines.push(`    Market:       ${prop.market}`);
        lines.push(`    Score:        ${prop.flipVelocityScore} (${prop.flipVelocityLevel})`);
        lines.push(`    ARV:          ${prop.arv}`);
        lines.push(`    List Price:   ${prop.listPrice}`);
        lines.push(`    Reno Risk:    ${prop.renoScope}`);
        lines.push('');
      });
    }
    
    // Price Alerts
    if (data.priceAlerts && data.priceAlerts.length > 0) {
      lines.push('💰 PRICE ALERTS');
      lines.push('───────────────────────────────────────────────────────────────');
      data.priceAlerts.forEach(alert => {
        lines.push(`  ► ${alert.propertyAddress}`);
        lines.push(`    ${alert.value}`);
      });
      lines.push('');
    }
    
    // DOM Alerts
    if (data.domAlerts && data.domAlerts.length > 0) {
      lines.push('📅 DAYS ON MARKET MILESTONES');
      lines.push('───────────────────────────────────────────────────────────────');
      data.domAlerts.forEach(alert => {
        lines.push(`  ► ${alert.propertyAddress}`);
        lines.push(`    ${alert.value}`);
      });
      lines.push('');
    }
    
    // Connector Status
    lines.push('⚙️  DATA SOURCE STATUS');
    lines.push('───────────────────────────────────────────────────────────────');
    if (data.connectorStatus && data.connectorStatus.length > 0) {
      data.connectorStatus.forEach(status => {
        const statusEmoji = status.status === 'healthy' ? '✅' : status.status === 'error' ? '❌' : '⏳';
        lines.push(`  ${statusEmoji} ${status.market}: ${status.status.toUpperCase()}`);
        if (status.message) {
          lines.push(`     ${status.message}`);
        }
      });
    }
    lines.push('');
    
    // Footer
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('Southwest Investment Software');
    lines.push('Automated property flip analysis for Southern Utah & Nevada');
    lines.push('Las Vegas • St. George • Cedar City');
    lines.push('');
    lines.push('This is an automated report. Do your own due diligence before');
    lines.push('making investment decisions.');
    lines.push('═══════════════════════════════════════════════════════════════');
    
    return lines.join('\n');
  }
}
