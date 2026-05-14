# PRODUCTION DEPLOYMENT CHECKLIST & IMPLEMENTATION GUIDE
**Southwest Investment Software**

---

## 🚀 PRE-DEPLOYMENT CHECKLIST

### CRITICAL FIXES (Must complete before ANY deployment)

#### ✅ Code Quality
- [ ] Fix pipeline orchestrator type errors (10 errors)
- [ ] Implement real MLS connector APIs
- [ ] Add comprehensive input validation
- [ ] Fix null pointer dereferences
- [ ] Pass TypeScript strict mode: `npm run build`

#### ✅ Security
- [ ] Implement API authentication (JWT or API keys)
- [ ] Add rate limiting on all endpoints
- [ ] Sanitize all external inputs
- [ ] Move credentials to secrets manager
- [ ] Enable HTTPS/TLS for all connections
- [ ] Implement CORS properly
- [ ] Add security headers (CSP, X-Frame-Options, etc.)

#### ✅ Reliability
- [ ] Add retry logic with exponential backoff
- [ ] Implement circuit breakers for external APIs
- [ ] Add database transaction support
- [ ] Implement graceful shutdown
- [ ] Add database connection pooling
- [ ] Implement health check endpoints

#### ✅ Observability
- [ ] Setup structured logging (Winston/Pino)
- [ ] Implement error tracking (Sentry/Rollbar)
- [ ] Add performance monitoring (APM)
- [ ] Setup alerting for critical issues
- [ ] Add audit logging for sensitive operations

#### ✅ Testing
- [ ] Unit tests for all scoring algorithms
- [ ] Integration tests for pipeline
- [ ] Load testing (can handle peak traffic?)
- [ ] Failure scenario testing
- [ ] Database backup/restore testing
- [ ] Security penetration testing

#### ✅ Operations
- [ ] Document deployment procedures
- [ ] Create runbooks for common issues
- [ ] Setup on-call alerting
- [ ] Create disaster recovery plan
- [ ] Prepare capacity planning documentation
- [ ] Setup database backups (daily, encrypted)

---

## 🔧 IMPLEMENTATION PRIORITY

### PHASE 1: CRITICAL (Week 1) - 40 Hours
**Must complete to reach MVP**

**1. Fix Compiler Errors (2 hours)**
```bash
npm run build  # Currently fails with 11 errors
```

**2. Implement MLS Connectors (8 hours)**
```typescript
// mlxchange-connector.ts - Implement real API calls
// flex-connector.ts - Implement real API calls
// Missing: API endpoints, authentication, pagination, field mapping
```

**3. Input Validation Framework (4 hours)**
```typescript
// Add validation layer:
- Type guards for all external data
- Bounds checking on numeric values
- String sanitization
- Array size limits
- Null coalescing
```

**4. Environment Variable Validation (1 hour)**
```typescript
// Validate at startup:
- All required vars present
- Credentials valid format
- Ports available
- Database accessible
```

**5. Database Connection Lifecycle (1 hour)**
```typescript
// Add:
- Graceful shutdown hooks
- Connection pool limits
- Timeout handling
- Reconnection logic
```

**6. Error Recovery & Retry (4 hours)**
```typescript
// Add to all async operations:
- Exponential backoff
- Max retry attempts
- Failure circuit breakers
- Fallback strategies
```

**7. Basic Logging (2 hours)**
```bash
npm install winston winston-daily-rotate-file
```
Replace all `console.log` with structured logging

**8. API Authentication (8 hours)**
```typescript
// Implement:
- API key generation/validation
- JWT token support
- Rate limiting per user
- Access control checks
```

**9. Health Check Endpoints (1 hour)**
```typescript
// Add endpoints:
- GET /health - System health
- GET /health/database - DB connectivity
- GET /health/connectors - MLS connector status
```

**10. Database Transaction Support (2 hours)**
```typescript
// Wrap all multi-step operations in transactions:
- prisma.$transaction([...])
```

**11. Testing Infrastructure (2 hours)**
```bash
npm install --save-dev @testing-library/node
# Create test suite for critical paths
```

---

### PHASE 2: HARDENING (Week 2) - 30 Hours
**Prepare for scale and failures**

**1. Advanced Logging (4 hours)**
- Log rotation
- Different log levels per component
- Performance metrics
- Request tracing

