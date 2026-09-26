-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "myshopifyDomain" TEXT NOT NULL,
    "name" TEXT,
    "accessToken" TEXT NOT NULL,
    "scopes" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "primaryLocale" TEXT DEFAULT 'en-GB',
    "currencyCode" TEXT DEFAULT 'GBP',
    "timezone" TEXT DEFAULT 'Europe/London',
    "storefrontUrl" TEXT
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "cursor" TEXT,
    "ordersUpserted" INTEGER NOT NULL DEFAULT 0,
    "productsUpserted" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "pipelineRunId" TEXT
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStage" TEXT,
    "lastSuccessfulStage" TEXT,
    "failedStage" TEXT,
    "stagesJson" TEXT NOT NULL,
    "agentsAutoRunSnapshot" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "idempotencyKey" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "StoreMakeupSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "pipelineRunId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowDays" INTEGER NOT NULL DEFAULT 60,
    "collectionsJson" TEXT NOT NULL,
    "productTypesJson" TEXT NOT NULL,
    "tagsJson" TEXT NOT NULL,
    "orderSkuMixJson" TEXT NOT NULL,
    "priceBandsJson" TEXT NOT NULL,
    "topCollectionsJson" TEXT NOT NULL,
    "geoBucketsJson" TEXT NOT NULL,
    "totalsJson" TEXT NOT NULL,
    "emptyOrders" BOOLEAN NOT NULL DEFAULT false,
    "provenance" TEXT NOT NULL DEFAULT 'OBSERVED'
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "shopId" TEXT NOT NULL PRIMARY KEY,
    "agentsAutoRun" BOOLEAN NOT NULL DEFAULT true,
    "modeOverride" TEXT
);

-- CreateTable
CREATE TABLE "OrderRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT,
    "processedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "subtotalAmount" DECIMAL NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "totalShipping" DECIMAL,
    "displayFinancialStatus" TEXT,
    "displayFulfillmentStatus" TEXT,
    "sourceName" TEXT,
    "tags" TEXT,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "customerHash" TEXT,
    "geoId" TEXT
);

-- CreateTable
CREATE TABLE "LineItemRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "sku" TEXT,
    "title" TEXT NOT NULL,
    "variantTitle" TEXT,
    "vendor" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "lineTotal" DECIMAL NOT NULL,
    "productType" TEXT,
    "tagsJson" TEXT
);

-- CreateTable
CREATE TABLE "ProductRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT,
    "productType" TEXT,
    "vendor" TEXT,
    "tags" TEXT,
    "status" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CollectionRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT
);

-- CreateTable
CREATE TABLE "ProductCollection" (
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    PRIMARY KEY ("productId", "collectionId")
);

-- CreateTable
CREATE TABLE "Geo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "city" TEXT,
    "provinceCode" TEXT,
    "countryCode" TEXT NOT NULL,
    "postalSector" TEXT,
    "lat" REAL,
    "lng" REAL,
    "provenance" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CatalogueEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naturalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'physical',
    "audienceJson" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "countryCode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "venueName" TEXT,
    "virtualFlag" BOOLEAN NOT NULL DEFAULT false,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "sourceUrl" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceExternalId" TEXT,
    "lastCrawledAt" DATETIME NOT NULL,
    "freshnessConfidence" REAL NOT NULL DEFAULT 1,
    "provenance" TEXT NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "rawPayloadHash" TEXT
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naturalKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "geoCity" TEXT,
    "countryCode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "timeStart" DATETIME NOT NULL,
    "timeEnd" DATETIME NOT NULL,
    "metricsJson" TEXT,
    "provenance" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "externalRef" TEXT,
    "lastCrawledAt" DATETIME NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "WeatherForecast" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naturalKey" TEXT NOT NULL,
    "geoBucketKey" TEXT NOT NULL,
    "geoCity" TEXT,
    "countryCode" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "forecastDate" DATETIME NOT NULL,
    "tMinC" REAL,
    "tMaxC" REAL,
    "precipMm" REAL,
    "windKph" REAL,
    "weatherCode" INTEGER,
    "sunriseAt" DATETIME,
    "sunsetAt" DATETIME,
    "rawPayloadHash" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'open_meteo',
    "provenance" TEXT NOT NULL,
    "lastCrawledAt" DATETIME NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "HashtagWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tag" TEXT NOT NULL,
    "naturalKey" TEXT NOT NULL,
    "geoHint" TEXT,
    "catalogueAffinityJson" TEXT,
    "clubOrEventHint" TEXT,
    "sourceType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "provenance" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SocialTrend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naturalKey" TEXT NOT NULL,
    "hashtagWatchId" TEXT,
    "tag" TEXT NOT NULL,
    "timeBucketStart" DATETIME NOT NULL,
    "timeBucketEnd" DATETIME NOT NULL,
    "score" REAL NOT NULL,
    "volumeProxy" REAL,
    "geoHint" TEXT,
    "geoBucketKey" TEXT,
    "sourceType" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "lastCrawledAt" DATETIME NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "payloadJson" TEXT
);

