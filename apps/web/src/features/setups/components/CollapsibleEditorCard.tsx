import type { ReactNode } from "react";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/class-names";

export function CollapsibleEditorCard({
  title,
  defaultOpen = false,
  forceOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const open = forceOpen || isOpen;

  return (
    <section className="rounded-[30px] border border-border bg-card/90 shadow-sm transition-colors hover:border-border/90">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left sm:px-6"
        onClick={() => {
          if (!forceOpen) {
            setIsOpen((current) => !current);
          }
        }}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      <div
        id={contentId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/60 px-5 py-5 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
