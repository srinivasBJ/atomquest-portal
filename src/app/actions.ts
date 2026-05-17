"use server";

import { CheckInStatus, GoalWorkflowStatus, MetricDirection, Quarter, Role, UomType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createGoalSchema = z.object({
  selectedUserId: z.string().min(1),
  selectedView: z.string().optional(),
  employeeId: z.string().min(1),
  title: z.string().min(3).max(80),
  description: z.string().min(10).max(300),
  thrustArea: z.string().min(2).max(60),
  uomType: z.nativeEnum(UomType),
  metricDirection: z.nativeEnum(MetricDirection),
  targetValue: z.string().min(1).max(40),
  weightage: z.coerce.number().int().min(10).max(100),
});

const reviewGoalSchema = z.object({
  selectedUserId: z.string().min(1),
  selectedView: z.string().optional(),
  managerId: z.string().min(1),
  goalId: z.string().min(1),
  weightage: z.coerce.number().int().min(10).max(100),
  targetValue: z.string().min(1).max(40),
  actionType: z.enum(["approve", "rework"]),
});

const checkInSchema = z.object({
  selectedUserId: z.string().min(1),
  selectedView: z.string().optional(),
  employeeId: z.string().min(1),
  goalId: z.string().min(1),
  quarter: z.nativeEnum(Quarter),
  actualValue: z.string().min(1).max(40),
  status: z.nativeEnum(CheckInStatus),
  employeeComment: z.string().max(300).optional(),
  managerComment: z.string().max(300).optional(),
  reviewerId: z.string().optional(),
});

const loginSchema = z.object({
  role: z.nativeEnum(Role),
  username: z.string().min(1),
  password: z.string().min(1),
});

const demoSsoSchema = z.object({
  role: z.nativeEnum(Role),
  provider: z.enum(["google", "microsoft"]),
});

const bugReportSchema = z.object({
  selectedUserId: z.string().min(1),
  selectedView: z.string().optional(),
  title: z.string().min(3).max(100),
  area: z.string().min(2).max(80),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  details: z.string().min(10).max(1000),
  steps: z.string().max(1000).optional(),
  email: z.string().email().optional().or(z.literal("")),
  confirmation: z.enum(["yes"]),
});

const goalDraftFieldNames = [
  "title",
  "description",
  "thrustArea",
  "uomType",
  "metricDirection",
  "targetValue",
  "weightage",
] as const;

const deleteGoalSchema = z.object({
  selectedUserId: z.string().min(1),
  selectedView: z.string().optional(),
  employeeId: z.string().min(1),
  goalId: z.string().min(1),
});

async function recordAudit(goalId: string, actorId: string, action: string, previousValue?: string, newValue?: string, fieldName?: string) {
  await prisma.auditLog.create({
    data: {
      goalId,
      actorId,
      action,
      previousValue,
      newValue,
      fieldName,
    },
  });
}

function bounce(
  selectedUserId: string,
  selectedView?: string,
  flash?: { type: "error" | "success"; message: string },
) {
  revalidatePath("/");
  const params = new URLSearchParams({ user: selectedUserId });
  if (selectedView) {
    params.set("view", selectedView);
  }
  if (flash) {
    params.set("flashType", flash.type);
    params.set("flashMessage", flash.message);
  }
  redirect(`/?${params.toString()}`);
}

function bounceWithGoalDraft(
  selectedUserId: string,
  selectedView: string | undefined,
  source: Record<string, FormDataEntryValue | string | number | undefined>,
  flash: { type: "error" | "success"; message: string },
) {
  revalidatePath("/");
  const params = new URLSearchParams({ user: selectedUserId });
  if (selectedView) {
    params.set("view", selectedView);
  }
  params.set("flashType", flash.type);
  params.set("flashMessage", flash.message);

  for (const field of goalDraftFieldNames) {
    const value = source[field];
    if (typeof value === "string" && value.length > 0) {
      params.set(`goal_${field}`, value);
    } else if (typeof value === "number") {
      params.set(`goal_${field}`, String(value));
    }
  }

  redirect(`/?${params.toString()}`);
}

export async function createGoalAction(formData: FormData) {
  const parsedResult = createGoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    const selectedUserId = z.string().parse(formData.get("selectedUserId"));
    const selectedView = z.string().optional().parse(formData.get("selectedView"));
    return bounceWithGoalDraft(selectedUserId, selectedView, Object.fromEntries(formData), {
      type: "error",
      message: "Please fill every goal field correctly before saving.",
    });
  }
  const parsed = parsedResult.data;
  const existingGoals = await prisma.goal.findMany({
    where: {
      employeeId: parsed.employeeId,
      workflowStatus: {
        in: [GoalWorkflowStatus.DRAFT, GoalWorkflowStatus.REWORK, GoalWorkflowStatus.SUBMITTED, GoalWorkflowStatus.APPROVED],
      },
    },
  });

  if (existingGoals.length >= 8) {
    return bounceWithGoalDraft(parsed.selectedUserId, parsed.selectedView, parsed, {
      type: "error",
      message: "Employees can have a maximum of 8 goals.",
    });
  }

  await prisma.goal.create({
    data: {
      employeeId: parsed.employeeId,
      title: parsed.title,
      description: parsed.description,
      thrustArea: parsed.thrustArea,
      uomType: parsed.uomType,
      metricDirection: parsed.metricDirection,
      targetValue: parsed.targetValue,
      weightage: parsed.weightage,
      workflowStatus: GoalWorkflowStatus.DRAFT,
      auditLogs: {
        create: {
          actorId: parsed.employeeId,
          action: "GOAL_CREATED",
          newValue: `${parsed.title} (${parsed.weightage}%)`,
        },
      },
    },
  });

  bounce(parsed.selectedUserId, parsed.selectedView, {
    type: "success",
    message: "Draft goal saved.",
  });
}

