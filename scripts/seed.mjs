import { PrismaClient, CheckInStatus, GoalWorkflowStatus, MetricDirection, Quarter, Role, UomType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();

  for (const user of [
    {
      id: "admin-kabir",
      name: "Kabir Shah",
      email: "kabir.shah@atomquest.demo",
      role: Role.ADMIN,
      department: "People & Performance",
      title: "HRBP",
      managerId: null,
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
  ]) {
    await prisma.user.create({ data: user });
  }

  const goal = await prisma.goal.create({
    data: {
      employeeId: "emp-aarav",
      title: "Reduce ticket turnaround time",
      description: "Bring average TAT down through queue balancing and daily exception reviews.",
      thrustArea: "Operational Excellence",
      uomType: UomType.NUMERIC,
      metricDirection: MetricDirection.LOWER_IS_BETTER,
      targetValue: "18",
      weightage: 30,
      workflowStatus: GoalWorkflowStatus.APPROVED,
      lockedAt: new Date(),
    },
  });

  await prisma.checkIn.create({
    data: {
      quarter: Quarter.Q1,
      status: CheckInStatus.ON_TRACK,
      actualValue: "20",
      employeeComment: "Queue balancing live for two pods, trending down.",
      managerComment: "Good direction. Focus on aged backlog next.",
      employeeId: "emp-aarav",
      reviewedById: "mgr-meera",
      goalId: goal.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
