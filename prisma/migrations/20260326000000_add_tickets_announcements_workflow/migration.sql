-- Migration: add Ticket, Announcement, WorkflowRun tables
-- Run on Coolify via: psql $DATABASE_URL -f migration.sql

-- Ticket
CREATE TABLE "Ticket" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "subject"   TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'open',
    "priority"  TEXT NOT NULL DEFAULT 'normal',
    "reply"     TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ticket_status_idx"  ON "Ticket"("status");
CREATE INDEX "Ticket_userId_idx"  ON "Ticket"("userId");

ALTER TABLE "Ticket"
    ADD CONSTRAINT "Ticket_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Announcement
CREATE TABLE "Announcement" (
    "id"        TEXT NOT NULL,
    "message"   TEXT NOT NULL,
    "color"     TEXT NOT NULL DEFAULT 'purple',
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "link"      TEXT,
    "linkText"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_isActive_idx" ON "Announcement"("isActive");

-- WorkflowRun
CREATE TABLE "WorkflowRun" (
    "id"         TEXT NOT NULL,
    "runAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schedule"   TEXT,
    "status"     TEXT NOT NULL DEFAULT 'success',
    "totalAds"   INTEGER NOT NULL DEFAULT 0,
    "newAds"     INTEGER NOT NULL DEFAULT 0,
    "updatedAds" INTEGER NOT NULL DEFAULT 0,
    "errors"     INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "notes"      TEXT,
    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowRun_runAt_idx"  ON "WorkflowRun"("runAt" DESC);
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");
