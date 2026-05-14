export interface ValidatedConfig {
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Trestle (Las Vegas)
  trestleEnabled: boolean;
  trestleClientId?: string;
  trestleClientSecret?: string;

  // Spark Washington (St. George)
  sparkWashingtonEnabled: boolean;
  sparkWashingtonAccessToken?: string;
  sparkWashingtonFeedId?: string;

  // Spark Iron (Cedar City)
  sparkIronEnabled: boolean;
  sparkIronAccessToken?: string;
  sparkIronFeedId?: string;

  // Email
  reportTo: string;
  emailProvider: 'gmail' | 'outlook' | 'sendgrid' | 'custom';
  emailUser: string;
  emailPassword: string;
  reportTimezone: string;

  // Optional
  anthropicApiKey?: string;
  maxListingsPerRun: number;
}

export function validateConfig(): ValidatedConfig {
  const errors: string[] = [];

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
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  const emailProvider = (process.env.EMAIL_PROVIDER || 'gmail').toLowerCase() as 'gmail' | 'outlook' | 'sendgrid' | 'custom';
  const logLevel = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';
  const port = Number(process.env.PORT || 3000);
  const reportTo = process.env.REPORT_TO || '';

  const validationErrors: string[] = [];
  if (!['gmail', 'outlook', 'sendgrid', 'custom'].includes(emailProvider)) {
    validationErrors.push(`Invalid EMAIL_PROVIDER: ${emailProvider}`);
  }
  if (!reportTo.includes('@')) {
    validationErrors.push(`Invalid REPORT_TO: ${reportTo}`);
  }
  if (!isFinite(port) || port < 1 || port > 65535) {
    validationErrors.push(`Invalid PORT: ${port}`);
  }
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    validationErrors.push(`Invalid LOG_LEVEL: ${logLevel}`);
  }
  if (validationErrors.length > 0) {
    throw new Error(`Configuration validation failed:\n${validationErrors.join('\n')}`);
  }

  return {
    nodeEnv,
    databaseUrl: process.env.DATABASE_URL!,
    port,
    logLevel,

    trestleEnabled: process.env.TRESTLE_ENABLED === 'true',
    trestleClientId: process.env.TRESTLE_CLIENT_ID,
    trestleClientSecret: process.env.TRESTLE_CLIENT_SECRET,

    sparkWashingtonEnabled: process.env.SPARK_WASHINGTON_ENABLED === 'true',
    sparkWashingtonAccessToken: process.env.SPARK_WASHINGTON_ACCESS_TOKEN,
    sparkWashingtonFeedId: process.env.SPARK_WASHINGTON_FEED_ID,

    sparkIronEnabled: process.env.SPARK_IRON_ENABLED === 'true',
    sparkIronAccessToken: process.env.SPARK_IRON_ACCESS_TOKEN,
    sparkIronFeedId: process.env.SPARK_IRON_FEED_ID,

    reportTo,
    emailProvider,
    emailUser: process.env.EMAIL_USER!,
    emailPassword: process.env.EMAIL_PASSWORD!,
    reportTimezone: process.env.REPORT_TIMEZONE || 'America/Denver',

    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    maxListingsPerRun: Number(process.env.MAX_LISTINGS_PER_RUN || 5000),
  };
}

export function logConfiguration(config: ValidatedConfig): void {
  console.log('Configuration Loaded:');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.databaseUrl.includes('file:') ? 'SQLite' : 'PostgreSQL'}`);
  console.log(`   Email: ${config.emailProvider} -> ${config.reportTo}`);
  console.log(`   Timezone: ${config.reportTimezone}`);

  const connectors = [];
  if (config.trestleEnabled) {
    const hasSecret = !!config.trestleClientSecret;
    connectors.push(`Trestle/LV (${hasSecret ? 'ready' : 'needs API password'})`);
  }
  if (config.sparkWashingtonEnabled) connectors.push('Spark/St. George');
  if (config.sparkIronEnabled) connectors.push('Spark/Cedar City');

  console.log(`   Connectors: ${connectors.length > 0 ? connectors.join(', ') : 'None enabled'}`);
}
