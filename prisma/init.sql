PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "role" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "managerId" TEXT,
  CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Goal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "thrustArea" TEXT NOT NULL,
  "uomType" TEXT NOT NULL,
  "metricDirection" TEXT NOT NULL,
  "targetValue" TEXT NOT NULL,
  "weightage" INTEGER NOT NULL,
  "workflowStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "isShared" BOOLEAN NOT NULL DEFAULT 0,
  "sharedGroupKey" TEXT,
  "sharedReadOnlyFields" BOOLEAN NOT NULL DEFAULT 0,
  "employeeId" TEXT NOT NULL,
  "lockedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Goal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Goal_employeeId_workflowStatus_idx" ON "Goal"("employeeId", "workflowStatus");

CREATE TABLE IF NOT EXISTS "CheckIn" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quarter" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "actualValue" TEXT NOT NULL,
  "employeeComment" TEXT,
  "managerComment" TEXT,
  "goalId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reviewedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckIn_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CheckIn_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CheckIn_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CheckIn_goalId_quarter_key" ON "CheckIn"("goalId", "quarter");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "goalId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fieldName" TEXT,
  "previousValue" TEXT,
  "newValue" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditLog_goalId_createdAt_idx" ON "AuditLog"("goalId", "createdAt");
