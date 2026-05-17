import { CheckInStatus, GoalWorkflowStatus, Quarter, Role, type User } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import { BugReportDialog } from "@/components/bug-report-dialog";
import { InteractiveCalendar } from "@/components/interactive-calendar";
import { PasswordField } from "@/components/password-field";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import {
  AnalyticsIcon,
  BellIcon,
  BookIcon,
  CheckIcon,
  GovernanceIcon,
  HomeIcon,
  ReviewIcon,
} from "@/components/topbar-icons";
import {
  createGoalAction,
  demoSsoAction,
  deleteGoalAction,
  loginAction,
  reviewGoalAction,
  saveCheckInAction,
  submitGoalsAction,
  unlockGoalsAction,
} from "@/app/actions";
import {
  calculateProgress,
  ensureSeedData,
  formatTarget,
  getPortalData,
  getWindowLabel,
  roleLabel,
  type PortalGoal,
} from "@/lib/portal";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ViewKey = "dashboard" | "goals" | "checkins" | "review" | "governance" | "analytics" | "profile";

type ViewItem = {
  key: ViewKey;
  label: string;
  hint: string;
  icon: "home" | "book" | "checkins" | "review" | "analytics" | "governance";
};

type FlashState = {
  message: string;
  type: "error" | "success";
};

type GoalDraftPrefill = {
  title?: string;
  description?: string;
  thrustArea?: string;
  uomType?: string;
  metricDirection?: string;
  targetValue?: string;
  weightage?: string;
};

function getViews(role: Role): ViewItem[] {
  if (role === Role.EMPLOYEE) {
    return [
      { key: "dashboard", label: "Home", hint: "Overview", icon: "home" },
      { key: "goals", label: "Goal Sheets", hint: "Create & submit", icon: "book" },
      { key: "checkins", label: "Check-ins", hint: "Quarter progress", icon: "checkins" },
    ];
  }

  if (role === Role.MANAGER) {
    return [
      { key: "dashboard", label: "Home", hint: "Team overview", icon: "home" },
      { key: "review", label: "Review Queue", hint: "Approvals", icon: "review" },
      { key: "checkins", label: "Check-ins", hint: "Manager notes", icon: "checkins" },
    ];
  }

  return [
    { key: "dashboard", label: "Home", hint: "Cycle summary", icon: "home" },
    { key: "goals", label: "Goal Library", hint: "Org goals", icon: "book" },
    { key: "analytics", label: "Analytics", hint: "Heatmaps & trends", icon: "analytics" },
    { key: "governance", label: "Governance", hint: "Unlock & audit", icon: "governance" },
  ];
}

function getSafeView(role: Role, rawView?: string): ViewKey {
  if (rawView === "profile") {
    return "profile";
  }
  const views = getViews(role).map((item) => item.key);
  const fallback = views[0] ?? "dashboard";
  return rawView && views.includes(rawView as ViewKey) ? (rawView as ViewKey) : fallback;
}

