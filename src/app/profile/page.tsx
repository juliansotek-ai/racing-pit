export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlassCard } from "@/components/ui";

async function getFavorites(userId: string) {
  return prisma.favorite.findMany({
    where: { userId },
    include: { horse: true, jockey: true, trainer: true },
    orderBy: { createdAt: "desc" },
  });
}

type Favorites = Awaited<ReturnType<typeof getFavorites>>;

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const favorites = await getFavorites(session.user.id);

  const horses = favorites.filter((f) => f.horse != null);
  const jockeys = favorites.filter((f) => f.jockey != null);
  const trainers = favorites.filter((f) => f.trainer != null);

  const user = session.user;

  return (
    <main className="flex flex-col min-h-screen px-6 py-12 max-w-5xl mx-auto gap-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h1
          className="display-xl"
          style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
        >
          Profile
        </h1>
        <Link
          href="/dashboard"
          className="text-sm transition-opacity hover:opacity-70 mt-2"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Dashboard
        </Link>
      </div>

      {/* Account info */}
      <GlassCard variant="default" radius="2xl" padding="lg">
        <div className="flex items-center gap-5">
          <div className="flex-shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Avatar"}
                width={72}
                height={72}
                className="rounded-full object-cover"
                style={{ border: "2px solid var(--green-200)" }}
              />
            ) : (
              <AvatarFallback name={user.name} size="lg" />
            )}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <p
              className="display-md truncate"
              style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
            >
              {user.name ?? "—"}
            </p>
            <div className="flex items-center gap-2">
              <MailIcon />
              <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                {user.email}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{
                  background: "var(--green-50)",
                  color: "var(--green-700)",
                  border: "1px solid var(--green-200)",
                }}
              >
                Magic link login
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Favorites */}
      <section className="flex flex-col gap-6">
        <div className="flex items-baseline gap-3">
          <h2
            className="display-lg"
            style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
          >
            Following
          </h2>
          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {favorites.length} {favorites.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {favorites.length === 0 ? (
          <GlassCard variant="subtle" radius="xl" padding="lg">
            <p style={{ color: "var(--text-secondary)" }}>
              You haven&apos;t followed any horses, jockeys, or trainers yet.
              Browse the{" "}
              <Link href="/horses" className="underline underline-offset-2" style={{ color: "var(--green-700)" }}>
                horses
              </Link>
              ,{" "}
              <Link href="/jockeys" className="underline underline-offset-2" style={{ color: "var(--green-700)" }}>
                jockeys
              </Link>
              , or{" "}
              <Link href="/trainers" className="underline underline-offset-2" style={{ color: "var(--green-700)" }}>
                trainers
              </Link>{" "}
              pages to start following.
            </p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-8">
            <FavoriteGroup
              title="Horses"
              count={horses.length}
              icon={<HorseIcon />}
              items={horses.map((f) => ({
                id: f.horse!.id,
                name: f.horse!.name,
                href: `/horses/${f.horse!.id}`,
                meta: null,
              }))}
              emptyHref="/horses"
            />
            <FavoriteGroup
              title="Jockeys"
              count={jockeys.length}
              icon={<JockeyIcon />}
              items={jockeys.map((f) => ({
                id: f.jockey!.id,
                name: f.jockey!.name,
                href: `/jockeys/${f.jockey!.id}`,
                meta: null,
              }))}
              emptyHref="/jockeys"
            />
            <FavoriteGroup
              title="Trainers"
              count={trainers.length}
              icon={<TrainerIcon />}
              items={trainers.map((f) => ({
                id: f.trainer!.id,
                name: f.trainer!.name,
                href: `/trainers/${f.trainer!.id}`,
                meta: null,
              }))}
              emptyHref="/trainers"
            />
          </div>
        )}
      </section>
    </main>
  );
}

function FavoriteGroup({
  title,
  count,
  icon,
  items,
  emptyHref,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  items: { id: string; name: string; href: string; meta: string | null }[];
  emptyHref: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--green-600)" }}>{icon}</span>
        <h3
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.12em" }}
        >
          {title}
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
          style={{
            background: count > 0 ? "var(--green-50)" : "transparent",
            color: count > 0 ? "var(--green-700)" : "var(--text-tertiary)",
            border: `1px solid ${count > 0 ? "var(--green-200)" : "var(--glass-border-subtle)"}`,
          }}
        >
          {count}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm pl-1" style={{ color: "var(--text-tertiary)" }}>
          None yet.{" "}
          <Link href={emptyHref} className="underline underline-offset-2" style={{ color: "var(--green-600)" }}>
            Browse {title.toLowerCase()}
          </Link>
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href}>
              <GlassCard
                variant="subtle"
                radius="md"
                padding="sm"
                className="group transition-all duration-150 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--green-50)", color: "var(--green-700)" }}
                  >
                    <StarIcon />
                  </span>
                  <span
                    className="text-sm font-medium truncate group-hover:text-green-800 transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.name}
                  </span>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AvatarFallback({ name, size = "md" }: { name?: string | null; size?: "md" | "lg" }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const dim = size === "lg" ? "w-[72px] h-[72px] text-xl" : "w-9 h-9 text-xs";
  return (
    <span
      className={`${dim} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
      style={{
        background: "linear-gradient(135deg, var(--green-800), var(--navy-800))",
        border: "2px solid var(--green-200)",
      }}
    >
      {initials}
    </span>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function HorseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16c0 1.1.9 2 2 2h12a2 2 0 002-2V8c0-1.1-.9-2-2-2H6a2 2 0 00-2 2v8z" />
      <path d="M8 6V4M16 6V4M12 6V3" />
    </svg>
  );
}

function JockeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function TrainerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
