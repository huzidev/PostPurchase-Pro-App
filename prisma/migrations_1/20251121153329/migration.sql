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
    "emailVerified" BOOLEAN DEFAULT false
);

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
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopify_url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "discount_type" TEXT NOT NULL,
    "discount_value" REAL NOT NULL,
    "offer_title" TEXT NOT NULL,
    "offer_description" TEXT,
    "button_text" TEXT NOT NULL DEFAULT 'Add to Order',
    "limit_per_customer" INTEGER NOT NULL DEFAULT 1,
    "total_limit" INTEGER,
    "expiry_date" DATETIME,
    "schedule_start" DATETIME,
    "enable_ab_test" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_shopify_url_fkey" FOREIGN KEY ("shopify_url") REFERENCES "Subscription" ("shopify_url") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OfferProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offer_id" TEXT NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "shopify_variant_id" TEXT,
    "product_title" TEXT NOT NULL,
    "variant_title" TEXT,
    "product_price" TEXT NOT NULL,
    "variant_price" TEXT,
    "image_url" TEXT,
    "variants_count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferProduct_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "Analytics_shopify_url_fkey" FOREIGN KEY ("shopify_url") REFERENCES "Subscription" ("shopify_url") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Analytics_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopify_url_key" ON "Subscription"("shopify_url");

-- CreateIndex
CREATE UNIQUE INDEX "OfferProduct_offer_id_shopify_product_id_shopify_variant_id_key" ON "OfferProduct"("offer_id", "shopify_product_id", "shopify_variant_id");
