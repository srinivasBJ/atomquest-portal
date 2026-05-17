import {
  CheckInStatus,
  GoalWorkflowStatus,
  MetricDirection,
  Quarter,
  Role,
  UomType,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const demoUsers = [
  {
    id: "emp-aarav",
    name: "Aarav Nair",
    email: "aarav.nair@atomquest.demo",
    role: Role.EMPLOYEE,
    department: "Operations",
    title: "Senior Executive",
    managerId: "mgr-meera",
  },
  {
    id: "emp-isha",
    name: "Isha Sharma",
    email: "isha.sharma@atomquest.demo",
    role: Role.EMPLOYEE,
    department: "Operations",
    title: "Analyst",
    managerId: "mgr-meera",
  },
  {
    id: "mgr-meera",
    name: "Meera Rao",
    email: "meera.rao@atomquest.demo",
    role: Role.MANAGER,
    department: "Operations",
    title: "Operations Manager",
    managerId: "admin-kabir",
  },
  {
    id: "admin-kabir",
    name: "Kabir Shah",
    email: "kabir.shah@atomquest.demo",
    role: Role.ADMIN,
    department: "People & Performance",
    title: "HRBP",
    managerId: null,
  },
];

const seededGoals = [
  {
    employeeId: "emp-aarav",
    title: "Reduce ticket turnaround time",
    description: "Bring average TAT down through queue balancing and daily exception reviews.",
    thrustArea: "Operational Excellence",
    uomType: UomType.NUMERIC,
    metricDirection: MetricDirection.LOWER_IS_BETTER,
    targetValue: "18",
    weightage: 30,
    workflowStatus: GoalWorkflowStatus.APPROVED,
    isShared: false,
    sharedReadOnlyFields: false,
    sharedGroupKey: null,
  },
  {
    employeeId: "emp-aarav",
    title: "CSAT recovery sprint",
    description: "Lift post-resolution customer satisfaction for priority queues.",
    thrustArea: "Customer Experience",
    uomType: UomType.PERCENT,
    metricDirection: MetricDirection.HIGHER_IS_BETTER,
    targetValue: "92",
    weightage: 25,
    workflowStatus: GoalWorkflowStatus.APPROVED,
    isShared: false,
    sharedReadOnlyFields: false,
    sharedGroupKey: null,
  },
  {
    employeeId: "emp-aarav",
    title: "Zero compliance misses",
    description: "Maintain zero missed compliance checkpoints during the cycle.",
    thrustArea: "Governance",
    uomType: UomType.ZERO_BASED,
    metricDirection: MetricDirection.ZERO_IS_SUCCESS,
    targetValue: "0",
    weightage: 20,
    workflowStatus: GoalWorkflowStatus.APPROVED,
    isShared: true,
    sharedReadOnlyFields: true,
    sharedGroupKey: "ops-compliance",
  },
  {
    employeeId: "emp-aarav",
    title: "Launch revised SOP pack",
    description: "Publish and train the revised SOP set before the quarter deadline.",
    thrustArea: "Capability Building",
    uomType: UomType.TIMELINE,
    metricDirection: MetricDirection.DATE_BASED,
    targetValue: "2026-06-30",
    weightage: 25,
    workflowStatus: GoalWorkflowStatus.APPROVED,
    isShared: false,
    sharedReadOnlyFields: false,
    sharedGroupKey: null,
  },
  {
    employeeId: "emp-isha",
    title: "Reduce escalations in onboarding queue",
    description: "Close recurring defects driving first-week escalations.",
    thrustArea: "Operational Excellence",
    uomType: UomType.NUMERIC,
    metricDirection: MetricDirection.LOWER_IS_BETTER,
    targetValue: "10",
    weightage: 40,
    workflowStatus: GoalWorkflowStatus.SUBMITTED,
    isShared: false,
    sharedReadOnlyFields: false,
    sharedGroupKey: null,
  },
  {
    employeeId: "emp-isha",
    title: "Shared compliance KPI",
    description: "Maintain zero misses across onboarding compliance controls.",
    thrustArea: "Governance",
    uomType: UomType.ZERO_BASED,
    metricDirection: MetricDirection.ZERO_IS_SUCCESS,
    targetValue: "0",
    weightage: 30,
    workflowStatus: GoalWorkflowStatus.SUBMITTED,
    isShared: true,
    sharedReadOnlyFields: true,
    sharedGroupKey: "ops-compliance",
  },
  {
    employeeId: "emp-isha",
    title: "Automate onboarding health report",
    description: "Ship a weekly report to cut manual tracking time.",
    thrustArea: "Digital Efficiency",
    uomType: UomType.TIMELINE,
    metricDirection: MetricDirection.DATE_BASED,
    targetValue: "2026-07-15",
    weightage: 30,
    workflowStatus: GoalWorkflowStatus.SUBMITTED,
    isShared: false,
    sharedReadOnlyFields: false,
    sharedGroupKey: null,
  },
];

const seededCheckIns = [
  {
    goalTitle: "Reduce ticket turnaround time",
    quarter: Quarter.Q1,
    status: CheckInStatus.ON_TRACK,
    actualValue: "20",
    employeeComment: "Queue balancing live for two pods, trending down.",
    managerComment: "Good direction. Focus on aged backlog next.",
    employeeId: "emp-aarav",
    reviewedById: "mgr-meera",
  },
  {
    goalTitle: "CSAT recovery sprint",
    quarter: Quarter.Q1,
    status: CheckInStatus.COMPLETED,
    actualValue: "94",
    employeeComment: "Coaching and macros improved recovery scores.",
    managerComment: "Target exceeded. Sustain for Q2.",
    employeeId: "emp-aarav",
    reviewedById: "mgr-meera",
  },
  {
    goalTitle: "Zero compliance misses",
    quarter: Quarter.Q1,
    status: CheckInStatus.COMPLETED,
    actualValue: "0",
    employeeComment: "All checkpoints completed on time.",
    managerComment: "Strong discipline on this shared KPI.",
    employeeId: "emp-aarav",
    reviewedById: "mgr-meera",
  },
];

const goalInclude = {
  employee: true,
  checkIns: {
    orderBy: {
      createdAt: "desc" as const,
    },
  },
  auditLogs: {
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 6,
  },
} satisfies Prisma.GoalInclude;

export type PortalGoal = Prisma.GoalGetPayload<{
  include: typeof goalInclude;
}>;

export async function ensureSeedData() {
  const [existingUsers, existingGoals] = await Promise.all([prisma.user.count(), prisma.goal.count()]);
  if (existingUsers >= demoUsers.length && existingGoals >= seededGoals.length) {
    return;
  }

  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();

  for (const user of [demoUsers[3], demoUsers[2], demoUsers[0], demoUsers[1]]) {
    await prisma.user.create({
      data: user,
    });
  }

  for (const goal of seededGoals) {
    const createdGoal = await prisma.goal.create({
      data: {
        ...goal,
        lockedAt: goal.workflowStatus === GoalWorkflowStatus.APPROVED ? new Date() : null,
        auditLogs: {
          create: {
            actorId: goal.employeeId,
            action: "GOAL_CREATED",
            newValue: `${goal.title} (${goal.weightage}%)`,
          },
        },
      },
    });

    const relatedCheckIns = seededCheckIns.filter((item) => item.goalTitle === goal.title);
    for (const checkIn of relatedCheckIns) {
      await prisma.checkIn.create({
        data: {
          quarter: checkIn.quarter,
          status: checkIn.status,
          actualValue: checkIn.actualValue,
          employeeComment: checkIn.employeeComment,
          managerComment: checkIn.managerComment,
          employeeId: checkIn.employeeId,
          reviewedById: checkIn.reviewedById,
          goalId: createdGoal.id,
        },
      });
    }
  }
}

export function calculateProgress(goal: {
  uomType: UomType;
  metricDirection: MetricDirection;
  targetValue: string;
  checkIns: Array<{ actualValue: string; status: CheckInStatus }>;
}) {
  const latestCheckIn = goal.checkIns[0];
  if (!latestCheckIn) {
    return 0;
  }

  if (goal.uomType === UomType.ZERO_BASED) {
    return latestCheckIn.actualValue === "0" ? 100 : 0;
  }

  if (goal.uomType === UomType.TIMELINE) {
    return latestCheckIn.status === CheckInStatus.COMPLETED ? 100 : latestCheckIn.status === CheckInStatus.ON_TRACK ? 65 : 20;
  }

  const target = Number(goal.targetValue);
  const actual = Number(latestCheckIn.actualValue);
  if (!Number.isFinite(target) || !Number.isFinite(actual) || target === 0 || actual === 0) {
    return 0;
  }

  const ratio =
    goal.metricDirection === MetricDirection.LOWER_IS_BETTER ? target / actual : actual / target;

  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

export function currentQuarterFromDate(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 7 && month <= 9) {
    return Quarter.Q1;
  }
  if (month >= 10 && month <= 12) {
    return Quarter.Q2;
  }
  if (month >= 1 && month <= 2) {
    return Quarter.Q3;
  }
  return Quarter.Q4;
}

export function getWindowLabel(quarter: Quarter) {
  switch (quarter) {
    case Quarter.Q1:
      return "July check-in";
    case Quarter.Q2:
      return "October check-in";
    case Quarter.Q3:
      return "January check-in";
    case Quarter.Q4:
      return "March / April annual close";
  }
}

export async function getPortalData(selectedUserId?: string) {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const activeUser = users.find((user) => user.id === selectedUserId) ?? users[0];
  if (!activeUser) {
    throw new Error("No demo users found.");
  }

  const employeeGoals =
    activeUser.role === Role.EMPLOYEE
      ? await prisma.goal.findMany({
          where: { employeeId: activeUser.id },
          include: goalInclude,
          orderBy: { updatedAt: "desc" },
        })
      : [];

  const teamGoals =
    activeUser.role === Role.MANAGER
      ? await prisma.goal.findMany({
          where: { employee: { managerId: activeUser.id } },
          include: goalInclude,
          orderBy: [{ employee: { name: "asc" } }, { updatedAt: "desc" }],
        })
      : [];

  const orgGoals =
    activeUser.role === Role.ADMIN
      ? await prisma.goal.findMany({
          include: goalInclude,
          orderBy: [{ employee: { name: "asc" } }, { updatedAt: "desc" }],
        })
      : [];

  const dashboardGoals =
    activeUser.role === Role.EMPLOYEE
      ? employeeGoals
      : activeUser.role === Role.MANAGER
        ? teamGoals
        : orgGoals;
  const completionStats = {
    totalEmployees: users.filter((user) => user.role === Role.EMPLOYEE).length,
    approvedGoals: dashboardGoals.filter((goal) => goal.workflowStatus === GoalWorkflowStatus.APPROVED).length,
    submittedGoals: dashboardGoals.filter((goal) => goal.workflowStatus === GoalWorkflowStatus.SUBMITTED).length,
    completedCheckIns: dashboardGoals.reduce(
      (count, goal) => count + goal.checkIns.filter((checkIn) => checkIn.status === CheckInStatus.COMPLETED).length,
      0,
    ),
  };

  return {
    users,
    activeUser,
    employeeGoals,
    teamGoals,
    orgGoals,
    completionStats,
    currentQuarter: currentQuarterFromDate(),
  };
}

export function roleLabel(role: Role) {
  switch (role) {
    case Role.EMPLOYEE:
      return "Employee";
    case Role.MANAGER:
      return "Manager";
    case Role.ADMIN:
      return "Admin / HR";
  }
}

export function formatTarget(goal: { uomType: UomType; targetValue: string }) {
  if (goal.uomType === UomType.PERCENT) {
    return `${goal.targetValue}%`;
  }
  if (goal.uomType === UomType.TIMELINE) {
    return goal.targetValue;
  }
  return goal.targetValue;
}