function workflowChip(status: GoalWorkflowStatus) {
  switch (status) {
    case GoalWorkflowStatus.APPROVED:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case GoalWorkflowStatus.SUBMITTED:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case GoalWorkflowStatus.REWORK:
      return "border-rose-200 bg-rose-50 text-rose-700";
    case GoalWorkflowStatus.DRAFT:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function checkInChip(status: CheckInStatus) {
  switch (status) {
    case CheckInStatus.COMPLETED:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case CheckInStatus.ON_TRACK:
      return "border-blue-200 bg-blue-50 text-blue-700";
    case CheckInStatus.NOT_STARTED:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function card(extra?: string) {
  return `rounded-[24px] border border-[#e8ecf7] bg-white shadow-[0_10px_30px_rgba(17,24,39,0.04)] ${extra ?? ""}`;
}

function inputClassName() {
  return "mt-2 w-full rounded-2xl border border-[#dfe6f4] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#5773ff] focus:bg-white";
}

function formatQuarterLabel(quarter: Quarter) {
  return quarter.replace("Q", "Quarter ");
}

function FlashBanner({
  flash,
  clearHref,
}: {
  flash: FlashState;
  clearHref: string;
}) {
  const tone =
    flash.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <section className={`flex items-start justify-between gap-4 rounded-[22px] border px-5 py-4 ${tone}`}>
      <div>
        <p className="text-sm font-semibold">{flash.type === "error" ? "Please fix this" : "Done"}</p>
        <p className="mt-1 text-sm">{flash.message}</p>
      </div>
      <Link href={clearHref} className="rounded-xl border border-current/20 bg-white/50 px-3 py-2 text-xs font-medium">
        Close
      </Link>
    </section>
  );
}

function goalMatchesSearch(goal: PortalGoal, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    goal.title,
    goal.description,
    goal.thrustArea,
    goal.employee.name,
    goal.employee.department,
    goal.employee.title,
    goal.workflowStatus.replaceAll("_", " "),
    goal.uomType.replaceAll("_", " "),
    goal.metricDirection.replaceAll("_", " "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function TopBar({ user, activeView, searchQuery }: { user: User; activeView: ViewKey; searchQuery?: string }) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const profileHref = `/?user=${user.id}&view=profile`;

  return (
    <header className="sticky top-0 z-30 border-b border-[#e7ebf3] bg-white/96 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-4 md:px-6">
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 lg:flex">
          <Link href={`/?user=${user.id}&view=dashboard`} className="shrink-0 transition hover:opacity-90">
            <Image src="/atomberg-logo.svg" alt="Atomberg" width={156} height={42} className="h-10 w-auto" priority />
          </Link>
          <form className="flex w-full max-w-[620px] items-center gap-3 rounded-2xl border border-[#e4e9f5] bg-[#f8faff] px-4 py-3">
            <input type="hidden" name="user" value={user.id} />
            <input type="hidden" name="view" value={activeView} />
            <span className="text-slate-400">⌕</span>
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search goals, check-ins, employees..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </form>
        </div>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <BugReportDialog userId={user.id} selectedView={activeView} />
          <details className="relative">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-2xl border border-[#ffd98a] bg-[#f8bc28] text-white shadow-[0_8px_18px_rgba(248,188,40,0.22)]">
              <BellIcon className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-14 z-30 w-[320px] rounded-[24px] border border-[#e7ebf3] bg-white p-4 shadow-[0_20px_40px_rgba(17,24,39,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <span className="rounded-full bg-[#eef2ff] px-2 py-1 text-[11px] font-medium text-[#3553e6]">3 new</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">Goal submission window is active</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">Employees can draft, update, and submit goal sheets during the open cycle.</p>
                </div>
                <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">Review approvals pending</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">Managers should review submitted goal sheets before the next check-in window.</p>
                </div>
                <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">Approved sheets stay locked</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">Admin unlock is required for any post-approval goal edits.</p>
                </div>
              </div>
            </div>
          </details>
          <div className="flex items-center gap-3 rounded-2xl border border-[#dbe3f5] bg-white px-3 py-2">
            <Link href={profileHref} className="flex items-center gap-3 transition hover:opacity-85">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-semibold text-[#3d5afe]">
                {initials}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">
                  {roleLabel(user.role)} · {user.title}
                </p>
              </div>
            </Link>
            <Link
              href="/?loggedOut=1"
              className="rounded-xl border border-[#e1e7f6] bg-[#f8faff] px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-[#eef2ff]"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  user,
  activeView,
  views,
}: {
  user: User;
  activeView: ViewKey;
  views: ViewItem[];
}) {
  const renderIcon = (icon: ViewItem["icon"], active: boolean) => {
    const className = `h-5 w-5 ${active ? "text-white" : "text-white/60"}`;
    switch (icon) {
      case "home":
        return <HomeIcon className={className} />;
      case "book":
        return <BookIcon className={className} />;
      case "checkins":
        return <CheckIcon className={className} />;
      case "review":
        return <ReviewIcon className={className} />;
      case "analytics":
        return <AnalyticsIcon className={className} />;
      case "governance":
        return <GovernanceIcon className={className} />;
    }
  };

  return (
    <aside className="overflow-hidden rounded-[28px] bg-[#16213d] text-white shadow-[0_20px_40px_rgba(17,26,51,0.16)]">
      <div className="px-4 py-6">
        <p className="px-3 text-[11px] uppercase tracking-[0.34em] text-white/28">Dashboard</p>
        <div className="mt-3 space-y-1">
          {views.map((item) => (
            <Link
              key={item.key}
              href={`/?user=${user.id}&view=${item.key}`}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                activeView === item.key
                  ? "bg-[#2945c4] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-white/72 hover:bg-white/6"
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${activeView === item.key ? "bg-white/10" : "bg-white/4"}`}>
                {renderIcon(item.icon, activeView === item.key)}
              </span>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className={`text-xs ${activeView === item.key ? "text-white/58" : "text-white/34"}`}>{item.hint}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-white/8 px-6 py-5">
        <Link href={`/?user=${user.id}&view=profile`} className="block rounded-2xl transition hover:bg-white/5 hover:px-3 hover:py-2">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="mt-1 text-xs text-white/40">
            {roleLabel(user.role)} · {user.department}
          </p>
        </Link>
      </div>
    </aside>
  );
}

function CalendarCard() {
  return (
    <InteractiveCalendar />
  );
}

function EventCard({
  stamp,
  title,
  meta,
  tone,
  href,
}: {
  stamp: string;
  title: string;
  meta: string;
  tone: string;
  href?: string;
}) {
  const body = (
    <article className={`rounded-[20px] border px-4 py-4 transition hover:shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${tone}`}>
      <p className="text-sm font-medium text-slate-500">{stamp}</p>
      <h4 className="mt-3 text-lg font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-slate-600">{meta}</p>
    </article>
  );

  if (href) {
    return <Link href={href}>{body}</Link>;
  }

  return body;
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function EmptyState({
  title,
  subtitle,
  icon = "☐",
}: {
  title: string;
  subtitle: string;
  icon?: string;
}) {
  const useClipboardIllustration = icon === "☐";

  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#dfe6f4] bg-[#fbfcff] px-6 py-10 text-center">
      {useClipboardIllustration ? (
        <div className="relative h-28 w-28">
          <div className="absolute left-1 top-5 h-20 w-16 rotate-[-10deg] rounded-[16px] border border-[#aeb8cf] bg-white shadow-[0_8px_20px_rgba(17,24,39,0.04)]">
            <div className="absolute left-5 top-[-6px] h-3 w-3 rounded-full border-2 border-[#6a5cff] bg-white" />
            <div className="absolute left-3 top-0 h-4 w-10 rounded-b-xl rounded-t-lg bg-[#6a5cff]" />
            <div className="absolute inset-x-3 top-7 h-10 rounded-[10px] bg-[#eef1f7]" />
          </div>
          <div className="absolute right-1 top-8 h-20 w-16 rounded-[16px] border border-[#aeb8cf] bg-white shadow-[0_8px_20px_rgba(17,24,39,0.05)]">
            <div className="absolute left-5 top-[-6px] h-3 w-3 rounded-full border-2 border-[#6a5cff] bg-white" />
            <div className="absolute left-3 top-0 h-4 w-10 rounded-b-xl rounded-t-lg bg-[#6a5cff]" />
            <div className="absolute inset-x-3 top-7 h-10 rounded-[10px] bg-[#eef1f7]" />
          </div>
        </div>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eef2ff] text-3xl text-[#4d66ff]">
          {icon}
        </div>
      )}
      <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-700">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">{subtitle}</p>
    </div>
  );
}

function GoalSummaryCard({ goal }: { goal: PortalGoal }) {
  const latestCheckIn = goal.checkIns[0];
  const progress = calculateProgress(goal);

  return (
    <article className="rounded-[22px] border border-[#e7ebf3] bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{goal.title}</h3>
        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${workflowChip(goal.workflowStatus)}`}>
          {goal.workflowStatus.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{goal.description}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Target</p>
          <p className="mt-2 text-sm text-slate-900">{formatTarget(goal)}</p>
        </div>
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Weightage</p>
          <p className="mt-2 text-sm text-slate-900">{goal.weightage}%</p>
        </div>
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Progress</p>
          <p className="mt-2 text-sm text-slate-900">{progress}%</p>
        </div>
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Status</p>
          <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${checkInChip(latestCheckIn?.status ?? CheckInStatus.NOT_STARTED)}`}>
            {(latestCheckIn?.status ?? CheckInStatus.NOT_STARTED).replaceAll("_", " ")}
          </div>
        </div>
      </div>
    </article>
  );
}

function DraftGoalCard({
  user,
  goal,
}: {
  user: User;
  goal: PortalGoal;
}) {
  const latestCheckIn = goal.checkIns[0];
  const progress = calculateProgress(goal);

  return (
    <article className="rounded-[22px] border border-[#e7ebf3] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{goal.title}</h3>
            <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${workflowChip(goal.workflowStatus)}`}>
              {goal.workflowStatus.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">{goal.description}</p>
        </div>
        <form action={deleteGoalAction}>
          <input type="hidden" name="selectedUserId" value={user.id} />
          <input type="hidden" name="selectedView" value="goals" />
          <input type="hidden" name="employeeId" value={user.id} />
          <input type="hidden" name="goalId" value={goal.id} />
          <button
            aria-label="Remove draft"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-lg font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            ×
          </button>
        </form>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Target</p>
          <p className="mt-2 text-sm text-slate-900">{formatTarget(goal)}</p>
        </div>
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Weightage</p>
          <p className="mt-2 text-sm text-slate-900">{goal.weightage}%</p>
        </div>
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Progress</p>
          <p className="mt-2 text-sm text-slate-900">{progress}%</p>
        </div>
        <div className="rounded-2xl bg-[#f8faff] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Status</p>
          <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${checkInChip(latestCheckIn?.status ?? CheckInStatus.NOT_STARTED)}`}>
            {(latestCheckIn?.status ?? CheckInStatus.NOT_STARTED).replaceAll("_", " ")}
          </div>
        </div>
      </div>
    </article>
  );
}

function DashboardView({
  user,
  goals,
  currentQuarter,
  completionStats,
}: {
  user: User;
  goals: PortalGoal[];
  currentQuarter: Quarter;
  completionStats: {
    totalEmployees: number;
    approvedGoals: number;
    submittedGoals: number;
    completedCheckIns: number;
  };
}) {
  const recentGoals = goals.slice(0, 2);
  const checkinsHref = `/?user=${user.id}&view=checkins`;
  const reviewHref = `/?user=${user.id}&view=review`;
  const governanceHref = `/?user=${user.id}&view=governance`;
  const visibleGoalCount = Math.max(goals.length, 1);
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const progressRows = [
    {
      label: "Approved goals",
      value: completionStats.approvedGoals,
      total: visibleGoalCount,
      tone: "bg-[#3553e6]",
    },
    {
      label: "Submitted goals",
      value: completionStats.submittedGoals,
      total: visibleGoalCount,
      tone: "bg-[#f59e0b]",
    },
    {
      label: "Completed check-ins",
      value: completionStats.completedCheckIns,
      total: visibleGoalCount,
      tone: "bg-[#16a34a]",
    },
  ];
  const eventCards =
    user.role === Role.EMPLOYEE
      ? [
          {
            stamp: "This Week",
            title: "Goal submission window is open",
            meta: "Review your weightage, confirm the target values, and submit before manager approval begins.",
            tone: "border-[#dbe6ff] bg-[#f6f9ff]",
            href: `/?user=${user.id}&view=goals`,
          },
          {
            stamp: "Next Milestone",
            title: "Quarterly update reminder",
            meta: `${getWindowLabel(currentQuarter)} will need planned vs actual progress for every active goal item.`,
            tone: "border-[#efe4ff] bg-[#fbf8ff]",
            href: checkinsHref,
          },
        ]
      : user.role === Role.MANAGER
        ? [
            {
              stamp: "Review Queue",
              title: "Submitted goal sheets are waiting",
              meta: "Approve, tune weightage, or return items for rework from the dedicated review page.",
              tone: "border-[#fff0c7] bg-[#fffaf0]",
              href: reviewHref,
            },
            {
              stamp: "Manager Action",
              title: "Prepare quarterly check-in notes",
              meta: "Use the check-ins page to capture discussion comments for each team member.",
              tone: "border-[#dbe6ff] bg-[#f6f9ff]",
              href: checkinsHref,
            },
          ]
        : [
            {
              stamp: "Governance",
              title: "Audit and unlock requests",
              meta: "Monitor locked sheets, shared KPIs, and post-approval edits from one place.",
              tone: "border-[#ffe2e2] bg-[#fff7f7]",
              href: governanceHref,
            },
            {
              stamp: "Completion",
              title: "Cycle completion oversight",
              meta: "Keep an eye on submissions, check-ins, and which teams are falling behind.",
              tone: "border-[#dbe6ff] bg-[#f6f9ff]",
              href: `/?user=${user.id}&view=dashboard`,
            },
          ];
  return (
    <div className="space-y-6">
      <section className={card("p-5")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm text-slate-500">{todayLabel}</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-900">Welcome back, {user.name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Here&apos;s your portal overview for the current cycle, with the most important actions visible first.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-3">
            <div className="rounded-[20px] border border-[#e7ebf3] bg-[#fbfcff] px-4 py-4 text-center">
              <p className="text-3xl font-semibold text-[#3553e6]">{completionStats.approvedGoals}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Approved</p>
            </div>
            <div className="rounded-[20px] border border-[#e7ebf3] bg-[#fbfcff] px-4 py-4 text-center">
              <p className="text-3xl font-semibold text-[#15803d]">{visibleGoalCount}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Goals</p>
            </div>
            <div className="rounded-[20px] border border-[#e7ebf3] bg-[#fbfcff] px-4 py-4 text-center">
              <p className="text-3xl font-semibold text-[#7c3aed]">{completionStats.completedCheckIns}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Check-ins</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <div className={card("p-5")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionHeader title="Upcoming work" subtitle="The first things users should notice after login" />
              <div className="rounded-2xl bg-[#f8faff] px-4 py-2 text-sm font-medium text-slate-600">
                {formatQuarterLabel(currentQuarter)} · {getWindowLabel(currentQuarter)}
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {eventCards.map((item) => (
                <EventCard key={item.title} stamp={item.stamp} title={item.title} meta={item.meta} tone={item.tone} href={item.href} />
              ))}
            </div>
          </div>

          <div className={card("p-5")}>
            <SectionHeader title="Current goal items" subtitle="Active work in the portal right now" />
            <div className="mt-5 space-y-4">
              {recentGoals.length === 0 ? (
                <EmptyState
                  title="No active goals"
                  subtitle="When no goals exist yet, the dashboard should still feel clean and calm instead of empty and broken."
                />
              ) : (
                recentGoals.map((goal) => <GoalSummaryCard key={goal.id} goal={goal} />)
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div id="portal-calendar">
            <CalendarCard />
          </div>

          <div className={card("p-5")}>
            <SectionHeader title="Completion dashboard" subtitle="Current cycle performance at a glance" />
            <div className="mt-5 space-y-4">
              <div className="rounded-[20px] border border-[#e7ebf3] bg-[#fbfcff] p-4">
                <p className="text-sm text-slate-500">Current window</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{getWindowLabel(currentQuarter)}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Keep this visible so users know the current cycle stage as soon as they enter the dashboard.
                </p>
              </div>
              <div className="rounded-[20px] border border-[#e7ebf3] bg-white p-4">
                <p className="text-sm font-medium text-slate-900">Live progress</p>
                <div className="mt-4 space-y-4">
                  {progressRows.map((row) => {
                    const percent = Math.max(0, Math.min(100, Math.round((row.value / row.total) * 100)));
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{row.label}</span>
                          <span className="font-medium text-slate-900">
                            {row.value}/{row.total}
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 rounded-full bg-[#edf1f8]">
                          <div className={`h-2.5 rounded-full ${row.tone}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {user.role === Role.ADMIN ? (
                <Link
                  href="/reports/achievement.csv"
                  className="inline-flex rounded-2xl border border-[#dbe3f5] bg-[#f8faff] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                >
                  Export achievement report
                </Link>
              ) : (
                <Link
                  href={`/reports/achievement.csv?user=${user.id}`}
                  className="inline-flex rounded-2xl border border-[#dbe3f5] bg-[#f8faff] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                >
                  Export my achievement report
                </Link>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

function EmployeeGoalsView({
  user,
  goals,
  prefill,
}: {
  user: User;
  goals: PortalGoal[];
  prefill: GoalDraftPrefill;
}) {
  const totalWeight = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  const draftGoals = goals.filter(
    (goal) => goal.workflowStatus === GoalWorkflowStatus.DRAFT || goal.workflowStatus === GoalWorkflowStatus.REWORK,
  );
  const submittedGoals = goals.filter(
    (goal) => goal.workflowStatus === GoalWorkflowStatus.SUBMITTED || goal.workflowStatus === GoalWorkflowStatus.APPROVED,
  );

  return (
    <div className="space-y-6">
      <section className={card("p-6")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Goal Sheets</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900">Create and submit goals</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This page keeps goal work isolated, the same way college portals isolate courses, exams, and labs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/reports/achievement.csv?user=${user.id}`}
              className="rounded-2xl border border-[#dbe3f5] bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
            >
              Export my report
            </Link>
            <form action={submitGoalsAction}>
              <input type="hidden" name="selectedUserId" value={user.id} />
              <input type="hidden" name="selectedView" value="goals" />
              <input type="hidden" name="employeeId" value={user.id} />
              <button className="rounded-2xl bg-[#4d66ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3a54ee]">
                Submit draft goals
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">New goal</h3>
          <p className="mt-2 text-sm text-slate-500">Current total weightage: {totalWeight}%</p>
          <form action={createGoalAction} className="mt-5 space-y-4">
            <input type="hidden" name="selectedUserId" value={user.id} />
            <input type="hidden" name="selectedView" value="goals" />
            <input type="hidden" name="employeeId" value={user.id} />
            <label className="text-sm text-slate-600">
              Goal title
              <input name="title" defaultValue={prefill.title} className={inputClassName()} placeholder="Improve premium queue turnaround time" />
            </label>
            <label className="text-sm text-slate-600">
              Goal description
              <textarea
                name="description"
                defaultValue={prefill.description}
                rows={4}
                className={inputClassName()}
                placeholder="Describe the measurable outcome clearly."
              />
            </label>
            <label className="text-sm text-slate-600">
              Thrust area
              <input name="thrustArea" defaultValue={prefill.thrustArea} className={inputClassName()} placeholder="Operational Excellence" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                UoM
                <select name="uomType" defaultValue={prefill.uomType ?? "NUMERIC"} className={inputClassName()}>
                  <option value="NUMERIC">Numeric</option>
                  <option value="PERCENT">Percent</option>
                  <option value="TIMELINE">Timeline</option>
                  <option value="ZERO_BASED">Zero-based</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                Direction
                <select name="metricDirection" defaultValue={prefill.metricDirection ?? "HIGHER_IS_BETTER"} className={inputClassName()}>
                  <option value="HIGHER_IS_BETTER">Higher is better</option>
                  <option value="LOWER_IS_BETTER">Lower is better</option>
                  <option value="DATE_BASED">Date based</option>
                  <option value="ZERO_IS_SUCCESS">Zero is success</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                Target
                <input name="targetValue" defaultValue={prefill.targetValue} className={inputClassName()} placeholder="92 or 2026-06-30" />
              </label>
              <label className="text-sm text-slate-600">
                Weightage
                <input
                  name="weightage"
                  type="number"
                  min={10}
                  max={100}
                  defaultValue={prefill.weightage}
                  className={inputClassName()}
                  placeholder="25"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-2xl bg-[#4d66ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3a54ee]">
                Save draft goal
              </button>
              <button
                type="reset"
                className="rounded-2xl border border-[#dbe3f5] bg-[#f8faff] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                Clear form
              </button>
              <Link
                href={`/?user=${user.id}&view=goals`}
                className="rounded-2xl border border-[#dbe3f5] bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-[#f8faff]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className={card("p-5")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">Draft goals</h3>
                <p className="mt-2 text-sm text-slate-500">Saved drafts stay here until you submit them for review.</p>
              </div>
              <form action={submitGoalsAction}>
                <input type="hidden" name="selectedUserId" value={user.id} />
                <input type="hidden" name="selectedView" value="goals" />
                <input type="hidden" name="employeeId" value={user.id} />
                <button className="rounded-2xl bg-[#4d66ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3a54ee]">
                  Submit draft goals
                </button>
              </form>
            </div>
            <div className="mt-5 space-y-4">
              {draftGoals.length === 0 ? (
                <EmptyState
                  title="No draft goals"
                  subtitle="As soon as you save a draft goal, it will stay visible here until you submit it."
                />
              ) : (
                draftGoals.map((goal) => <DraftGoalCard key={goal.id} user={user} goal={goal} />)
              )}
            </div>
          </div>

          <div className={card("p-5")}>
            <h3 className="text-2xl font-semibold text-slate-900">Submitted and approved</h3>
            <div className="mt-5 space-y-4">
              {submittedGoals.length === 0 ? (
                <EmptyState
                  title="Nothing submitted yet"
                  subtitle="Submitted and approved goals will move into this list so the draft column stays easy to understand."
                />
              ) : (
                submittedGoals.map((goal) => <GoalSummaryCard key={goal.id} goal={goal} />)
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CheckinsView({
  user,
  goals,
  currentQuarter,
  managerMode,
}: {
  user: User;
  goals: PortalGoal[];
  currentQuarter: Quarter;
  managerMode: boolean;
}) {
  return (
    <div className="space-y-6">
      <section className={card("p-6")}>
        <p className="text-sm text-slate-500">Quarterly Check-ins</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900">
          {managerMode ? "Manager comments and team progress" : "Update actual achievements"}
        </h2>
        <p className="mt-3 text-sm text-slate-600">{getWindowLabel(currentQuarter)}</p>
      </section>

      <div className="space-y-4">
        {goals.length === 0 ? (
          <EmptyState
            title="No check-in items"
            subtitle="As soon as goals are created, quarterly updates will show up here in a much cleaner list."
          />
        ) : (
          goals.map((goal) => {
            const latest = goal.checkIns[0];

            return (
              <article key={goal.id} className={card("p-5")}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    {managerMode ? (
                      <p className="text-sm text-slate-500">{goal.employee.name}</p>
                    ) : null}
                    <h3 className="text-xl font-semibold text-slate-900">{goal.title}</h3>
                    <p className="mt-2 text-sm text-slate-500">Target {formatTarget(goal)}</p>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${checkInChip(latest?.status ?? CheckInStatus.NOT_STARTED)}`}>
                    {(latest?.status ?? CheckInStatus.NOT_STARTED).replaceAll("_", " ")}
                  </div>
                </div>

                <form action={saveCheckInAction} className="mt-5 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="selectedUserId" value={user.id} />
                  <input type="hidden" name="selectedView" value="checkins" />
                  <input type="hidden" name="employeeId" value={managerMode ? goal.employeeId : user.id} />
                  <input type="hidden" name="goalId" value={goal.id} />
                  <input type="hidden" name="quarter" value={currentQuarter} />
                  {managerMode ? <input type="hidden" name="reviewerId" value={user.id} /> : null}
                  <label className="text-sm text-slate-600">
                    Actual achievement
                    <input name="actualValue" defaultValue={latest?.actualValue ?? ""} className={inputClassName()} />
                  </label>
                  <label className="text-sm text-slate-600">
                    Status
                    <select name="status" defaultValue={latest?.status ?? CheckInStatus.NOT_STARTED} className={inputClassName()}>
                      <option value={CheckInStatus.NOT_STARTED}>Not Started</option>
                      <option value={CheckInStatus.ON_TRACK}>On Track</option>
                      <option value={CheckInStatus.COMPLETED}>Completed</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-600 md:col-span-2">
                    {managerMode ? "Manager comment" : "Employee comment"}
                    <textarea
                      name={managerMode ? "managerComment" : "employeeComment"}
                      defaultValue={managerMode ? latest?.managerComment ?? "" : latest?.employeeComment ?? ""}
                      rows={4}
                      className={inputClassName()}
                    />
                  </label>
                  <button className="w-fit rounded-2xl bg-[#4d66ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3a54ee]">
                    Save check-in
                  </button>
                </form>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function ReviewView({
  user,
  goals,
}: {
  user: User;
  goals: PortalGoal[];
}) {
  const reviewGoals = goals.filter((goal) => goal.workflowStatus === GoalWorkflowStatus.SUBMITTED);

  return (
    <div className="space-y-6">
      <section className={card("p-6")}>
        <p className="text-sm text-slate-500">Review Queue</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900">Approve submitted goal sheets</h2>
      </section>

      <div className="space-y-4">
        {reviewGoals.length === 0 ? (
          <EmptyState
            title="No review items"
            subtitle="Submitted goal sheets waiting for manager approval will appear here. Rework items return to the employee until they submit again."
          />
        ) : (
          reviewGoals.map((goal) => {
            const latest = goal.checkIns[0];

            return (
              <article key={goal.id} className={card("p-5")}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{goal.employee.name}</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">{goal.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{goal.description}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${workflowChip(goal.workflowStatus)}`}>
                    {goal.workflowStatus.replaceAll("_", " ")}
                  </span>
                </div>

                <form action={reviewGoalAction} className="mt-5 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="selectedUserId" value={user.id} />
                  <input type="hidden" name="selectedView" value="review" />
                  <input type="hidden" name="managerId" value={user.id} />
                  <input type="hidden" name="goalId" value={goal.id} />
                  <label className="text-sm text-slate-600">
                    Target
                    <input
                      name="targetValue"
                      defaultValue={goal.targetValue}
                      readOnly={goal.sharedReadOnlyFields}
                      className={`${inputClassName()} read-only:cursor-not-allowed read-only:text-slate-400`}
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    Weightage
                    <input name="weightage" type="number" min={10} max={100} defaultValue={goal.weightage} className={inputClassName()} />
                  </label>
                  <div className="rounded-2xl bg-[#f8faff] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Latest actual</p>
                    <p className="mt-2 text-sm text-slate-900">{latest?.actualValue ?? "Awaiting update"}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f8faff] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Latest status</p>
                    <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${checkInChip(latest?.status ?? CheckInStatus.NOT_STARTED)}`}>
                      {(latest?.status ?? CheckInStatus.NOT_STARTED).replaceAll("_", " ")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 md:col-span-2">
                    <button name="actionType" value="approve" className="rounded-2xl bg-[#4d66ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3a54ee]">
                      Approve and lock
                    </button>
                    <button name="actionType" value="rework" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100">
                      Return for rework
                    </button>
                  </div>
                </form>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function GovernanceView({
  user,
  goals,
}: {
  user: User;
  goals: PortalGoal[];
}) {
  const lockedEmployees = Array.from(
    new Set(goals.filter((goal) => goal.workflowStatus === GoalWorkflowStatus.APPROVED).map((goal) => goal.employeeId)),
  );

  return (
    <div className="space-y-6">
      <section className={card("p-6")}>
        <p className="text-sm text-slate-500">Governance</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900">Admin actions and audit history</h2>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">Unlock goal sheets</h3>
          <div className="mt-5 space-y-4">
            {lockedEmployees.length === 0 ? (
              <EmptyState title="No locked sheets" subtitle="Approved goal sheets ready for unlock will appear here." />
            ) : (
              lockedEmployees.map((employeeId) => {
                const employee = goals.find((goal) => goal.employeeId === employeeId)?.employee;
                if (!employee) {
                  return null;
                }

                return (
                  <form key={employeeId} action={unlockGoalsAction} className="rounded-2xl border border-[#e7ebf3] bg-[#fbfcff] p-4">
                    <input type="hidden" name="selectedUserId" value={user.id} />
                    <input type="hidden" name="selectedView" value="governance" />
                    <input type="hidden" name="adminId" value={user.id} />
                    <input type="hidden" name="employeeId" value={employeeId} />
                    <p className="text-base font-medium text-slate-900">{employee.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{employee.department}</p>
                    <button className="mt-4 rounded-2xl bg-[#4d66ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3a54ee]">
                      Unlock sheet
                    </button>
                  </form>
                );
              })
            )}
          </div>
        </div>

        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">Audit history</h3>
          <div className="mt-5 space-y-4">
            {goals.map((goal) => (
              <article key={goal.id} className="rounded-2xl border border-[#e7ebf3] bg-[#fbfcff] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-medium text-slate-900">{goal.title}</p>
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${workflowChip(goal.workflowStatus)}`}>
                    {goal.workflowStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{goal.employee.name}</p>
                <div className="mt-4 space-y-3">
                  {goal.auditLogs.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-[#e7ebf3] bg-white px-3 py-3 text-sm leading-6 text-slate-600">
                      <span className="font-medium text-slate-900">{entry.actor.name}</span> {entry.action.toLowerCase().replaceAll("_", " ")}
                      {entry.newValue ? ` -> ${entry.newValue}` : "."}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function AnalyticsView({
  goals,
}: {
  goals: PortalGoal[];
}) {
  const draftedOrReworkCount = goals.filter(
    (goal) => goal.workflowStatus === GoalWorkflowStatus.DRAFT || goal.workflowStatus === GoalWorkflowStatus.REWORK,
  ).length;
  const submittedCount = goals.filter((goal) => goal.workflowStatus === GoalWorkflowStatus.SUBMITTED).length;
  const completedCheckInCount = goals.reduce(
    (count, goal) => count + goal.checkIns.filter((checkIn) => checkIn.status === CheckInStatus.COMPLETED).length,
    0,
  );
  const totalEmployees = Math.max(new Set(goals.map((goal) => goal.employeeId)).size, 1);
  const quarterOrder: Quarter[] = [Quarter.Q1, Quarter.Q2, Quarter.Q3, Quarter.Q4];
  const quarterTrend = quarterOrder.map((quarter) => ({
    quarter,
    count: goals.reduce((count, goal) => count + goal.checkIns.filter((checkIn) => checkIn.quarter === quarter).length, 0),
  }));
  const thrustDistribution = Array.from(
    goals.reduce((map, goal) => {
      map.set(goal.thrustArea, (map.get(goal.thrustArea) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  );
  const uomDistribution = Array.from(
    goals.reduce((map, goal) => {
      map.set(goal.uomType, (map.get(goal.uomType) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  );
  const managerEffectiveness = Array.from(
    goals.reduce((map, goal) => {
      const key = goal.employee.managerId ?? "unassigned";
      const current = map.get(key) ?? { manager: key, total: 0, completed: 0 };
      current.total += goal.checkIns.length;
      current.completed += goal.checkIns.filter((checkIn) => checkIn.status === CheckInStatus.COMPLETED).length;
      map.set(key, current);
      return map;
    }, new Map<string, { manager: string; total: number; completed: number }>()),
  ).map(([, value]) => value);
  const departmentAnalytics = Array.from(
    goals.reduce((map, goal) => {
      const key = goal.employee.department;
      const current = map.get(key) ?? { department: key, goals: 0, completed: 0 };
      current.goals += 1;
      current.completed += goal.checkIns.some((checkIn) => checkIn.status === CheckInStatus.COMPLETED) ? 1 : 0;
      map.set(key, current);
      return map;
    }, new Map<string, { department: string; goals: number; completed: number }>()),
  ).map(([, value]) => value);
  const heatmapRows = thrustDistribution.map(([label, count]) => {
    const draft = goals.filter(
      (goal) =>
        goal.thrustArea === label &&
        (goal.workflowStatus === GoalWorkflowStatus.DRAFT || goal.workflowStatus === GoalWorkflowStatus.REWORK),
    ).length;
    const submitted = goals.filter((goal) => goal.thrustArea === label && goal.workflowStatus === GoalWorkflowStatus.SUBMITTED).length;
    const approved = goals.filter((goal) => goal.thrustArea === label && goal.workflowStatus === GoalWorkflowStatus.APPROVED).length;
    return { label, count, draft, submitted, approved };
  });

  return (
    <div className="space-y-6">
      <section className={card("p-6")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Analytics Module</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900">Heatmaps, trends, and completion analytics</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Quarter-on-quarter achievement trends, distribution by thrust area and UoM, and manager check-in effectiveness in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports/achievement.csv"
              className="rounded-2xl border border-[#dbe3f5] bg-[#f8faff] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Export CSV
            </Link>
            <Link
              href="/reports/achievement.xls"
              className="rounded-2xl border border-[#dbe3f5] bg-[#f8faff] px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
            >
              Export Excel
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <div className={card("p-5")}>
          <p className="text-sm text-slate-500">Employees covered</p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">{totalEmployees}</h3>
          <p className="mt-2 text-sm text-slate-500">Individual, team, and department analytics start from the active portal roster.</p>
        </div>
        <div className={card("p-5")}>
          <p className="text-sm text-slate-500">Completed check-ins</p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">{completedCheckInCount}</h3>
          <p className="mt-2 text-sm text-slate-500">Quarterly updates already closed and ready for achievement reporting.</p>
        </div>
        <div className={card("p-5")}>
          <p className="text-sm text-slate-500">Manager queue</p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">{submittedCount}</h3>
          <p className="mt-2 text-sm text-slate-500">Goal sheets still waiting for L1 approval in the current cycle.</p>
        </div>
        <div className={card("p-5")}>
          <p className="text-sm text-slate-500">Escalation watchlist</p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">{draftedOrReworkCount}</h3>
          <p className="mt-2 text-sm text-slate-500">Items at risk because employees still need to finish draft or rework actions.</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">Quarter-on-quarter achievements</h3>
          <div className="mt-5 space-y-4">
            {quarterTrend.map((item) => (
              <div key={item.quarter}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{item.quarter}</span>
                  <span className="font-medium text-slate-900">{item.count} check-ins</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-[#edf1f8]">
                  <div className="h-2.5 rounded-full bg-[#3553e6]" style={{ width: `${Math.min(100, item.count * 25)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">Goal status heatmap</h3>
          <div className="mt-5 overflow-hidden rounded-[20px] border border-[#e7ebf3]">
            <div className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] bg-[#f8faff] text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <div className="px-4 py-3">Thrust area</div>
              <div className="px-4 py-3 text-center">Draft</div>
              <div className="px-4 py-3 text-center">Submitted</div>
              <div className="px-4 py-3 text-center">Approved</div>
            </div>
            {heatmapRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] border-t border-[#eef2f8] bg-white">
                <div className="px-4 py-4 text-sm font-medium text-slate-700">{row.label}</div>
                <div className="px-4 py-4">
                  <div className={`rounded-2xl px-3 py-3 text-center text-sm font-semibold ${row.draft > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400"}`}>
                    {row.draft}
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className={`rounded-2xl px-3 py-3 text-center text-sm font-semibold ${row.submitted > 0 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-400"}`}>
                    {row.submitted}
                  </div>
                </div>
                <div className="px-4 py-4">
                  <div className={`rounded-2xl px-3 py-3 text-center text-sm font-semibold ${row.approved > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"}`}>
                    {row.approved}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className={card("p-5")}>
          <h3 className="text-xl font-semibold text-slate-900">Goal distribution by thrust area</h3>
          <div className="mt-5 space-y-4">
            {thrustDistribution.map(([label, count]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-[#edf1f8]">
                  <div className="h-2.5 rounded-full bg-[#f59e0b]" style={{ width: `${Math.min(100, count * 20)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={card("p-5")}>
          <h3 className="text-xl font-semibold text-slate-900">UoM type mix</h3>
          <div className="mt-5 flex flex-wrap gap-2">
            {uomDistribution.map(([label, count]) => (
              <span key={label} className="rounded-full bg-[#f5f7fb] px-3 py-2 text-sm font-medium text-slate-600">
                {label.replaceAll("_", " ")}: {count}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-500">
            This breaks down analytics by UoM type so evaluators can quickly see whether teams are over-indexed on one style of measurement.
          </p>
        </div>

        <div className={card("p-5")}>
          <h3 className="text-xl font-semibold text-slate-900">Manager effectiveness</h3>
          <div className="mt-5 space-y-4">
            {managerEffectiveness.map((item) => {
              const percent = item.total === 0 ? 0 : Math.round((item.completed / item.total) * 100);
              return (
                <div key={item.manager}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.manager === "mgr-meera" ? "Meera Rao" : item.manager}</span>
                    <span className="font-medium text-slate-900">{percent}%</span>
                  </div>
                  <div className="mt-2 h-2.5 rounded-full bg-[#edf1f8]">
                    <div className="h-2.5 rounded-full bg-[#16a34a]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">Department analytics</h3>
          <div className="mt-5 space-y-4">
            {departmentAnalytics.map((item) => {
              const percent = item.goals === 0 ? 0 : Math.round((item.completed / item.goals) * 100);
              return (
                <div key={item.department} className="rounded-[20px] border border-[#e7ebf3] bg-[#fbfcff] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.department}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.completed}/{item.goals} goals with completed check-ins
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-slate-900">{percent}%</span>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-[#edf1f8]">
                    <div className="h-2.5 rounded-full bg-[#3553e6]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileView({
  user,
}: {
  user: User;
}) {
  const identityLabel = user.role === Role.ADMIN ? "Admin / HR" : user.role === Role.MANAGER ? "Manager L1" : "Employee";
  const linkedTools = [
    { label: "Primary email", value: user.email, status: "Connected" },
    { label: "Microsoft Teams", value: `${user.id}@teams.atomberg.demo`, status: "Linked" },
    { label: "Zoom / Meet", value: `${user.id}.meet-room`, status: "Ready" },
    { label: "Escalation route", value: user.role === Role.ADMIN ? "HR governance desk" : "Manager approval chain", status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <section className={card("p-6")}>
        <p className="text-sm text-slate-500">Profile</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900">{user.name}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Identity details, work profile, and connected communication tools for this portal user.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">Account details</h3>
          <div className="mt-5 space-y-4">
            {[
              { label: "Portal role", value: identityLabel },
              { label: "Title", value: user.title },
              { label: "Department", value: user.department },
              { label: "Email ID", value: user.email },
              { label: "Employee / staff code", value: user.id.toUpperCase() },
            ].map((item) => (
              <div key={item.label} className="rounded-[20px] border border-[#e7ebf3] bg-[#fbfcff] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-base font-medium text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={card("p-5")}>
          <h3 className="text-2xl font-semibold text-slate-900">Connected tools</h3>
          <div className="mt-5 space-y-4">
            {linkedTools.map((tool) => (
              <div key={tool.label} className="rounded-[20px] border border-[#e7ebf3] bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{tool.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{tool.value}</p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {tool.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[22px] border border-dashed border-[#dfe6f4] bg-[#fbfcff] px-4 py-4 text-sm leading-7 text-slate-500">
            Use this page as the profile destination when users click their name, instead of leaving the identity area dead or non-interactive.
          </div>
        </div>
      </section>
    </div>
  );
}

function LoginView({
  message,
  selectedRole,
  username,
}: {
  message?: string;
  selectedRole: Role;
  username?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fd] px-6 py-10">
      <section className="w-full max-w-xl rounded-[30px] border border-[#dde5f3] bg-white p-8 shadow-[0_24px_60px_rgba(17,24,39,0.08)]">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <Image src="/atomberg-logo.svg" alt="Atomberg" width={160} height={50} className="h-14 w-auto" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.05em] text-slate-900">Portal Login</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">Sign in with your role, identity, and password to open the correct portal.</p>
        </div>

        <form action={loginAction} className="mt-8 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-700">Role</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="flex items-center gap-2 rounded-2xl border border-[#dfe6f4] bg-[#fbfcff] px-4 py-3 text-sm text-slate-700">
                <input type="radio" name="role" value={Role.EMPLOYEE} defaultChecked={selectedRole === Role.EMPLOYEE} />
                Employee
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-[#dfe6f4] bg-[#fbfcff] px-4 py-3 text-sm text-slate-700">
                <input type="radio" name="role" value={Role.MANAGER} defaultChecked={selectedRole === Role.MANAGER} />
                Manager
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-[#dfe6f4] bg-[#fbfcff] px-4 py-3 text-sm text-slate-700">
                <input type="radio" name="role" value={Role.ADMIN} defaultChecked={selectedRole === Role.ADMIN} />
                Admin
              </label>
            </div>
          </div>

          <label className="block text-sm text-slate-700">
            Username / Staff Code / Email
            <input name="username" defaultValue={username} placeholder="AQE1001 or aarav.nair@atomquest.demo" className={inputClassName()} />
          </label>

          <PasswordField className={inputClassName()} />

          {message ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>
          ) : null}

          <button className="w-full rounded-2xl bg-[#3553e6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2844cc]">
            Login
          </button>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              formAction={demoSsoAction}
              name="provider"
              value="google"
              className="w-full rounded-2xl border border-[#dbe3f5] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
            >
              Sign in with Google
            </button>
            <button
              formAction={demoSsoAction}
              name="provider"
              value="microsoft"
              className="w-full rounded-2xl border border-[#dbe3f5] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8faff]"
            >
              Sign in with Microsoft ID
            </button>
          </div>

          <div className="rounded-[22px] border border-dashed border-[#dfe6f4] bg-[#fbfcff] px-4 py-4 text-xs leading-6 text-slate-500">
            Demo logins:
            <br />
            Employee: AQE1001 / employee123
            <br />
            Manager: AQM2001 / manager123
            <br />
            Admin: AQA3001 / admin123
          </div>
        </form>
      </section>
    </main>
  );
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const loggedOut = typeof params.loggedOut === "string" && params.loggedOut === "1";
  const loginError = typeof params.loginError === "string" ? params.loginError : undefined;
  const loginRole =
    typeof params.loginRole === "string" && Object.values(Role).includes(params.loginRole as Role)
      ? (params.loginRole as Role)
      : Role.EMPLOYEE;
  const loginUsername = typeof params.loginUsername === "string" ? params.loginUsername : undefined;

  const flashMessage = typeof params.flashMessage === "string" ? params.flashMessage : undefined;
  const flashType =
    typeof params.flashType === "string" && (params.flashType === "error" || params.flashType === "success")
      ? params.flashType
      : undefined;
  const searchQuery = typeof params.q === "string" ? params.q.trim() : "";
  const goalPrefill: GoalDraftPrefill = {
    title: typeof params.goal_title === "string" ? params.goal_title : undefined,
    description: typeof params.goal_description === "string" ? params.goal_description : undefined,
    thrustArea: typeof params.goal_thrustArea === "string" ? params.goal_thrustArea : undefined,
    uomType: typeof params.goal_uomType === "string" ? params.goal_uomType : undefined,
    metricDirection: typeof params.goal_metricDirection === "string" ? params.goal_metricDirection : undefined,
    targetValue: typeof params.goal_targetValue === "string" ? params.goal_targetValue : undefined,
    weightage: typeof params.goal_weightage === "string" ? params.goal_weightage : undefined,
  };

  await ensureSeedData();
  const selectedUserId = typeof params.user === "string" ? params.user : undefined;
  if (!selectedUserId || loggedOut) {
    return <LoginView message={loginError} selectedRole={loginRole} username={loginUsername} />;
  }
  const data = await getPortalData(selectedUserId);
  const views = getViews(data.activeUser.role);
  const activeView = getSafeView(data.activeUser.role, typeof params.view === "string" ? params.view : undefined);
  const clearParams = new URLSearchParams({ user: data.activeUser.id, view: activeView });
  if (searchQuery) {
    clearParams.set("q", searchQuery);
  }
  const clearHref = `/?${clearParams.toString()}`;
  const flash: FlashState | null = flashMessage && flashType ? { message: flashMessage, type: flashType } : null;

  const baseVisibleGoals =
    data.activeUser.role === Role.EMPLOYEE
      ? data.employeeGoals
      : data.activeUser.role === Role.MANAGER
        ? data.teamGoals
        : data.orgGoals;
  const filteredEmployeeGoals = data.employeeGoals.filter((goal) => goalMatchesSearch(goal, searchQuery));
  const filteredTeamGoals = data.teamGoals.filter((goal) => goalMatchesSearch(goal, searchQuery));
  const filteredOrgGoals = data.orgGoals.filter((goal) => goalMatchesSearch(goal, searchQuery));
  const visibleGoals = baseVisibleGoals.filter((goal) => goalMatchesSearch(goal, searchQuery));

  return (
    <main className="min-h-screen bg-[#f4f7fd] text-slate-900">
      <div id="page-top" />
      <TopBar user={data.activeUser} activeView={activeView} searchQuery={searchQuery} />

      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 md:px-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar user={data.activeUser} activeView={activeView} views={views} />

        <section className="min-w-0">
          {flash ? <FlashBanner flash={flash} clearHref={clearHref} /> : null}

          {activeView === "dashboard" ? (
            <DashboardView
              user={data.activeUser}
              goals={visibleGoals}
              currentQuarter={data.currentQuarter}
              completionStats={data.completionStats}
            />
          ) : null}

          {activeView === "goals" && data.activeUser.role === Role.EMPLOYEE ? (
            <EmployeeGoalsView user={data.activeUser} goals={filteredEmployeeGoals} prefill={goalPrefill} />
          ) : null}

          {activeView === "goals" && data.activeUser.role === Role.ADMIN ? (
            <div className="space-y-6">
              <section className={card("p-6")}>
                <p className="text-sm text-slate-500">Goal Library</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-900">Organization-wide goals</h2>
              </section>
              <div className="space-y-4">
                {filteredOrgGoals.map((goal) => (
                  <GoalSummaryCard key={goal.id} goal={goal} />
                ))}
              </div>
            </div>
          ) : null}

          {activeView === "checkins" ? (
            <CheckinsView
              user={data.activeUser}
              goals={data.activeUser.role === Role.EMPLOYEE ? filteredEmployeeGoals : filteredTeamGoals}
              currentQuarter={data.currentQuarter}
              managerMode={data.activeUser.role === Role.MANAGER}
            />
          ) : null}

          {activeView === "review" && data.activeUser.role === Role.MANAGER ? (
            <ReviewView user={data.activeUser} goals={filteredTeamGoals} />
          ) : null}

          {activeView === "governance" && data.activeUser.role === Role.ADMIN ? (
            <GovernanceView user={data.activeUser} goals={filteredOrgGoals} />
          ) : null}

          {activeView === "analytics" && data.activeUser.role === Role.ADMIN ? <AnalyticsView goals={filteredOrgGoals} /> : null}

          {activeView === "profile" ? <ProfileView user={data.activeUser} /> : null}
        </section>
      </div>
      <ScrollToTopButton />
    </main>
  );
}
