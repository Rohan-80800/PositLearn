-- CreateEnum
CREATE TYPE "Role" AS ENUM ('INTERN', 'EMPLOYEE', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PROJECT', 'USER');

-- CreateEnum
CREATE TYPE "Resource" AS ENUM ('CHEATSHEET', 'KT_SESSION');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "clerk_id" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "team_id" INTEGER,
    "user_image" TEXT NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "achievements" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("clerk_id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "team_name" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_team_history" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "project_team_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "project_name" VARCHAR(255) NOT NULL,
    "team_id" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "setup_guidelines" TEXT,
    "requirements" TEXT,
    "github_repository" VARCHAR(50),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "road_map" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" SERIAL NOT NULL,
    "resource_type" "Resource" NOT NULL,
    "title" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "resource" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" INTEGER NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_recent_changes" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "change_title" TEXT NOT NULL,
    "change_description" TEXT NOT NULL,
    "change_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_recent_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussions" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "project_id" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "doubt" TEXT NOT NULL,
    "is_answered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" SERIAL NOT NULL,
    "user_id" VARCHAR(50) NOT NULL,
    "project_id" INTEGER NOT NULL,
    "attempt_no" INTEGER NOT NULL DEFAULT 1,
    "quiz_result" JSONB NOT NULL,
    "status" "QuizStatus" NOT NULL DEFAULT 'PENDING',
    "time_taken" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "quiz_content" JSONB NOT NULL,
    "total_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_team_id_idx" ON "users"("team_id");

-- CreateIndex
CREATE INDEX "project_team_history_team_id_idx" ON "project_team_history"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_name_key" ON "projects"("project_name");

-- CreateIndex
CREATE INDEX "projects_team_id_idx" ON "projects"("team_id");

-- CreateIndex
CREATE INDEX "contents_project_id_idx" ON "contents"("project_id");

-- CreateIndex
CREATE INDEX "project_recent_changes_project_id_idx" ON "project_recent_changes"("project_id");

-- CreateIndex
CREATE INDEX "discussions_user_id_idx" ON "discussions"("user_id");

-- CreateIndex
CREATE INDEX "discussions_project_id_idx" ON "discussions"("project_id");

-- CreateIndex
CREATE INDEX "quizzes_user_id_idx" ON "quizzes"("user_id");

-- CreateIndex
CREATE INDEX "quizzes_project_id_idx" ON "quizzes"("project_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_history" ADD CONSTRAINT "project_team_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_recent_changes" ADD CONSTRAINT "project_recent_changes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("clerk_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("clerk_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
