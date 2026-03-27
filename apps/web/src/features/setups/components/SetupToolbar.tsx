import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SetupToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  totalSetups,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "active" | "archived";
  onStatusFilterChange: (value: "all" | "active" | "archived") => void;
  sortBy: "createdAt" | "name";
  onSortByChange: (value: "createdAt" | "name") => void;
  sortOrder: "asc" | "desc";
  onSortOrderChange: (value: "asc" | "desc") => void;
  totalSetups: number;
}) {
  return (
    <section className="rounded-[30px] border border-border bg-card/85 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalSetups}</span> setups
          </div>

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

        <div className="grid gap-3 sm:grid-cols-3 xl:w-auto">
          <div className="min-w-[150px] space-y-2">
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

          <div className="min-w-[150px] space-y-2">
            <p className="text-label">Sort</p>
            <Select value={sortBy} onValueChange={(value) => onSortByChange(value as typeof sortBy)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px] space-y-2">
            <p className="text-label">Order</p>
            <Select value={sortOrder} onValueChange={(value) => onSortOrderChange(value as typeof sortOrder)}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}
