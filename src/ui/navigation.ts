import type { ComponentType } from "react";
import {
  IconBilling, IconCosts, IconCustomers, IconDispatch, IconFleet, IconLoads, IconPay, IconReports, IconSettings, IconToday,
} from "./icons";

export type Role = "owner" | "dispatcher" | "accounting" | "driver";

export type NavKey =
  | "today" | "loads" | "dispatch" | "billing" | "pay" | "fleet" | "costs" | "customers" | "reports" | "settings";

export type NavItemDef = { key: NavKey; label: string; href: string; icon: ComponentType<{ size?: number; className?: string }> };

/** The office menu, in order. Settings is drawn apart from the rest. */
export const NAV_ITEMS: NavItemDef[] = [
  { key: "today", label: "Today", href: "/today", icon: IconToday },
  { key: "loads", label: "Loads", href: "/loads", icon: IconLoads },
  { key: "dispatch", label: "Dispatch", href: "/dispatch", icon: IconDispatch },
  { key: "billing", label: "Billing", href: "/billing", icon: IconBilling },
  { key: "pay", label: "Driver pay", href: "/pay", icon: IconPay },
  { key: "fleet", label: "Fleet", href: "/fleet", icon: IconFleet },
  { key: "costs", label: "Costs", href: "/costs", icon: IconCosts },
  { key: "customers", label: "Customers", href: "/customers", icon: IconCustomers },
  { key: "reports", label: "Reports", href: "/reports", icon: IconReports },
  { key: "settings", label: "Settings", href: "/settings", icon: IconSettings },
];

/**
 * Who sees what (docs/spec/screens.md). Hidden sections are left out, never greyed.
 * Settings is always shown; what's inside it depends on the role.
 */
export const MENU_BY_ROLE: Record<Exclude<Role, "driver">, NavKey[]> = {
  owner: ["today", "loads", "dispatch", "billing", "pay", "fleet", "costs", "customers", "reports", "settings"],
  dispatcher: ["today", "loads", "dispatch", "fleet", "customers", "settings"],
  accounting: ["today", "loads", "billing", "pay", "fleet", "costs", "customers", "reports", "settings"],
};

export function menuFor(role: Exclude<Role, "driver">): NavItemDef[] {
  const allowed = new Set(MENU_BY_ROLE[role]);
  return NAV_ITEMS.filter((i) => allowed.has(i.key));
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  dispatcher: "Dispatcher",
  accounting: "Accounting",
  driver: "Driver",
};