**2. Monitoring & Alerting (4 hours)**
- Setup APM (Application Performance Monitoring)
- Configure alerts for:
  - Pipeline failures
  - Email delivery failures
  - API rate limit approaching
  - Database connection pool exhaustion

**3. Data Caching (3 hours)**
- Cache zip benchmarks (24 hour TTL)
- Cache market configurations
- Cache comp analysis results

**4. Scheduler Improvements (2 hours)**
- Add overlap prevention
- Add manual trigger controls
- Add execution history

**5. Database Optimization (4 hours)**
- Add proper indexes (already in schema)
- Setup query monitoring
- Add slow query logging
- Prepare for archiving old data

**6. API Rate Limiting (3 hours)**
```typescript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // requests per minute
});
```

**7. Backup & Recovery (3 hours)**
- Automated daily backups
- Test restore procedures
- Document RTO/RPO

**8. Documentation (4 hours)**
- Deployment guide
- Troubleshooting guide
- Operations manual
- API documentation

---

### PHASE 3: PRODUCTION READINESS (Week 3) - 20 Hours
**Final validation and deployment**

**1. Load Testing (4 hours)**
```bash
npm install --save-dev autocannon
# Test: 1000 listings/minute throughput
# Test: 100 concurrent users
# Test: Email sending under load
```

**2. Security Audit (4 hours)**
- Code review for vulnerabilities
- Dependency vulnerability scan (`npm audit`)
- OWASP Top 10 review
- Secrets scanning

**3. Infrastructure Setup (4 hours)**
- Production database setup (PostgreSQL)
- Server configuration
- SSL/TLS certificates
- CDN setup (if needed)

**4. Deployment Procedures (4 hours)**
- Blue/green deployment
- Rollback procedures
- Health check validation
- Smoke tests

**5. Training & Handoff (4 hours)**
- Train operations team
- Document on-call procedures
- Create escalation matrix
- Prepare incident response plan

---

## 📋 DETAILED IMPLEMENTATION CHECKLIST

### Database Fixes
- [ ] Update Prisma schema for JSON fields
  ```prisma
  warnings          String?     // Store as JSON string, not object
  connectorStatus   String?     // Store as JSON string
  ```
- [ ] Add data retention policies
- [ ] Setup database backups
- [ ] Test recovery procedures

### API Connector Implementation
- [ ] Document MLXchange API specs
  ```typescript
  // Required API calls:
  - Get new listings in saved search
  - Get price/status changes (delta)
  - Get comp sales data
  - Handle pagination
  - Handle rate limits (ex: 100 req/min)
  - Handle errors (401, 429, 500)
  ```
- [ ] Document Flex Washington API specs
- [ ] Document Flex Iron API specs
- [ ] Create connector test suite
- [ ] Mock APIs for testing

### Scoring Algorithm Fixes
- [ ] Fix NaN/Infinity edge cases
- [ ] Add bounds checking
- [ ] Add null coalescing
- [ ] Write comprehensive tests
- [ ] Validate output ranges (0-100)

### Error Handling
- [ ] Add try-catch to all async operations
- [ ] Add specific error types
- [ ] Create error recovery strategies
- [ ] Add error telemetry

### Logging Implementation
```bash
npm install winston
```
- [ ] Replace console.log with logger.info()
- [ ] Add log levels (debug, info, warn, error)
- [ ] Implement log rotation
- [ ] Add structured logging
- [ ] Add request IDs for tracing

### Monitoring Setup
- [ ] Setup APM (DataDog, New Relic, Prometheus)
- [ ] Create dashboards
- [ ] Setup alerting rules
- [ ] Configure escalation paths

### Testing Implementation
- [ ] Unit tests (scorers, validators)
- [ ] Integration tests (pipeline)
- [ ] E2E tests (full workflow)
- [ ] Performance tests (load)
- [ ] Security tests (injection, auth)

---

## 🚨 REAL-WORLD SCENARIOS

### Scenario: MLS API Down
**Current:** Pipeline crashes, entire run fails  
**After fixes:**
- Circuit breaker triggers
- Retry with backoff
- Alert sent to ops team
- System degrades gracefully
- Previous data used as fallback

### Scenario: Email Delivery Failure
**Current:** Error might go unnoticed  
**After fixes:**
- Automatic retry (3 attempts)
- Alert in error log
- Fallback delivery method
- Manual delivery queue available

