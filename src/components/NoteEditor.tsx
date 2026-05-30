"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { GlassCard } from "@/components/ui";

type Props =
  | { horseId: string; jockeyId?: never; trainerId?: never }
  | { jockeyId: string; horseId?: never; trainerId?: never }
  | { trainerId: string; horseId?: never; jockeyId?: never };

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function NoteEditor({ horseId, jockeyId, trainerId }: Props) {
  const { status } = useSession();
  const router = useRouter();

  const { data: note, isLoading } = trpc.notes.get.useQuery(
    { horseId, jockeyId, trainerId },
    { enabled: status === "authenticated" }
  );

  const upsert = trpc.notes.upsert.useMutation();

  const [text, setText] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && note !== undefined) {
      setText(note?.content ?? "");
      initializedRef.current = true;
    }
  }, [note]);

  useEffect(() => {
    initializedRef.current = false;
    setSaveStatus("idle");
  }, [horseId, jockeyId, trainerId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setText(value);
    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      upsert.mutate(
        { horseId, jockeyId, trainerId, content: value },
        {
          onSuccess: () => setSaveStatus("saved"),
          onError: () => setSaveStatus("error"),
        }
      );
    }, 1500);
  }

  if (status === "unauthenticated") {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="display-md" style={{ color: "var(--green-900)" }}>My Notes</h2>
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            <button
              onClick={() => router.push("/auth/signin")}
              className="underline hover:no-underline cursor-pointer"
              style={{ color: "var(--green-700)" }}
            >
              Sign in
            </button>{" "}
            to add personal notes.
          </p>
        </GlassCard>
      </section>
    );
  }

  if (status === "loading" || isLoading) {
    return (
      <section className="flex flex-col gap-4">
        <h2 className="display-md" style={{ color: "var(--green-900)" }}>My Notes</h2>
        <GlassCard variant="subtle" radius="xl" padding="lg">
          <div
            className="h-20 rounded-lg animate-pulse"
            style={{ background: "rgba(0,0,0,0.05)" }}
          />
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="display-md" style={{ color: "var(--green-900)" }}>My Notes</h2>
        <span
          className="text-xs transition-opacity duration-300"
          style={{
            color:
              saveStatus === "saved"
                ? "var(--green-600)"
                : saveStatus === "error"
                ? "var(--navy-700)"
                : "var(--text-tertiary)",
            opacity: saveStatus === "idle" ? 0 : 1,
          }}
        >
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" && "Saved"}
          {saveStatus === "error" && "Error saving"}
        </span>
      </div>
      <GlassCard variant="subtle" radius="xl" padding="lg">
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Add your thoughts, observations, or betting notes…"
          rows={4}
          className="w-full resize-none bg-transparent outline-none text-sm leading-relaxed placeholder:opacity-40"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
        />
      </GlassCard>
    </section>
  );
}