export async function submitGoalsAction(formData: FormData) {
  const selectedUserId = z.string().parse(formData.get("selectedUserId"));
  const selectedView = z.string().optional().parse(formData.get("selectedView"));
  const employeeId = z.string().parse(formData.get("employeeId"));

  const goals = await prisma.goal.findMany({
    where: {
      employeeId,
      workflowStatus: {
        in: [GoalWorkflowStatus.DRAFT, GoalWorkflowStatus.REWORK],
      },
    },
  });

  const totalWeight = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  if (goals.length === 0 || totalWeight !== 100 || goals.some((goal) => goal.weightage < 10)) {
    return bounce(selectedUserId, selectedView, {
      type: "error",
      message: "Draft goals must total 100%, and each goal must be at least 10%.",
    });
  }

  await prisma.goal.updateMany({
    where: { id: { in: goals.map((goal) => goal.id) } },
    data: { workflowStatus: GoalWorkflowStatus.SUBMITTED },
  });

  for (const goal of goals) {
    await recordAudit(goal.id, employeeId, "GOALS_SUBMITTED", goal.workflowStatus, GoalWorkflowStatus.SUBMITTED, "workflowStatus");
  }

  bounce(selectedUserId, selectedView, {
    type: "success",
    message: "Goal sheet submitted for review.",
  });
}

export async function deleteGoalAction(formData: FormData) {
  const parsedResult = deleteGoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    const selectedUserId = z.string().parse(formData.get("selectedUserId"));
    const selectedView = z.string().optional().parse(formData.get("selectedView"));
    return bounce(selectedUserId, selectedView, {
      type: "error",
      message: "We could not remove that draft right now.",
    });
  }

  const parsed = parsedResult.data;
  const goal = await prisma.goal.findUnique({
    where: { id: parsed.goalId },
    select: {
      employeeId: true,
      workflowStatus: true,
      title: true,
    },
  });

  if (!goal || goal.employeeId !== parsed.employeeId) {
    return bounce(parsed.selectedUserId, parsed.selectedView, {
      type: "error",
      message: "That draft does not belong to this employee.",
    });
  }

  if (goal.workflowStatus !== GoalWorkflowStatus.DRAFT && goal.workflowStatus !== GoalWorkflowStatus.REWORK) {
    return bounce(parsed.selectedUserId, parsed.selectedView, {
      type: "error",
      message: "Only draft or rework goals can be removed here.",
    });
  }

  await prisma.goal.delete({
    where: { id: parsed.goalId },
  });

  bounce(parsed.selectedUserId, parsed.selectedView, {
    type: "success",
    message: `Removed draft goal: ${goal.title}.`,
  });
}

