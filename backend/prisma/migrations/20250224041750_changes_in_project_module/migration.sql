/*
  Warnings:

  - You are about to drop the column `is_active` on the `projects` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "project_type" AS ENUM ('MOBILE', 'WEB', 'DESKTOP');

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "is_active",
ADD COLUMN     "progress" INTEGER,
ADD COLUMN     "project_type" "project_type",
ADD COLUMN     "status" "status";

-- AlterTable
ALTER TABLE "teams" ALTER COLUMN "is_active" SET DEFAULT false;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "user_image" DROP NOT NULL;
