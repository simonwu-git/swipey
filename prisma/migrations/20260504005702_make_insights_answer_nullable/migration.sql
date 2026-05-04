-- AlterTable
-- Makes `answer` nullable so the groupings endpoint can upsert a MonthlyInsight row
-- (with only `groupings` populated) before the insights stream has run for that month.
-- Without this, Prisma rejects the write because `answer` would be missing.
ALTER TABLE "monthly_insights" ALTER COLUMN "answer" DROP NOT NULL;
