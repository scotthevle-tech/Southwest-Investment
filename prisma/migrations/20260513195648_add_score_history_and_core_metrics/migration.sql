-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mlsNumber" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT,
    "county" TEXT,
    "listPrice" REAL NOT NULL,
    "originalListPrice" REAL,
    "sqft" INTEGER,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" REAL NOT NULL,
    "yearBuilt" INTEGER,
    "propertyType" TEXT NOT NULL DEFAULT 'SFR',
    "status" TEXT NOT NULL DEFAULT 'Active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dom" INTEGER,
    "domAtSale" INTEGER,
    "remarks" TEXT,
    "hoaMonthly" REAL,
    "waterSource" TEXT DEFAULT 'Municipal',
    "sewerType" TEXT,
    "priceReductionCount" INTEGER NOT NULL DEFAULT 0,
    "priceReductionHistory" TEXT,
    "totalDropPct" REAL,
    "opportunityScore" INTEGER,
    "zipAbsorptionScore" INTEGER,
    "zipMedianDOM" REAL,
    "zipSalesCount90d" INTEGER,
    "zipDataConfidence" TEXT,
    "renoScopeScore" INTEGER,
    "renoRiskLevel" TEXT,
    "renoRiskFlags" TEXT,
    "buyerPoolScore" INTEGER,
    "buyerPoolLabel" TEXT,
    "modelARV" REAL,
    "renovatedCompsUsed" INTEGER,
    "modelARVConfidenceLevel" TEXT,
    "modelARVConfidenceDetail" TEXT,
    "competitiveInventoryCount" INTEGER,
    "competitiveInventoryScore" INTEGER,
    "flipVelocityScore" INTEGER,
    "flipVelocityBreakdown" TEXT,
    "flipVelocityLevel" TEXT,
    "isWatchlist" BOOLEAN NOT NULL DEFAULT false,
    "watchlistNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastScoredAt" DATETIME,
    "firstSeenDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Comp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketSource" TEXT NOT NULL,
    "mlsNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "listPrice" REAL NOT NULL,
    "soldPrice" REAL NOT NULL,
    "sqft" INTEGER NOT NULL,
    "yearBuilt" INTEGER,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" REAL NOT NULL,
    "dom" INTEGER,
    "domAtSale" INTEGER NOT NULL,
    "soldDate" DATETIME NOT NULL,
    "remarks" TEXT,
    "renovatedKeywords" TEXT,
    "isRenovated" BOOLEAN NOT NULL DEFAULT false,
    "recencyDays" INTEGER,
    "distanceMiles" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ZipBenchmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zipCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "recordDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeSFRCount" INTEGER,
    "avgPSFActive" REAL,
    "avgDOMActive" REAL,
    "priceReductionRate" REAL,
    "soldSFRCount90d" INTEGER,
    "medianDOMSold90d" REAL,
    "avgPSFSold90d" REAL,
    "salesVelocityPerMo" REAL,
    "dataConfidence" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "previousPrice" REAL NOT NULL,
    "newPrice" REAL NOT NULL,
    "dropPct" REAL NOT NULL,
    "alertType" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    CONSTRAINT "PriceAlert_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DOMAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "domMilestone" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    CONSTRAINT "DOMAlert_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RunLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runType" TEXT NOT NULL,
    "market" TEXT,
    "newListingsCount" INTEGER NOT NULL DEFAULT 0,
    "updatedListingsCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warnings" TEXT,
    "connectorStatus" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationMs" INTEGER
);

-- CreateTable
CREATE TABLE "PropertyScoreHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "recordDate" DATETIME NOT NULL,
    "flipVelocityScore" INTEGER NOT NULL,
    "opportunityScore" INTEGER,
    "zipAbsorptionScore" INTEGER,
    "renoScopeScore" INTEGER,
    "buyerPoolScore" INTEGER,
    "modelARV" REAL,
    "dom" INTEGER,
    "domDelta" INTEGER,
    "domTrend" TEXT,
    "listPrice" REAL,
    "priceDropPct" REAL,
    "priceDropVelocity" REAL,
    "daysSinceLastPriceDrop" INTEGER,
    "isPriceDroppingAccelerated" BOOLEAN,
    "renoScopeScoreDelta" INTEGER,
    "conditionRiskFlagCount" INTEGER,
    "newConditionFlags" TEXT,
    "conditionTrend" TEXT,
    "status" TEXT,
    "remarksHash" TEXT,
    "scoreDelta" INTEGER,
    "trend" TEXT,
    "isNewToList" BOOLEAN NOT NULL DEFAULT false,
    "appearanceCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyScoreHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyMarketReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "market" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "highVelocityCount" INTEGER NOT NULL,
    "evaluateCount" INTEGER NOT NULL,
    "trackOnlyCount" INTEGER NOT NULL,
    "priceDropAlertCount" INTEGER NOT NULL,
    "domMilestoneCount" INTEGER NOT NULL,
    "topMomentumProperties" TEXT,
    "newEntrants" TEXT,
    "persistentHighPerformers" TEXT,
    "htmlReport" TEXT,
    "textReport" TEXT,
    "connectorStatus" TEXT,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingMlsNumber" TEXT NOT NULL,
    "opportunityScoreBreakdown" TEXT,
    "zipAbsorptionDetail" TEXT,
    "renoScopeDetail" TEXT,
    "buyerPoolDetail" TEXT,
    "competitiveInventoryDetail" TEXT,
    "compsUsed" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_mlsNumber_key" ON "Listing"("mlsNumber");

