/*
  Warnings:

  - You are about to drop the column `metaDescription` on the `Link` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Link" DROP COLUMN "metaDescription",
ADD COLUMN     "needsTitleFetch" BOOLEAN NOT NULL DEFAULT false;
