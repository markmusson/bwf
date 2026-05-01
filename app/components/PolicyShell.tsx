import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  title: string;
  reviewedDate: string;
  children: ReactNode;
}

// Shell used by /privacy, /terms, /prize-terms. Same chrome and date
// stamp so donors can see when each policy was last reviewed.
export function PolicyShell({ title, reviewedDate, children }: Props) {
  return (
    <article className="bg-bwf-blue mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 text-white">
      <header className="flex flex-col gap-1">
        <p className="text-bwf-pale text-xs font-semibold tracking-widest uppercase">
          BWF Virtual Seats
        </p>
        <h1 className="font-display text-4xl font-black tracking-wide uppercase">
          {title}
        </h1>
        <p className="text-xs font-normal text-white/60">
          Last reviewed {reviewedDate}.
        </p>
      </header>
      <div className="prose-policy flex flex-col gap-4 text-[15px] leading-7 font-normal text-white/85">
        {children}
      </div>
      <footer className="text-xs text-white/60">
        Questions? Email us at{" "}
        <Link
          href="mailto:hello@bobwillisfund.org"
          className="hover:text-white"
        >
          hello@bobwillisfund.org
        </Link>
        .
      </footer>
    </article>
  );
}
