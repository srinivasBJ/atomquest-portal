"use client";

import { useState } from "react";
import { reportBugAction } from "@/app/actions";
import { BugIcon } from "@/components/topbar-icons";

export function BugReportDialog({
  userId,
  selectedView,
}: {
  userId: string;
  selectedView: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ffb199] bg-[#ff7448] text-white shadow-[0_8px_18px_rgba(255,116,72,0.22)]"
        aria-label="Report bug"
      >
        <BugIcon className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-6 backdrop-blur-[2px]">
          <form action={reportBugAction} className="mt-12 w-full max-w-3xl rounded-[30px] border border-[#e6eaf3] bg-white p-6 text-slate-900 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <input type="hidden" name="selectedUserId" value={userId} />
            <input type="hidden" name="selectedView" value={selectedView} />
            <div className="flex items-start justify-between gap-4">
              <div className="w-full">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff4d6] text-[#f0a100]">
                    <BugIcon className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="mt-4 text-center text-4xl font-semibold tracking-[-0.05em] text-slate-900">Report a Bug</h3>
                <p className="mt-3 text-center text-base text-slate-500">Help us squash bugs by reporting issues you encounter.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e7ebf3] bg-[#f8faff] text-2xl text-slate-500"
                aria-label="Close bug report"
              >
                ×
              </button>
            </div>

            <div className="mt-8 space-y-5">
              <label className="block text-sm font-medium text-slate-900">
                Bug Title<span className="text-[#f0a100]"> *</span>
                <input
                  name="title"
                  className="mt-3 w-full rounded-2xl border border-[#dbe3f5] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f0a100] focus:bg-white"
                  placeholder="Brief description of the issue"
                />
              </label>

              <label className="block text-sm font-medium text-slate-900">
                Severity<span className="text-[#f0a100]"> *</span>
                <select
                  name="severity"
                  defaultValue="MEDIUM"
                  className="mt-3 w-full rounded-2xl border border-[#dbe3f5] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#f0a100] focus:bg-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-900">
                Affected Area<span className="text-[#f0a100]"> *</span>
                <select
                  name="area"
                  defaultValue=""
                  className="mt-3 w-full rounded-2xl border border-[#dbe3f5] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#f0a100] focus:bg-white"
                >
                  <option value="" disabled>
                    Select Affected Area
                  </option>
                  <option value="Goal Sheets">Goal Sheets</option>
                  <option value="Review Queue">Review Queue</option>
                  <option value="Check-ins">Check-ins</option>
                  <option value="Governance">Governance</option>
                  <option value="Analytics">Analytics</option>
                  <option value="Login">Login</option>
                  <option value="Exports">Exports</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-900">
                What happened?<span className="text-[#f0a100]"> *</span>
                <textarea
                  name="details"
                  rows={4}
                  className="mt-3 w-full rounded-2xl border border-[#dbe3f5] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f0a100] focus:bg-white"
                  placeholder="Describe the bug in detail. What did you expect to happen vs what actually happened?"
                />
              </label>

              <label className="block text-sm font-medium text-slate-900">
                Steps to Reproduce <span className="text-slate-400">(optional)</span>
                <textarea
                  name="steps"
                  rows={3}
                  className="mt-3 w-full rounded-2xl border border-[#dbe3f5] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f0a100] focus:bg-white"
                  placeholder={"1. Go to...\n2. Click on...\n3. See error..."}
                />
              </label>

              <label className="block text-sm font-medium text-slate-900">
                Email <span className="text-slate-400">(optional)</span>
                <input
                  name="email"
                  type="email"
                  className="mt-3 w-full rounded-2xl border border-[#dbe3f5] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f0a100] focus:bg-white"
                  placeholder="your@email.com"
                />
                <p className="mt-2 text-xs text-slate-500">We&apos;ll notify you when the bug is fixed.</p>
              </label>

              <label className="flex items-start gap-3 border-t border-[#eef2f8] pt-5 text-sm text-slate-700">
                <input type="checkbox" name="confirmation" value="yes" className="mt-1 h-4 w-4 rounded border-[#dbe3f5] bg-transparent" />
                <span>I confirm this is a genuine bug report and not a duplicate.</span>
              </label>

              <button className="w-full rounded-2xl bg-[#f7b928] px-5 py-4 text-base font-semibold text-slate-950 transition hover:bg-[#eca90c]">
                Submit Bug Report
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
