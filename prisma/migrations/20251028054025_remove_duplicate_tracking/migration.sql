/*
  Warnings:

  - You are about to drop the column `duplicate_rows` on the `import_logs` table. All the data in the column will be lost.
  - You are about to drop the column `duplicates` on the `import_logs` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."transactions_transaction_date_amount_description_key";

-- AlterTable
ALTER TABLE "import_logs" DROP COLUMN "duplicate_rows",
DROP COLUMN "duplicates";
