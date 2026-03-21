import { useQuery } from "@tanstack/react-query";
import { getFounderHealth, getFounderRecent, getFounderStats } from "@/lib/api/founder";
import { useAuth } from "@/lib/auth";
import { withMinimumDelay } from "@/lib/loading";
import { privateQueryKey } from "@/lib/react-query";

export function useFounderStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: privateQueryKey(user?.id ?? "anonymous", "founder", "stats"),
    queryFn: () => withMinimumDelay(() => getFounderStats()),
    enabled: Boolean(user),
  });
}

export function useFounderRecent() {
  const { user } = useAuth();

  return useQuery({
    queryKey: privateQueryKey(user?.id ?? "anonymous", "founder", "recent"),
    queryFn: () => withMinimumDelay(() => getFounderRecent()),
    enabled: Boolean(user),
  });
}

export function useFounderHealth() {
  const { user } = useAuth();

  return useQuery({
    queryKey: privateQueryKey(user?.id ?? "anonymous", "founder", "health"),
    queryFn: () => withMinimumDelay(() => getFounderHealth()),
    enabled: Boolean(user),
  });
}
