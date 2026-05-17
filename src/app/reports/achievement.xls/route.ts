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

  const rows = goals
    .map((goal) => {
      const latest = goal.checkIns[0];
      return `
        <tr>
          <td>${goal.employee.name}</td>
          <td>${goal.employee.department}</td>
          <td>${goal.title}</td>
          <td>${goal.thrustArea}</td>
          <td>${goal.targetValue}</td>
          <td>${latest?.actualValue ?? ""}</td>
          <td>${latest?.status ?? ""}</td>
          <td>${goal.workflowStatus}</td>
          <td>${goal.weightage}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Goal Title</th>
              <th>Thrust Area</th>
              <th>Target</th>
              <th>Actual Achievement</th>
              <th>Check-in Status</th>
              <th>Workflow Status</th>
              <th>Weightage</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${selectedUserId ? `${selectedUserId}-achievement-report` : "achievement-report"}.xls"`,
    },
  });
}
