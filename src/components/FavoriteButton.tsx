"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type Props =
  | { horseId: string; jockeyId?: never; trainerId?: never }
  | { jockeyId: string; horseId?: never; trainerId?: never }
  | { trainerId: string; horseId?: never; jockeyId?: never };

export function FavoriteButton({ horseId, jockeyId, trainerId }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: favorites } = trpc.favorites.list.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const isFavorited = Boolean(
    favorites?.some(
      (f) =>
        (horseId != null && f.horseId === horseId) ||
        (jockeyId != null && f.jockeyId === jockeyId) ||
        (trainerId != null && f.trainerId === trainerId)
    )
  );

  const toggle = trpc.favorites.toggle.useMutation({
    onMutate: async () => {
      await utils.favorites.list.cancel();
      const prev = utils.favorites.list.getData();
      utils.favorites.list.setData(undefined, (old) => {
        if (!old) return old;
        if (isFavorited) {
          return old.filter(
            (f) =>
              !(horseId != null && f.horseId === horseId) &&
              !(jockeyId != null && f.jockeyId === jockeyId) &&
              !(trainerId != null && f.trainerId === trainerId)
          );
        }
        return [
          ...old,
          {
            id: "_opt",
            userId: "",
            horseId: horseId ?? null,
            jockeyId: jockeyId ?? null,
            trainerId: trainerId ?? null,
            createdAt: new Date(),
            horse: null,
            jockey: null,
            trainer: null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev != null) utils.favorites.list.setData(undefined, ctx.prev);
    },
    onSettled: () => {
      void utils.favorites.list.invalidate();
    },
  });

  function handleClick() {
    if (status !== "authenticated") {
      router.push("/auth/signin");
      return;
    }
    toggle.mutate({ horseId, jockeyId, trainerId });
  }

  const isLoading = status === "loading" || toggle.isPending;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isFavorited ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-4",
        "rounded-[var(--radius-md)] text-sm font-medium tracking-tight",
        "transition-all duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "active:scale-[0.97]",
        isFavorited
          ? "glass border border-[var(--green-200)] text-[var(--green-800)]"
          : "glass border border-[rgba(0,0,0,0.08)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      )}
    >
      <svg
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "w-4 h-4 transition-all duration-200",
          isFavorited
            ? "fill-[var(--green-500)] stroke-[var(--green-600)] scale-110"
            : "fill-none stroke-current"
        )}
      >
        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
      <span>{isFavorited ? "Following" : "Follow"}</span>
    </button>
  );
}
