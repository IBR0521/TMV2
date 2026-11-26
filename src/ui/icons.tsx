import type { ReactNode } from "react";

/** Line icons only: stroke 1.8, currentColor, no fills. 16px in the office app, 22px in the driver tab bar. */
type IconProps = { size?: number; className?: string };

function Svg({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconToday = (p: IconProps) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5V21H3z" /></Svg>;
export const IconLoads = (p: IconProps) => <Svg {...p}><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7" /></Svg>;
export const IconDispatch = (p: IconProps) => (
  <Svg {...p}><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></Svg>
);
export const IconBilling = (p: IconProps) => <Svg {...p}><path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6" /></Svg>;
export const IconPay = (p: IconProps) => <Svg {...p}><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Svg>;
export const IconFleet = (p: IconProps) => (
  <Svg {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" /></Svg>
);
export const IconCosts = (p: IconProps) => <Svg {...p}><path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6" /></Svg>;
export const IconCustomers = (p: IconProps) => <Svg {...p}><path d="M4 21V3h10v18M14 9h6v12M2 21h20M8 7h2M8 11h2M8 15h2" /></Svg>;
export const IconReports = (p: IconProps) => <Svg {...p}><path d="M5 20V11M12 20V4M19 20v-7M2 20h20" /></Svg>;
export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" />
  </Svg>
);
export const IconSearch = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>;
export const IconNavigate = (p: IconProps) => <Svg {...p}><path d="M3 11l18-8-8 18-2-8z" /></Svg>;
export const IconCamera = (p: IconProps) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>;
export const IconUser = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
export const IconChevronLeft = (p: IconProps) => <Svg {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const IconChevronRight = (p: IconProps) => <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>;
