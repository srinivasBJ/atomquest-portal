"use client";

import { useState } from "react";

export function PasswordField({
  className,
}: {
  className: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm text-slate-700">
      Password
      <div className="relative mt-2">
        <input
          name="password"
          type={visible ? "text" : "password"}
          placeholder="Enter password"
          className={`${className} mt-0 pr-14`}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-[#eef2ff] hover:text-slate-700"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
