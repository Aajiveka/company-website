-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'ABORTED');

-- CreateTable
CREATE TABLE "tblSubscriptionPlan" (
    "PlanID" SERIAL NOT NULL,
    "Tier" VARCHAR(20) NOT NULL,
    "TierLabel" VARCHAR(60) NOT NULL,
    "Months" INTEGER NOT NULL,
    "PriceINR" INTEGER NOT NULL,
    "Active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tblSubscriptionPlan_pkey" PRIMARY KEY ("PlanID")
);

-- CreateTable
CREATE TABLE "tblPaymentOrder" (
    "OrderID" BIGSERIAL NOT NULL,
    "OrderRef" VARCHAR(40) NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "PlanID" INTEGER NOT NULL,
    "AmountINR" INTEGER NOT NULL,
    "Status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "BDOrderID" VARCHAR(60),
    "TransactionID" VARCHAR(60),
    "AuthStatus" VARCHAR(10),
    "PaymentMethod" VARCHAR(40),
    "ErrorDescription" VARCHAR(300),
    "RawResponse" TEXT,
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "SettledAt" TIMESTAMP(6),

    CONSTRAINT "tblPaymentOrder_pkey" PRIMARY KEY ("OrderID")
);

-- CreateTable
CREATE TABLE "tblSubscription" (
    "SubscriptionID" BIGSERIAL NOT NULL,
    "SubscriberID" BIGINT NOT NULL,
    "PlanID" INTEGER NOT NULL,
    "OrderID" BIGINT NOT NULL,
    "StartsAt" TIMESTAMP(6) NOT NULL,
    "EndsAt" TIMESTAMP(6) NOT NULL,
    "CreatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tblSubscription_pkey" PRIMARY KEY ("SubscriptionID")
);

-- CreateIndex
CREATE UNIQUE INDEX "tblSubscriptionPlan_Tier_Months_key" ON "tblSubscriptionPlan"("Tier", "Months");

-- CreateIndex
CREATE UNIQUE INDEX "tblPaymentOrder_OrderRef_key" ON "tblPaymentOrder"("OrderRef");

-- CreateIndex
CREATE UNIQUE INDEX "tblPaymentOrder_TransactionID_key" ON "tblPaymentOrder"("TransactionID");

-- CreateIndex
CREATE INDEX "tblPaymentOrder_SubscriberID_idx" ON "tblPaymentOrder"("SubscriberID");

-- CreateIndex
CREATE INDEX "tblPaymentOrder_Status_idx" ON "tblPaymentOrder"("Status");

-- CreateIndex
CREATE UNIQUE INDEX "tblSubscription_OrderID_key" ON "tblSubscription"("OrderID");

-- CreateIndex
CREATE INDEX "tblSubscription_SubscriberID_idx" ON "tblSubscription"("SubscriberID");

-- AddForeignKey
ALTER TABLE "tblPaymentOrder" ADD CONSTRAINT "tblPaymentOrder_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblPaymentOrder" ADD CONSTRAINT "tblPaymentOrder_PlanID_fkey" FOREIGN KEY ("PlanID") REFERENCES "tblSubscriptionPlan"("PlanID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscription" ADD CONSTRAINT "tblSubscription_SubscriberID_fkey" FOREIGN KEY ("SubscriberID") REFERENCES "tblSubscriberRegistration"("SubscriberID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscription" ADD CONSTRAINT "tblSubscription_PlanID_fkey" FOREIGN KEY ("PlanID") REFERENCES "tblSubscriptionPlan"("PlanID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tblSubscription" ADD CONSTRAINT "tblSubscription_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "tblPaymentOrder"("OrderID") ON DELETE RESTRICT ON UPDATE CASCADE;

