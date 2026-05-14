/**
 * Configuration Validation
 * Ensures all required environment variables are present and valid
 */

export interface ValidatedConfig {
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl: string;
  reportTo: string;
  emailProvider: 'gmail' | 'outlook' | 'sendgrid' | 'custom';
  emailUser: string;
  emailPassword: string;
  reportTimezone: string;
  mlxchangeEnabled: boolean;
  mlxchangeApiKey?: string;
  flexWashingtonEnabled: boolean;
  flexWashingtonApiKey?: string;
  flexIronEnabled: boolean;
  flexIronApiKey?: string;
  anthropicApiKey?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxListingsPerRun: number;
  portOrganizing: number;
}

/**
 * Validate all required environment variables
 */
export function validateConfig(): ValidatedConfig {
  const errors: string[] = [];

  // Check required variables
  const required = [
    'DATABASE_URL',
    'REPORT_TO',
    'EMAIL_PROVIDER',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.join('\n')}`,
    );
  }

  // Validate values
  const nodeEnv = (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test';

  const emailProvider = (
    process.env.EMAIL_PROVIDER || 'gmail'
  ).toLowerCase() as 'gmail' | 'outlook' | 'sendgrid' | 'custom';

  if (!['gmail', 'outlook', 'sendgrid', 'custom'].includes(emailProvider)) {
    errors.push(
      `Invalid EMAIL_PROVIDER: ${emailProvider}. Must be one of: gmail, outlook, sendgrid, custom`,
    );
  }

  // Validate email
  const reportTo = process.env.REPORT_TO || '';
  if (!reportTo.includes('@')) {
    errors.push(`Invalid REPORT_TO: ${reportTo}. Must be a valid email`);
  }

  // Validate port if provided
  const port = Number(process.env.PORT || 3000);
  if (!isFinite(port) || port < 1 || port > 65535) {
    errors.push(`Invalid PORT: ${port}. Must be between 1-65535`);
  }

  // Validate log level
  const logLevel = (process.env.LOG_LEVEL || 'info') as
    | 'debug'
    | 'info'
    | 'warn'
    | 'error';
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    errors.push(
      `Invalid LOG_LEVEL: ${logLevel}. Must be one of: debug, info, warn, error`,
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.join('\n')}`,
    );
  }

  return {
    nodeEnv,
    databaseUrl: process.env.DATABASE_URL!,
    reportTo,
    emailProvider,
    emailUser: process.env.EMAIL_USER!,
    emailPassword: process.env.EMAIL_PASSWORD!,
    reportTimezone: process.env.REPORT_TIMEZONE || 'America/Denver',
    mlxchangeEnabled: process.env.MLXCHANGE_ENABLED === 'true',
    mlxchangeApiKey: process.env.MLXCHANGE_API_KEY,
    flexWashingtonEnabled: process.env.FLEX_WASHINGTON_ENABLED === 'true',
    flexWashingtonApiKey: process.env.FLEX_WASHINGTON_API_KEY,
    flexIronEnabled: process.env.FLEX_IRON_ENABLED === 'true',
    flexIronApiKey: process.env.FLEX_IRON_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    logLevel,
    maxListingsPerRun: Number(process.env.MAX_LISTINGS_PER_RUN || 5000),
    portOrganizing: port,
  };
}

/**
 * Log current configuration (without secrets)
 */
export function logConfiguration(config: ValidatedConfig): void {
  console.log('📋 Configuration Loaded:');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Database: ${config.databaseUrl.split('/').pop()}`);
  console.log(`   Email Provider: ${config.emailProvider}`);
  console.log(
    `   Email: ${config.reportTo}`,
  );
  console.log(`   Timezone: ${config.reportTimezone}`);
  console.log(`   Log Level: ${config.logLevel}`);
  console.log(`   Port: ${config.portOrganizing}`);

  // Check connectors
  const enabled = [];
  if (config.mlxchangeEnabled) enabled.push('MLXchange');
  if (config.flexWashingtonEnabled) enabled.push('Flex Washington');
  if (config.flexIronEnabled) enabled.push('Flex Iron');

  console.log(`   Enabled Connectors: ${enabled.join(', ') || 'None'}`);

  if (config.anthropicApiKey) {
    console.log(`   Anthropic API: ✓ configured`);
  }
}
