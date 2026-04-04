import type { SetupListItem } from "@/services/api/setups";
import { SetupCard } from "./SetupCard";

export function SetupList({
  setups,
  onEdit,
  onArchive,
  onDuplicate,
}: {
  setups: SetupListItem[];
  onEdit: (setup: SetupListItem) => void;
  onArchive: (setup: SetupListItem) => void;
  onDuplicate: (setup: SetupListItem) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      {setups.map((setup) => (
        <SetupCard
          key={setup.id}
          setup={setup}
          onEdit={onEdit}
          onArchive={onArchive}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}
