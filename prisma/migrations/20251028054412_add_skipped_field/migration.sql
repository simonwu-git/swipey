/*
  Warnings:

  - Added the required column `skipped` to the `import_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "import_logs" ADD COLUMN     "skipped" INTEGER NOT NULL;