-- CreateTable
CREATE TABLE "VirtualEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naturalKey" TEXT NOT NULL,
    "catalogueEventId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "audienceJson" TEXT NOT NULL,
    "audienceGeoJson" TEXT,
    "globalVirtual" BOOLEAN NOT NULL DEFAULT true,
    "streamOrAppHint" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "sourceType" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "lastCrawledAt" DATETIME NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ActivityChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naturalKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'virtual',
    "windowStart" DATETIME NOT NULL,
    "windowEnd" DATETIME NOT NULL,
    "catalogueAffinityJson" TEXT,
    "volumeProxy" REAL,
    "geoBucketKey" TEXT,
    "sourceType" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "lastCrawledAt" DATETIME NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "payloadJson" TEXT
);

-- CreateTable
CREATE TABLE "CatalogueJobRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "upserted" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1,
    "provenance" TEXT NOT NULL,
    "payloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EventCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "catalogueEventId" TEXT,
    "name" TEXT NOT NULL,
    "archetype" TEXT NOT NULL,
    "timeStart" DATETIME NOT NULL,
    "timeEnd" DATETIME NOT NULL,
    "venueCity" TEXT,
    "venueCountry" TEXT,
    "driverIdsJson" TEXT,
    "enrichmentSource" TEXT NOT NULL,
    "nOrders" INTEGER NOT NULL,
    "windowLabel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConfidenceScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventCandidateId" TEXT NOT NULL,
    "valuePct" REAL NOT NULL,
    "value" REAL NOT NULL,
    "Lt" REAL NOT NULL,
    "G" REAL NOT NULL,
    "A" REAL NOT NULL,
    "Y" REAL NOT NULL,
    "R" REAL NOT NULL,
    "baselinePct" REAL NOT NULL,
    "competingJson" TEXT NOT NULL,
    "provenanceLabelsJson" TEXT NOT NULL,
    "nOrders" INTEGER NOT NULL,
    "windowStart" DATETIME NOT NULL,
    "windowEnd" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "primaryEventId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "goalsJson" TEXT NOT NULL,
    "budgetMin" DECIMAL NOT NULL,
    "budgetMax" DECIMAL NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'GBP',
    "constraintsJson" TEXT NOT NULL,
    "behaviouralJson" TEXT NOT NULL,
    "locationProxy" TEXT,
    "mockFlagsJson" TEXT NOT NULL,
    "successCriteriaJson" TEXT NOT NULL,
    "avatarInitials" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "eventId" TEXT,
    "status" TEXT NOT NULL,
    "outcome" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "timelineJson" TEXT,
    "storefrontUrl" TEXT,
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "AffordanceScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetRef" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "evidenceJson" TEXT NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "InsightScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetRef" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "insightKind" TEXT NOT NULL,
    "evidenceJson" TEXT NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "personaId" TEXT,
    "eventId" TEXT,
    "runId" TEXT,
    "targetType" TEXT,
    "targetRef" TEXT,
    "adminDeepLink" TEXT,
    "provenanceLabelsJson" TEXT NOT NULL,
    "confidence" REAL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_myshopifyDomain_key" ON "Shop"("myshopifyDomain");

