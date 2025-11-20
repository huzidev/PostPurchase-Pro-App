-- CreateTable
CREATE TABLE "Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopify_url" TEXT NOT NULL,
    "shopify_subscription_id" TEXT,
    "charge_id" TEXT,
    "plan_id" TEXT NOT NULL DEFAULT 'free',
    "plan_name" TEXT NOT NULL DEFAULT 'Free',
    "plan_price" REAL NOT NULL DEFAULT 0,
    "max_active_offers" INTEGER NOT NULL DEFAULT 2,
    "max_impressions_monthly" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopify_url" TEXT NOT NULL,
    "offer_id" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" REAL NOT NULL DEFAULT 0,
    "conversion_rate" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Analytics_shopify_url_fkey" FOREIGN KEY ("shopify_url") REFERENCES "Subscription" ("shopify_url") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopify_url_key" ON "Subscription"("shopify_url");
