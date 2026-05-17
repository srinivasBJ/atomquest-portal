# AtomQuest Goals Portal

Hackathon submission for **AtomQuest Hackathon 1.0**  
Problem statement: **In-House Goal Setting & Tracking Portal**

This project delivers a browser-based portal for goal creation, approval, quarterly check-ins, reporting, and governance across three roles:

- `Employee`
- `Manager (L1)`
- `Admin / HR`

## What This Portal Covers

### Must-have flow implemented

- Employee goal creation and draft submission
- Goal fields:
  - Thrust Area
  - Goal Title
  - Goal Description
  - Unit of Measurement
  - Target
  - Weightage
- Validation rules:
  - total weightage must equal `100%`
  - minimum per-goal weightage must be `10%`
  - maximum goals per employee is `8`
- Manager review workflow:
  - review submitted goals
  - inline edit target and weightage
  - approve or return for rework
- Locked goals after approval
- Quarterly check-ins:
  - planned vs actual achievement
  - status tracking
  - employee comments
  - manager comments
- Progress calculation by UoM type
- Real-time completion dashboard
- Achievement report export:
  - `CSV`
  - `Excel-compatible`
- Governance:
  - goal unlock flow
  - audit history
- Analytics:
  - quarter-on-quarter trends
  - completion heatmap
  - thrust-area distribution
  - UoM mix
  - manager effectiveness

### Included for demo UX

- Portal-style login page with role-based sign-in
- Demo SSO entry buttons for Google and Microsoft ID
- Role-specific seeded user journeys
- Search across goals and portal records
- Bug report dialog

## Optional / Future Enhancements

The current submission focuses on the core portal flow first. The following areas can be extended further in future iterations:

- Google sign-in
- Microsoft ID sign-in
- Microsoft Entra / Azure AD org sync
- Email notifications
- Microsoft Teams integration
- Rule-based escalations
- Bug reporting workflow with inbox or ticket routing

## Tech Stack

- `Next.js 16` App Router
- `React 19`
- `TypeScript`
- `Prisma`
- `SQLite`
- `Tailwind CSS v4`
- Server Actions for workflow mutations

## Demo Credentials

### Standard login

- `Employee`: `AQE1001` / `employee123`
- `Manager`: `AQM2001` / `manager123`
- `Admin`: `AQA3001` / `admin123`

### Seeded portal users

- Employee user id: `emp-aarav`
- Manager user id: `mgr-meera`
- Admin user id: `admin-kabir`

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Prepare environment and database

```bash
cp .env.example .env
rm -f prisma/dev.db
sqlite3 prisma/dev.db < prisma/init.sql
```

3. Start development server

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

4. Or start production build locally

```bash
npm run build
npm run start -- --port 3002
```

Production preview URL:

```text
http://localhost:3002
```

## Report Exports

- CSV: `/reports/achievement.csv`
- Excel-compatible: `/reports/achievement.xls`

Employee-specific CSV export is also available from the employee flow.

## Architecture

```mermaid
flowchart TD
    U["Employee / Manager / Admin"] --> N["Next.js 16 Portal UI"]
    N --> A["Server Actions"]
    A --> P["Prisma ORM"]
    P --> D["SQLite Database"]

    N --> R["CSV / XLS Report Routes"]
    A --> G["Goal Workflow Logic"]
    A --> C["Check-in Logic"]
    A --> AU["Audit Logging"]

    G --> D
    C --> D
    AU --> D
    R --> D
```

## Key Data Model

- `User`
- `Goal`
- `CheckIn`
- `AuditLog`

Important enums:

- `Role`
- `UomType`
- `MetricDirection`
- `GoalWorkflowStatus`
- `Quarter`
- `CheckInStatus`

## Submission Note

This repository is optimized for a strong hackathon MVP:

- end-to-end role journeys are available
- must-have BRD workflow is covered
- optional enterprise integrations can be extended further if needed

## Deployment

Recommended platform:

- `Vercel` for the web app

After pushing to GitHub:

1. Import the repo into Vercel
2. Set environment variable:
   - `DATABASE_URL=file:./dev.db`
3. Run a deploy

For production-grade deployment, SQLite should eventually be replaced with a hosted database.
