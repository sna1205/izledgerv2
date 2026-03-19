import type { ReactNode } from "react";
import { SkeletonSidebar, SkeletonTopBar } from "@/components/skeletons/SkeletonScaffold";

export function AppShellSkeleton({
  children,
  pageTitleWidth,
}: {
  children: ReactNode;
  pageTitleWidth?: string;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <SkeletonSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SkeletonTopBar pageTitleWidth={pageTitleWidth} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