-- CreateIndex
CREATE INDEX "SyncRun_shopId_startedAt_idx" ON "SyncRun"("shopId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRun_idempotencyKey_key" ON "PipelineRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PipelineRun_shopId_startedAt_idx" ON "PipelineRun"("shopId", "startedAt");

-- CreateIndex
CREATE INDEX "PipelineRun_shopId_status_idx" ON "PipelineRun"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreMakeupSnapshot_pipelineRunId_key" ON "StoreMakeupSnapshot"("pipelineRunId");

-- CreateIndex
CREATE INDEX "StoreMakeupSnapshot_shopId_capturedAt_idx" ON "StoreMakeupSnapshot"("shopId", "capturedAt");

-- CreateIndex
CREATE INDEX "OrderRow_shopId_processedAt_idx" ON "OrderRow"("shopId", "processedAt");

-- CreateIndex
CREATE INDEX "LineItemRow_shopId_orderId_idx" ON "LineItemRow"("shopId", "orderId");

-- CreateIndex
CREATE INDEX "ProductRow_shopId_idx" ON "ProductRow"("shopId");

-- CreateIndex
CREATE INDEX "CollectionRow_shopId_idx" ON "CollectionRow"("shopId");

-- CreateIndex
CREATE INDEX "Geo_shopId_idx" ON "Geo"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Geo_shopId_countryCode_city_postalSector_key" ON "Geo"("shopId", "countryCode", "city", "postalSector");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogueEvent_naturalKey_key" ON "CatalogueEvent"("naturalKey");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_naturalKey_key" ON "Driver"("naturalKey");

-- CreateIndex
CREATE UNIQUE INDEX "WeatherForecast_naturalKey_key" ON "WeatherForecast"("naturalKey");

-- CreateIndex
CREATE INDEX "WeatherForecast_geoBucketKey_forecastDate_idx" ON "WeatherForecast"("geoBucketKey", "forecastDate");

-- CreateIndex
CREATE UNIQUE INDEX "HashtagWatch_naturalKey_key" ON "HashtagWatch"("naturalKey");

-- CreateIndex
CREATE UNIQUE INDEX "SocialTrend_naturalKey_key" ON "SocialTrend"("naturalKey");

-- CreateIndex
CREATE INDEX "SocialTrend_tag_timeBucketStart_idx" ON "SocialTrend"("tag", "timeBucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualEvent_naturalKey_key" ON "VirtualEvent"("naturalKey");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityChallenge_naturalKey_key" ON "ActivityChallenge"("naturalKey");

-- CreateIndex
CREATE INDEX "ActivityChallenge_platform_windowStart_idx" ON "ActivityChallenge"("platform", "windowStart");

-- CreateIndex
CREATE INDEX "GraphEdge_shopId_relation_idx" ON "GraphEdge"("shopId", "relation");

-- CreateIndex
CREATE INDEX "GraphEdge_fromType_fromId_idx" ON "GraphEdge"("fromType", "fromId");

-- CreateIndex
CREATE INDEX "GraphEdge_toType_toId_idx" ON "GraphEdge"("toType", "toId");

-- CreateIndex
CREATE INDEX "EventCandidate_shopId_idx" ON "EventCandidate"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfidenceScore_eventCandidateId_key" ON "ConfidenceScore"("eventCandidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_shopId_name_key" ON "Persona"("shopId", "name");

-- CreateIndex
CREATE INDEX "AgentRun_shopId_startedAt_idx" ON "AgentRun"("shopId", "startedAt");

-- CreateIndex
CREATE INDEX "AffordanceScore_runId_idx" ON "AffordanceScore"("runId");

-- CreateIndex
CREATE INDEX "InsightScore_runId_idx" ON "InsightScore"("runId");

-- CreateIndex
CREATE INDEX "Recommendation_shopId_priority_idx" ON "Recommendation"("shopId", "priority");
