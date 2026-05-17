"use client";

import { useEffect, useState } from "react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-[#dbe3f5] bg-white text-xl text-slate-700 shadow-[0_12px_30px_rgba(17,24,39,0.12)] transition hover:-translate-y-0.5 hover:bg-[#f8faff]"
      aria-label="Scroll to top"
    >
      ↑
    </button>
  );
}
