import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const selectedUserId = searchParams.get("user");

  const goals = await prisma.goal.findMany({
    where: selectedUserId ? { employeeId: selectedUserId } : undefined,
    include: {
      employee: true,
      checkIns: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: [{ employee: { name: "asc" } }, { title: "asc" }],
  });

  const lines = [
    [
      "Employee",
      "Department",
      "Goal Title",
      "Thrust Area",
      "Target",
      "Actual Achievement",
      "Check-in Status",
      "Workflow Status",
      "Weightage",
    ].join(","),
  ];

  for (const goal of goals) {
    const latest = goal.checkIns[0];
    const row = [
      goal.employee.name,
      goal.employee.department,
      goal.title,
      goal.thrustArea,
      goal.targetValue,
      latest?.actualValue ?? "",
      latest?.status ?? "",
      goal.workflowStatus,
      String(goal.weightage),
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`);

    lines.push(row.join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${selectedUserId ? `${selectedUserId}-achievement-report` : "achievement-report"}.csv"`,
    },
  });
}
