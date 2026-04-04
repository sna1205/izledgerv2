import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  ChartCandlestick,
  ClipboardList,
  LayoutDashboard,
  ReceiptText,
} from "lucide-react";

export type AppNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

export type AppNavSection = {
  title: string;
  items: AppNavItem[];
};

function matchesPath(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

export const appNavSections: AppNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        match: (pathname) => pathname === "/dashboard",
      },
      {
        title: "Reviews",
        url: "/reviews",
        icon: ReceiptText,
        match: (pathname) => matchesPath(pathname, "/reviews"),
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
        match: (pathname) => matchesPath(pathname, "/analytics"),
      },
    ],
  },
  {
    title: "Trading",
    items: [
      {
        title: "Trades",
        url: "/trades",
        icon: ChartCandlestick,
        match: (pathname) => matchesPath(pathname, "/trades"),
      },
      {
        title: "Setups",
        url: "/setups",
        icon: ClipboardList,
        match: (pathname) => matchesPath(pathname, "/setups"),
      },
      {
        title: "Calculator",
        url: "/calculator",
        icon: Calculator,
        match: (pathname) => matchesPath(pathname, "/calculator"),
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Accounts",
        url: "/accounts",
        icon: BriefcaseBusiness,
        match: (pathname) => matchesPath(pathname, "/accounts"),
      },
    ],
  },
];

const detailPageTitles: Array<{ match: (pathname: string) => boolean; title: string }> = [
  { match: (pathname) => pathname === "/trades/new", title: "New Trade" },
  { match: (pathname) => pathname.endsWith("/edit") && pathname.startsWith("/trades/"), title: "Edit Trade" },
  { match: (pathname) => pathname.startsWith("/trades/"), title: "Trade Details" },
  { match: (pathname) => pathname === "/setups/new", title: "New Setup" },
  { match: (pathname) => pathname.startsWith("/setups/"), title: "Edit Setup" },
  { match: (pathname) => pathname.startsWith("/settings"), title: "Settings" },
];

export function getPageTitle(pathname: string) {
  const detailTitle = detailPageTitles.find((item) => item.match(pathname));

  if (detailTitle) {
    return detailTitle.title;
  }

  for (const section of appNavSections) {
    const item = section.items.find((entry) => entry.match(pathname));

    if (item) {
      return item.title;
    }
  }

  return "IZLedger";
}
