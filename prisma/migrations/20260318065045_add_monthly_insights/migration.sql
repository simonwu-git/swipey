-- CreateTable
CREATE TABLE "monthly_insights" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "monthly_insights_month_key" ON "monthly_insights"("month");
