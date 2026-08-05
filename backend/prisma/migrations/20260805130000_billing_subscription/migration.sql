-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionState" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');
CREATE TYPE "PaymentOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "PaymentGateway" AS ENUM ('MOCK', 'MOMO', 'VNPAY');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "plan_tier" "ServicePlan" NOT NULL,
    "status" "SubscriptionState" NOT NULL DEFAULT 'PENDING',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "started_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_orders" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "order_code" TEXT NOT NULL,
    "plan_tier" "ServicePlan" NOT NULL,
    "billing_cycle" "BillingCycle" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'VND',
    "gateway" "PaymentGateway" NOT NULL DEFAULT 'MOCK',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'PENDING',
    "checkout_url" TEXT,
    "provider_txn_id" TEXT,
    "raw_payload" JSONB,
    "signature_verified" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "club_id" TEXT NOT NULL,
    "payment_order_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "billing_info" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_club_id_key" ON "subscriptions"("club_id");
CREATE UNIQUE INDEX "payment_orders_order_code_key" ON "payment_orders"("order_code");
CREATE INDEX "payment_orders_club_id_status_idx" ON "payment_orders"("club_id", "status");
CREATE UNIQUE INDEX "invoices_payment_order_id_key" ON "invoices"("payment_order_id");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_club_id_idx" ON "invoices"("club_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
