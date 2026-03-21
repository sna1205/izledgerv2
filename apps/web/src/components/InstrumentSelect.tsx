import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { InstrumentCategoryGroup, InstrumentDefinition } from "@/lib/types";
import { INSTRUMENT_GROUPS, INSTRUMENTS_BY_VALUE } from "@/lib/types";

interface InstrumentSelectProps {
  value: string;
  onChange: (value: string) => void;
  categories?: InstrumentCategoryGroup[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  ariaLabel?: string;
}

interface InstrumentMatch extends InstrumentDefinition {
  score: number;
  originalIndex: number;
  searchContext?: string;
}

function getCategoryTone(category: InstrumentDefinition["category"]) {
  switch (category) {
    case "Forex":
      return {
        dot: "bg-sky-500 dark:bg-sky-400",
        sectionSurface: "bg-sky-500/[0.07] dark:bg-sky-400/[0.10]",
        sectionText: "text-sky-700 dark:text-sky-300",
        selectedSurface: "bg-sky-500/[0.10] dark:bg-sky-400/[0.14]",
        activeSurface: "bg-sky-500/[0.07] dark:bg-sky-400/[0.10]",
        accentBar: "bg-sky-500/80 dark:bg-sky-300/85",
        check: "text-sky-600 dark:text-sky-300",
      };
    case "Metals":
      return {
        dot: "bg-amber-500 dark:bg-amber-300",
        sectionSurface: "bg-amber-500/[0.08] dark:bg-amber-300/[0.11]",
        sectionText: "text-amber-700 dark:text-amber-300",
        selectedSurface: "bg-amber-500/[0.10] dark:bg-amber-300/[0.14]",
        activeSurface: "bg-amber-500/[0.07] dark:bg-amber-300/[0.10]",
        accentBar: "bg-amber-500/80 dark:bg-amber-300/85",
        check: "text-amber-600 dark:text-amber-300",
      };
    case "Crypto":
      return {
        dot: "bg-violet-500 dark:bg-violet-300",
        sectionSurface: "bg-violet-500/[0.08] dark:bg-violet-300/[0.12]",
        sectionText: "text-violet-700 dark:text-violet-300",
        selectedSurface: "bg-violet-500/[0.10] dark:bg-violet-300/[0.15]",
        activeSurface: "bg-violet-500/[0.07] dark:bg-violet-300/[0.10]",
        accentBar: "bg-violet-500/80 dark:bg-violet-300/85",
        check: "text-violet-600 dark:text-violet-300",
      };
    case "Indices":
      return {
        dot: "bg-teal-500 dark:bg-teal-300",
        sectionSurface: "bg-teal-500/[0.08] dark:bg-teal-300/[0.11]",
        sectionText: "text-teal-700 dark:text-teal-300",
        selectedSurface: "bg-teal-500/[0.10] dark:bg-teal-300/[0.14]",
        activeSurface: "bg-teal-500/[0.07] dark:bg-teal-300/[0.10]",
        accentBar: "bg-teal-500/80 dark:bg-teal-300/85",
        check: "text-teal-600 dark:text-teal-300",
      };
    case "Commodities":
    case "Stocks":
    default:
      return {
        dot: "bg-orange-500 dark:bg-orange-300",
        sectionSurface: "bg-orange-500/[0.08] dark:bg-orange-300/[0.11]",
        sectionText: "text-orange-700 dark:text-orange-300",
        selectedSurface: "bg-orange-500/[0.10] dark:bg-orange-300/[0.14]",
        activeSurface: "bg-orange-500/[0.07] dark:bg-orange-300/[0.10]",
        accentBar: "bg-orange-500/80 dark:bg-orange-300/85",
        check: "text-orange-600 dark:text-orange-300",
      };
  }
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compactSearchText(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function tokenizeSearchText(value: string) {
  return normalizeSearchText(value).split(/\s+/).filter(Boolean);
}

function createExpandedState(categories: InstrumentCategoryGroup[]) {
  return Object.fromEntries(categories.map((group) => [group.category, true])) as Record<string, boolean>;
}

function buildVisibleGroups(
  categories: InstrumentCategoryGroup[],
  normalizedSearchQuery: string,
  compactSearchQuery: string,
) {
  return categories
    .map((group) => {
      const categoryMatches = compactSearchQuery.length > 0 && compactSearchText(group.category).includes(compactSearchQuery);

      const matchedItems: InstrumentMatch[] = group.items
        .map((instrument, index) => {
          const score = categoryMatches
            ? 1
            : scoreInstrumentMatch(instrument, normalizedSearchQuery, compactSearchQuery);

          return {
            ...instrument,
            score,
            originalIndex: index,
            searchContext: resolveSearchContext(instrument, compactSearchQuery),
          };
        })
        .filter((instrument) => instrument.score > 0)
        .sort((left, right) => {
          if (!compactSearchQuery || categoryMatches) {
            return left.originalIndex - right.originalIndex;
          }

          return right.score - left.score || left.originalIndex - right.originalIndex;
        });

      return {
        category: group.category,
        items: matchedItems.map(({ score: _score, originalIndex: _originalIndex, ...instrument }) => instrument),
      };
    })
    .filter((group) => group.items.length > 0);
}

function scoreInstrumentMatch(instrument: InstrumentDefinition, normalizedQuery: string, compactQuery: string) {
  if (!compactQuery) {
    return 1;
  }

  const tokens = tokenizeSearchText(normalizedQuery);
  const valueCompact = compactSearchText(instrument.value);
  const labelCompact = compactSearchText(instrument.label);
  const nameCompact = compactSearchText(instrument.name ?? "");
  const categoryCompact = compactSearchText(instrument.category);
  const keywordCompacts = instrument.keywords.map(compactSearchText);
  const searchableTerms = [valueCompact, labelCompact, nameCompact, categoryCompact, ...keywordCompacts];

  const matchesAllTokens = tokens.every((token) => {
    const compactToken = compactSearchText(token);
    return compactToken ? searchableTerms.some((term) => term.includes(compactToken)) : true;
  });

  if (!matchesAllTokens) {
    return 0;
  }

  let score = 100;

  if (valueCompact === compactQuery || labelCompact === compactQuery) {
    score += 1000;
  } else if (nameCompact === compactQuery) {
    score += 880;
  } else if (valueCompact.startsWith(compactQuery) || labelCompact.startsWith(compactQuery)) {
    score += 700;
  } else if (nameCompact.startsWith(compactQuery)) {
    score += 620;
  } else if (valueCompact.includes(compactQuery) || labelCompact.includes(compactQuery)) {
    score += 520;
  } else if (nameCompact.includes(compactQuery)) {
    score += 420;
  }

  if (categoryCompact === compactQuery) {
    score += 360;
  } else if (categoryCompact.includes(compactQuery)) {
    score += 220;
  }

  const exactKeywordHit = keywordCompacts.some((keyword) => keyword === compactQuery);
  const partialKeywordHit = keywordCompacts.some((keyword) => keyword.includes(compactQuery));

  if (exactKeywordHit) {
    score += 460;
  } else if (partialKeywordHit) {
    score += 280;
  }

  score += Math.max(0, 24 - Math.min(valueCompact.length, 24));

  return score;
}

function formatKeywordLabel(keyword: string) {
  return keyword
    .split(" ")
    .map((part) => (part.length <= 3 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

function resolveSearchContext(instrument: InstrumentDefinition, compactQuery: string) {
  if (!compactQuery) {
    return undefined;
  }

  const nameCompact = compactSearchText(instrument.name ?? "");

  if (instrument.name && nameCompact.includes(compactQuery)) {
    return instrument.name;
  }

  const matchedKeyword = instrument.keywords.find((keyword) => compactSearchText(keyword).includes(compactQuery));

  if (!matchedKeyword) {
    return undefined;
  }

  if (compactSearchText(matchedKeyword) === compactSearchText(instrument.value)) {
    return instrument.name;
  }

  return formatKeywordLabel(matchedKeyword);
}

const InstrumentOptionRow = memo(function InstrumentOptionRow({
  instrument,
  isActive,
  isSelected,
  showSearchContext,
  onMouseEnter,
  onSelect,
  registerRef,
}: {
  instrument: InstrumentDefinition & { searchContext?: string };
  isActive: boolean;
  isSelected: boolean;
  showSearchContext: boolean;
  onMouseEnter: () => void;
  onSelect: () => void;
  registerRef: (node: HTMLButtonElement | null) => void;
}) {
  const tone = getCategoryTone(instrument.category);
  const secondaryText = showSearchContext
    ? instrument.searchContext ?? instrument.name
    : instrument.category !== "Forex"
      ? instrument.name
      : undefined;

  return (
    <button
      ref={registerRef}
      type="button"
      role="option"
      aria-selected={isSelected}
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
        "hover:bg-accent/35 dark:hover:bg-white/[0.04]",
        isActive && cn("text-foreground", tone.activeSurface),
        isSelected && cn("text-foreground shadow-sm", tone.selectedSurface),
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full opacity-0 transition-opacity",
          tone.accentBar,
          (isActive || isSelected) && "opacity-100",
        )}
      />
      <div className="min-w-0 space-y-0.5 pl-2">
        <p className={cn("truncate text-[13px] text-foreground", isSelected ? "font-medium" : "font-medium")}>{instrument.label}</p>
        {secondaryText ? (
          <p className="truncate text-[11px] text-muted-foreground/90">{secondaryText}</p>
        ) : null}
      </div>
      <div className="ml-3 flex shrink-0 items-center">
        <Check className={cn("h-3.5 w-3.5 transition-opacity", tone.check, isSelected ? "opacity-100" : "opacity-0")} />
      </div>
    </button>
  );
});

const InstrumentSection = memo(function InstrumentSection({
  category,
  items,
  expanded,
  selectedValue,
  activeValue,
  isSearching,
  onToggle,
  onSelect,
  onHover,
  registerRef,
}: {
  category: InstrumentCategoryGroup["category"];
  items: InstrumentDefinition[];
  expanded: boolean;
  selectedValue: string;
  activeValue?: string;
  isSearching: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
  onHover: (value: string) => void;
  registerRef: (value: string, node: HTMLButtonElement | null) => void;
}) {
  const tone = getCategoryTone(category);
  return (
    <section className="mt-2 first:mt-0">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "sticky top-1 z-10 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left backdrop-blur supports-[backdrop-filter]:bg-popover/82",
          "bg-popover/88 dark:bg-popover/78",
        )}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
          <p className="text-xs font-medium text-foreground/88">{category}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <span>{items.length}</span>
          <span className={cn("rounded-full px-1.5 py-0.5", tone.sectionSurface, tone.sectionText)}>
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="space-y-0.5 px-1 pt-1">
          {items.map((instrument) => (
            <InstrumentOptionRow
              key={instrument.value}
              instrument={instrument}
              isActive={activeValue === instrument.value}
              isSelected={selectedValue === instrument.value}
              showSearchContext={isSearching}
              onMouseEnter={() => onHover(instrument.value)}
              onSelect={() => onSelect(instrument.value)}
              registerRef={(node) => registerRef(instrument.value, node)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
});

export function InstrumentSelect({
  value,
  onChange,
  categories = INSTRUMENT_GROUPS,
  placeholder = "Select instrument",
  disabled = false,
  className,
  triggerClassName,
  ariaLabel = "Instrument",
}: InstrumentSelectProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => createExpandedState(categories));
  const [activeValue, setActiveValue] = useState<string | null>(value);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  const normalizedSearchQuery = useMemo(() => normalizeSearchText(searchQuery), [searchQuery]);
  const compactSearchQuery = useMemo(() => compactSearchText(searchQuery), [searchQuery]);

  const instrumentLookup = useMemo(() => {
    return new Map(categories.flatMap((group) => group.items.map((instrument) => [instrument.value, instrument])));
  }, [categories]);

  const selectedInstrument = instrumentLookup.get(value) ?? INSTRUMENTS_BY_VALUE[value];
  const selectedLabel = selectedInstrument?.label ?? value ?? placeholder;
  const isSearching = compactSearchQuery.length > 0;

  useEffect(() => {
    setExpandedSections((current) => ({ ...createExpandedState(categories), ...current }));
  }, [categories]);

  const visibleGroups = useMemo(
    () => buildVisibleGroups(categories, normalizedSearchQuery, compactSearchQuery),
    [categories, compactSearchQuery, normalizedSearchQuery],
  );

  const navigableValues = useMemo(
    () => visibleGroups
      .filter((group) => expandedSections[group.category] ?? true)
      .flatMap((group) => group.items.map((instrument) => instrument.value)),
    [expandedSections, visibleGroups],
  );

  useEffect(() => {
    if (!isSearching) {
      return;
    }

    setExpandedSections((current) => {
      const nextState = { ...current };

      for (const group of visibleGroups) {
        nextState[group.category] = true;
      }

      return nextState;
    });
  }, [isSearching, visibleGroups]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setActiveValue(value);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveValue((current) => {
      if (current && navigableValues.includes(current)) {
        return current;
      }

      if (navigableValues.includes(value)) {
        return value;
      }

      return navigableValues[0] ?? null;
    });
  }, [navigableValues, open, value]);

  useEffect(() => {
    if (!open || !activeValue) {
      return;
    }

    itemRefs.current.get(activeValue)?.scrollIntoView?.({ block: "nearest" });
  }, [activeValue, open]);

  function setSectionExpanded(category: string) {
    setExpandedSections((current) => ({
      ...current,
      [category]: !current[category],
    }));
  }

  function expandMatchingSections(nextQuery: string) {
    const normalizedNextQuery = normalizeSearchText(nextQuery);
    const compactNextQuery = compactSearchText(nextQuery);

    if (!compactNextQuery) {
      return;
    }

    const matchingGroups = buildVisibleGroups(categories, normalizedNextQuery, compactNextQuery);

    setExpandedSections((current) => {
      const nextState = { ...current };

      for (const group of matchingGroups) {
        nextState[group.category] = true;
      }

      return nextState;
    });
  }

  function commitSelection(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setSearchQuery("");
  }

  function moveActive(direction: 1 | -1) {
    if (navigableValues.length === 0) {
      return;
    }

    const currentIndex = activeValue ? navigableValues.indexOf(activeValue) : -1;
    const fallbackIndex = direction > 0 ? 0 : navigableValues.length - 1;
    const nextIndex = currentIndex === -1
      ? fallbackIndex
      : (currentIndex + direction + navigableValues.length) % navigableValues.length;

    setActiveValue(navigableValues[nextIndex] ?? null);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement | HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === "Enter" && activeValue) {
      event.preventDefault();
      commitSelection(activeValue);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const panel = (
    <div className="flex min-h-0 flex-col rounded-[1.25rem] bg-card/95 dark:bg-card/95" onKeyDown={handleKeyDown}>
      <div className="relative z-20 bg-card/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <div className="flex items-center gap-2 rounded-xl border border-border/45 bg-background/80 px-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-background/55 dark:shadow-[0_1px_2px_rgba(2,6,23,0.28)] focus-within:ring-2 focus-within:ring-ring/45 focus-within:ring-offset-0">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/75 dark:text-muted-foreground/90" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setSearchQuery(nextQuery);
              expandMatchingSections(nextQuery);
            }}
            placeholder="Search pair or asset"
            aria-label="Search instruments"
            className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/80"
          />
        </div>
      </div>

      <div className="max-h-[min(60svh,26rem)] overflow-y-auto overscroll-contain px-2 pb-2 pt-1 [touch-action:pan-y]">
        {visibleGroups.length > 0 ? (
          <div role="listbox" aria-label={ariaLabel}>
            {visibleGroups.map((group) => (
              <InstrumentSection
                key={group.category}
                category={group.category}
                items={group.items}
                expanded={expandedSections[group.category] ?? true}
                selectedValue={value}
                activeValue={activeValue ?? undefined}
                isSearching={isSearching}
                onToggle={() => setSectionExpanded(group.category)}
                onSelect={commitSelection}
                onHover={setActiveValue}
                registerRef={(instrumentValue, node) => {
                  if (node) {
                    itemRefs.current.set(instrumentValue, node);
                    return;
                  }

                  itemRefs.current.delete(instrumentValue);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-40 items-center justify-center px-6 text-sm text-muted-foreground">
            No matching instruments
          </div>
        )}
      </div>
    </div>
  );

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={open}
      className={cn(
        "flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-input/65 bg-background/80 px-3.5 text-left text-sm text-foreground transition-colors",
        "shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-background/55 dark:shadow-[0_1px_2px_rgba(2,6,23,0.24)]",
        "hover:border-border/70 hover:bg-background/95 dark:hover:bg-background/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        triggerClassName,
      )}
    >
      <div className="min-w-0">
        <p className={cn("truncate text-[13px]", selectedInstrument || value ? "font-medium text-foreground" : "text-muted-foreground")}>
          {selectedLabel}
        </p>
      </div>
      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 dark:text-muted-foreground" />
    </button>
  );

  if (isMobile) {
    return (
      <div ref={rootRef} className={className}>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{trigger}</DrawerTrigger>
          <DrawerContent className="h-[78svh] max-h-[78svh]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-2">
              {panel}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          container={rootRef.current}
          align="start"
          sideOffset={8}
          className="w-[min(100vw-1rem,32rem)] border-border/50 bg-card/96 p-0 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.34)] dark:border-white/10 dark:bg-card/96 dark:shadow-[0_18px_48px_-24px_rgba(2,6,23,0.72)] sm:min-w-[var(--radix-popover-trigger-width)]"
        >
          {panel}
        </PopoverContent>
      </Popover>
    </div>
  );
}
