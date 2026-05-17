import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function BugIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="7" r="2" fill="currentColor" />
      <rect x="8" y="9" width="8" height="8" rx="3" fill="currentColor" />
      <path d="M9 6 7.5 4.5M15 6l1.5-1.5M7 11H4.5M7 14H4.5M17 11h2.5M17 14h2.5M9.5 17.5l-1.5 2M14.5 17.5l1.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 4.5c-3 0-5 2.3-5 5.2v2.4c0 1.3-.5 2.4-1.5 3.4h13c-1-1-1.5-2.1-1.5-3.4V9.7c0-2.9-2-5.2-5-5.2Z" fill="currentColor" />
      <path d="M10 18.2c.3 1.1 1 1.8 2 1.8s1.7-.7 2-1.8h-4Z" fill="currentColor" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M3.5 10.5 12 4l8.5 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h4.5v15H7a2.5 2.5 0 0 0-2.5 2.5V6.5Z" />
      <path d="M19.5 6.5A2.5 2.5 0 0 0 17 4h-5.5v15H17a2.5 2.5 0 0 1 2.5 2.5V6.5Z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 9h6" />
      <path d="m8.5 13 1.8 1.8 4.2-4.3" />
    </svg>
  );
}

export function ReviewIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H15l5 5v8.5A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M15 4v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3.5 19.5h17" />
    </svg>
  );
}

export function GovernanceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-4.1" />
    </svg>
  );
}