export async function reviewGoalAction(formData: FormData) {
  const parsedResult = reviewGoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    const selectedUserId = z.string().parse(formData.get("selectedUserId"));
    const selectedView = z.string().optional().parse(formData.get("selectedView"));
    return bounce(selectedUserId, selectedView, {
      type: "error",
      message: "Please correct the target and weightage before continuing.",
    });
  }
  const parsed = parsedResult.data;
  const existingGoal = await prisma.goal.findUniqueOrThrow({
    where: { id: parsed.goalId },
  });

  await prisma.goal.update({
    where: { id: parsed.goalId },
    data: {
      targetValue: parsed.targetValue,
      weightage: parsed.weightage,
      workflowStatus: parsed.actionType === "approve" ? GoalWorkflowStatus.APPROVED : GoalWorkflowStatus.REWORK,
      lockedAt: parsed.actionType === "approve" ? new Date() : null,
    },
  });

  await recordAudit(
    parsed.goalId,
    parsed.managerId,
    parsed.actionType === "approve" ? "GOAL_APPROVED" : "GOAL_RETURNED",
    `${existingGoal.targetValue} | ${existingGoal.weightage}%`,
    `${parsed.targetValue} | ${parsed.weightage}%`,
  );

  bounce(parsed.selectedUserId, parsed.selectedView, {
    type: "success",
    message: parsed.actionType === "approve" ? "Goal approved and locked." : "Goal returned for rework.",
  });
}

export async function saveCheckInAction(formData: FormData) {
  const parsedResult = checkInSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    const selectedUserId = z.string().parse(formData.get("selectedUserId"));
    const selectedView = z.string().optional().parse(formData.get("selectedView"));
    return bounce(selectedUserId, selectedView, {
      type: "error",
      message: "Please complete the check-in fields before saving.",
    });
  }
  const parsed = parsedResult.data;
  await prisma.checkIn.upsert({
    where: {
      goalId_quarter: {
        goalId: parsed.goalId,
        quarter: parsed.quarter,
      },
    },
    create: {
      goalId: parsed.goalId,
      employeeId: parsed.employeeId,
      quarter: parsed.quarter,
      actualValue: parsed.actualValue,
      status: parsed.status,
      employeeComment: parsed.employeeComment,
      managerComment: parsed.managerComment,
      reviewedById: parsed.reviewerId || null,
    },
    update: {
      actualValue: parsed.actualValue,
      status: parsed.status,
      employeeComment: parsed.employeeComment,
      managerComment: parsed.managerComment,
      reviewedById: parsed.reviewerId || null,
    },
  });

  await recordAudit(parsed.goalId, parsed.reviewerId || parsed.employeeId, "CHECK_IN_UPDATED", undefined, `${parsed.quarter} ${parsed.actualValue}`);
  bounce(parsed.selectedUserId, parsed.selectedView, {
    type: "success",
    message: "Check-in saved.",
  });
}

export async function unlockGoalsAction(formData: FormData) {
  const selectedUserId = z.string().parse(formData.get("selectedUserId"));
  const selectedView = z.string().optional().parse(formData.get("selectedView"));
  const adminId = z.string().parse(formData.get("adminId"));
  const employeeId = z.string().parse(formData.get("employeeId"));

  const goals = await prisma.goal.findMany({
    where: { employeeId, workflowStatus: GoalWorkflowStatus.APPROVED },
  });

  await prisma.goal.updateMany({
    where: { id: { in: goals.map((goal) => goal.id) } },
    data: { workflowStatus: GoalWorkflowStatus.REWORK, lockedAt: null },
  });

  for (const goal of goals) {
    await recordAudit(goal.id, adminId, "GOAL_UNLOCKED", GoalWorkflowStatus.APPROVED, GoalWorkflowStatus.REWORK, "workflowStatus");
  }

  bounce(selectedUserId, selectedView, {
    type: "success",
    message: "Approved goals unlocked for editing.",
  });
}