### Scenario: Database Connection Lost
**Current:** All operations fail  
**After fixes:**
- Automatic reconnection
- Health check detects issue
- Alert sent immediately
- Operations queued until restored

### Scenario: Malformed MLS Data
**Current:** Could crash scorer, produce NaN  
**After fixes:**
- Validation catches issue
- Item skipped with warning
- Logging captures details
- Metrics track error rate

### Scenario: Spike in Load (1000s of listings)
**Current:** Might timeout or crash  
**After fixes:**
- Rate limiting prevents overload
- Batch processing handles volume
- Monitoring shows resource usage
- Auto-scaling if configured

---

## 💰 RESOURCE REQUIREMENTS FOR PRODUCTION

### Computing
- **Application Server:** 2GB RAM, 2 CPU cores minimum
- **Database Server:** 4GB RAM, dedicated SSD (or managed PostgreSQL)
- **Total:** $50-200/month depending on cloud provider

### Monitoring
- **Logging:** $10-50/month (Papertrail, CloudWatch, etc.)
- **APM:** $50-200/month (DataDog, New Relic, etc.)
- **Error Tracking:** $20-100/month (Sentry, etc.)

### Backup/Recovery
- **Daily Backups:** $20-50/month
- **Off-site Redundancy:** $10-30/month

**Total Monthly Cost:** $160-630/month

---

## 📊 METRICS TO TRACK

### System Health
- [ ] API response time (p50, p95, p99)
- [ ] Email delivery success rate
- [ ] Pipeline completion time
- [ ] Database query performance
- [ ] Error rate by type

### Business Metrics
- [ ] Listings processed per run
- [ ] High velocity opportunities found
- [ ] Alerts sent per day
- [ ] Data accuracy (manual spot checks)
- [ ] Cost per analysis

### Infrastructure
- [ ] CPU utilization
- [ ] Memory usage
- [ ] Database connection count
- [ ] API rate limit usage
- [ ] Disk space available

---

## 🔐 SECURITY CHECKLIST

- [ ] Secrets NOT in git (use `.gitignore`)
- [ ] Secrets in environment variables or secrets manager
- [ ] API keys rotated regularly
- [ ] Database credentials encrypted
- [ ] HTTPS/TLS enforced
- [ ] CORS configured correctly
- [ ] Input validation on all APIs
- [ ] Output encoding for XSS prevention
- [ ] SQL injection prevention (Prisma helps)
- [ ] CSRF tokens if needed
- [ ] Authentication required for all endpoints
- [ ] Authorization checks on all data access
- [ ] Audit logging for sensitive operations
- [ ] Failed login attempts tracked
- [ ] Rate limiting on auth endpoints

---

## 📞 OPERATIONAL RUNBOOKS

### "Pipeline Not Running"
1. Check scheduler logs
2. Verify cron configuration
3. Check database connectivity
4. Verify MLS API status
5. Check email service status
6. Restart scheduler if needed

### "Email Not Sending"
1. Check email service status
2. Verify credentials
3. Check rate limits
4. Check email queue
5. Manual retry if needed

### "High Memory Usage"
1. Check active processes
2. Look for memory leaks
3. Check database connection count
4. Review recent deployments
5. Restart service if needed

### "Database Connection Pool Exhausted"
1. Check active connections
2. Look for stuck transactions
3. Increase pool size if needed
4. Restart application
5. Check logs for connection leaks

---

## ✅ SIGN-OFF CHECKLIST

Before deploying to production:

- [ ] All critical bugs fixed
- [ ] All tests passing
- [ ] Code reviewed by 2+ engineers
- [ ] Security audit completed
- [ ] Load testing passed (target: 1000 listings/min)
- [ ] Disaster recovery tested
- [ ] Documentation complete
- [ ] Operations team trained
- [ ] On-call support arranged
- [ ] Monitoring/alerting verified
- [ ] Backup/restore verified
- [ ] Incident response plan ready

---

## 🎯 SUCCESS CRITERIA

**System is production-ready when:**
- ✅ Processes 1000+ listings per minute
- ✅ Achieves 99.5% uptime
- ✅ Sends emails within 5 minutes
- ✅ Scores calculated within 2 seconds
- ✅ No manual intervention needed for 30 days
- ✅ All critical errors alarmed within 1 minute
- ✅ Graceful degradation when dependencies fail
- ✅ Data consistency maintained across all failures
