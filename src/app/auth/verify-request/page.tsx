import Link from "next/link";
import { GlassCard } from "@/components/ui";

export default function VerifyRequestPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "var(--green-600)" }}
          >
            Racing Pit
          </span>
          <h1
            className="display-xl"
            style={{ color: "var(--green-900)", fontFamily: "var(--font-display)" }}
          >
            Check your email
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            A sign-in link has been sent to your email address.
          </p>
        </div>

        <GlassCard variant="default" radius="2xl" padding="lg" className="flex flex-col gap-4 text-center">
          <div className="flex justify-center">
            <EnvelopeIcon />
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Click the link in the email to sign in. The link expires in 24 hours.
          </p>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            No email? Check your spam folder.
          </p>
        </GlassCard>

        <Link
          href="/auth/signin"
          className="text-xs text-center transition-opacity hover:opacity-70"
          style={{ color: "var(--text-tertiary)" }}
        >
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}

function EnvelopeIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--green-700)" }}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