export async function switchPersonaAction(formData: FormData) {
  const selectedUserId = z.string().parse(formData.get("selectedUserId"));
  const selectedView = z.string().optional().parse(formData.get("selectedView"));
  bounce(selectedUserId, selectedView);
}

function redirectToLogin(message?: string, role?: Role, username?: string) {
  const params = new URLSearchParams({ loggedOut: "1" });
  if (message) {
    params.set("loginError", message);
  }
  if (role) {
    params.set("loginRole", role);
  }
  if (username) {
    params.set("loginUsername", username);
  }
  redirect(`/?${params.toString()}`);
}

export async function loginAction(formData: FormData) {
  const parsedResult = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    const rawRole = formData.get("role");
    const role = typeof rawRole === "string" && Object.values(Role).includes(rawRole as Role) ? (rawRole as Role) : undefined;
    const rawUsername = formData.get("username");
    const username = typeof rawUsername === "string" ? rawUsername : undefined;
    return redirectToLogin("Enter role, username, and password.", role, username);
  }

  const parsed = parsedResult.data;
  const normalizedUsername = parsed.username.trim().toLowerCase();

  const credentialsByRole = {
    [Role.EMPLOYEE]: {
      userId: "emp-aarav",
      password: "employee123",
      aliases: ["aqe1001", "aarav.nair", "aarav.nair@atomquest.demo"] as string[],
    },
    [Role.MANAGER]: {
      userId: "mgr-meera",
      password: "manager123",
      aliases: ["aqm2001", "meera.rao", "meera.rao@atomquest.demo"] as string[],
    },
    [Role.ADMIN]: {
      userId: "admin-kabir",
      password: "admin123",
      aliases: ["aqa3001", "kabir.shah", "kabir.shah@atomquest.demo"] as string[],
    },
  } as const;

  const selected = credentialsByRole[parsed.role];
  const isValid = selected.aliases.includes(normalizedUsername) && parsed.password === selected.password;

  if (!isValid) {
    return redirectToLogin("Invalid login details for the selected role.", parsed.role, parsed.username);
  }

  revalidatePath("/");
  redirect(`/?user=${selected.userId}&view=dashboard`);
}

export async function demoSsoAction(formData: FormData) {
  const parsedResult = demoSsoSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    return redirectToLogin("Choose a role before continuing with SSO.");
  }

  const selectedByRole = {
    [Role.EMPLOYEE]: "emp-aarav",
    [Role.MANAGER]: "mgr-meera",
    [Role.ADMIN]: "admin-kabir",
  } as const;

  revalidatePath("/");
  redirect(`/?user=${selectedByRole[parsedResult.data.role]}&view=dashboard&flashType=success&flashMessage=${encodeURIComponent(
    `${parsedResult.data.provider === "google" ? "Google" : "Microsoft ID"} demo sign-in connected.`,
  )}`);
}

export async function reportBugAction(formData: FormData) {
  const parsedResult = bugReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    const selectedUserId = z.string().parse(formData.get("selectedUserId"));
    const selectedView = z.string().optional().parse(formData.get("selectedView"));
    return bounce(selectedUserId, selectedView, {
      type: "error",
      message: "Please enter bug title, area, and severity before submitting.",
    });
  }

  const parsed = parsedResult.data;
  return bounce(parsed.selectedUserId, parsed.selectedView, {
    type: "success",
    message: `Bug reported: ${parsed.title}.`,
  });
}

export async function assertAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role !== Role.ADMIN) {
    throw new Error("Admin role required.");
  }
}
