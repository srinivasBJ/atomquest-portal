"use client";

import { useMemo, useState } from "react";

function getMonthMatrix(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number; currentMonth: boolean }> = [];

  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    cells.push({ day: prevMonthDays - i, currentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, currentMonth: true });
  }

  while (cells.length < 35) {
    cells.push({ day: cells.length - daysInMonth - startWeekday + 1, currentMonth: false });
  }

  return cells;
}

export function InteractiveCalendar() {
  const [offset, setOffset] = useState(0);
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = useMemo(() => new Date(), []);
  const visibleDate = useMemo(() => new Date(today.getFullYear(), today.getMonth() + offset, 1), [offset, today]);
  const monthLabel = visibleDate.toLocaleString("en-US", { month: "long" });
  const year = visibleDate.getFullYear();
  const cells = getMonthMatrix(visibleDate);
  const isCurrentMonth = today.getMonth() === visibleDate.getMonth() && today.getFullYear() === visibleDate.getFullYear();

  return (
    <section className="rounded-[24px] border border-[#e8ecf7] bg-white p-5 shadow-[0_10px_30px_rgba(17,24,39,0.04)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">{monthLabel}</h3>
          <p className="mt-1 text-sm text-slate-500">Upcoming check-ins and reviews</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-[#eef2ff] px-3 py-2 text-sm font-medium text-[#3553e6]">
          <button
            type="button"
            onClick={() => setOffset((value) => value - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#3553e6] transition hover:bg-[#dfe7ff]"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="min-w-[94px] text-center">
            {monthLabel} {year}
          </span>
          <button
            type="button"
            onClick={() => setOffset((value) => value + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#3553e6] transition hover:bg-[#dfe7ff]"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 text-center">
        {weekdays.map((day) => (
          <div key={day} className="py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            {day}
          </div>
        ))}
        {cells.map((cell, index) => {
          const isToday = isCurrentMonth && cell.currentMonth && cell.day === today.getDate();
          return (
            <div
              key={`${cell.day}-${index}`}
              className={`flex h-11 items-center justify-center rounded-2xl text-sm ${
                isToday
                  ? "bg-[#4d66ff] font-semibold text-white"
                  : cell.currentMonth
                    ? "text-slate-700"
                    : "text-slate-300"
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </section>
  );
}
