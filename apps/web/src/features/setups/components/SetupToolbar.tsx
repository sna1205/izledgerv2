import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SetupToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalSetups,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "active" | "archived";
  onStatusFilterChange: (value: "all" | "active" | "archived") => void;
  totalSetups: number;
}) {
  return (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search setups"
          className="h-12 rounded-[20px] border-border/60 bg-card/90 pl-11 shadow-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as typeof statusFilter)}>
          <SelectTrigger className="h-12 min-w-[170px] rounded-[20px] border-border/60 bg-card/90 shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All setups</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <div className="hidden text-sm text-muted-foreground md:block">
          <span className="font-medium text-foreground">{totalSetups}</span> setups
        </div>
      </div>
    </section>
  );
}
