import { Search, Tags } from "lucide-react";
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
    <section className="rounded-[30px] border border-border bg-card/90 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalSetups}</span> setups
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="space-y-2">
              <p className="text-label">Search</p>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search setups"
                  className="h-11 rounded-2xl pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-label">Status</p>
              <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as typeof statusFilter)}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Setups</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-label">Tag</p>
              <div className="flex h-11 items-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-3 text-sm text-muted-foreground">
                <Tags className="h-4 w-4" />
                Coming soon
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