-- CreateIndex
CREATE INDEX "Listing_market_idx" ON "Listing"("market");

-- CreateIndex
CREATE INDEX "Listing_zipCode_idx" ON "Listing"("zipCode");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Listing_isActive_idx" ON "Listing"("isActive");

-- CreateIndex
CREATE INDEX "Listing_flipVelocityScore_idx" ON "Listing"("flipVelocityScore");

-- CreateIndex
CREATE INDEX "Listing_createdAt_idx" ON "Listing"("createdAt");

-- CreateIndex
CREATE INDEX "Comp_zipCode_idx" ON "Comp"("zipCode");

-- CreateIndex
CREATE INDEX "Comp_soldDate_idx" ON "Comp"("soldDate");

-- CreateIndex
CREATE INDEX "Comp_marketSource_idx" ON "Comp"("marketSource");

-- CreateIndex
CREATE INDEX "ZipBenchmark_zipCode_idx" ON "ZipBenchmark"("zipCode");

-- CreateIndex
CREATE INDEX "ZipBenchmark_city_idx" ON "ZipBenchmark"("city");

-- CreateIndex
CREATE INDEX "ZipBenchmark_market_idx" ON "ZipBenchmark"("market");

-- CreateIndex
CREATE UNIQUE INDEX "ZipBenchmark_zipCode_recordDate_key" ON "ZipBenchmark"("zipCode", "recordDate");

-- CreateIndex
CREATE INDEX "PriceAlert_listingId_idx" ON "PriceAlert"("listingId");

-- CreateIndex
CREATE INDEX "PriceAlert_sentAt_idx" ON "PriceAlert"("sentAt");

-- CreateIndex
CREATE INDEX "DOMAlert_listingId_idx" ON "DOMAlert"("listingId");

-- CreateIndex
CREATE INDEX "DOMAlert_domMilestone_idx" ON "DOMAlert"("domMilestone");

-- CreateIndex
CREATE INDEX "DOMAlert_sentAt_idx" ON "DOMAlert"("sentAt");

-- CreateIndex
CREATE INDEX "RunLog_runType_idx" ON "RunLog"("runType");

-- CreateIndex
CREATE INDEX "RunLog_startedAt_idx" ON "RunLog"("startedAt");

-- CreateIndex
CREATE INDEX "PropertyScoreHistory_listingId_idx" ON "PropertyScoreHistory"("listingId");

-- CreateIndex
CREATE INDEX "PropertyScoreHistory_recordDate_idx" ON "PropertyScoreHistory"("recordDate");

-- CreateIndex
CREATE INDEX "PropertyScoreHistory_flipVelocityScore_idx" ON "PropertyScoreHistory"("flipVelocityScore");

-- CreateIndex
CREATE INDEX "PropertyScoreHistory_trend_idx" ON "PropertyScoreHistory"("trend");

-- CreateIndex
CREATE INDEX "PropertyScoreHistory_domTrend_idx" ON "PropertyScoreHistory"("domTrend");

-- CreateIndex
CREATE INDEX "PropertyScoreHistory_priceDropVelocity_idx" ON "PropertyScoreHistory"("priceDropVelocity");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyScoreHistory_listingId_recordDate_key" ON "PropertyScoreHistory"("listingId", "recordDate");

-- CreateIndex
CREATE INDEX "DailyMarketReport_market_idx" ON "DailyMarketReport"("market");

-- CreateIndex
CREATE INDEX "DailyMarketReport_reportDate_idx" ON "DailyMarketReport"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMarketReport_market_reportDate_key" ON "DailyMarketReport"("market", "reportDate");

-- CreateIndex
CREATE INDEX "AnalysisResult_listingMlsNumber_idx" ON "AnalysisResult"("listingMlsNumber");
