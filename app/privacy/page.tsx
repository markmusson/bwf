import type { Metadata } from "next";
import { PolicyShell } from "@/app/components/PolicyShell";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How the Bob Willis Fund collects, uses, and protects your personal data on the Virtual Seats platform.",
};

export default function PrivacyPage() {
  return (
    <PolicyShell title="Privacy notice" reviewedDate="30 April 2026">
      <p>
        This privacy notice covers personal data we collect through the BWF
        Virtual Seats platform (this site). The Bob Willis Fund is administered
        by The Talent Fund, registered charity <strong>1185346</strong> in
        England and Wales.
      </p>

      <h2 className="font-display mt-4 text-2xl">What we collect</h2>
      <ul className="list-disc pl-6">
        <li>
          <strong>Email address</strong> — required so we can sign you in (magic
          link), send your receipt, and let you manage your seat.
        </li>
        <li>
          <strong>Name</strong> — required for the Gift Aid declaration when you
          choose to add Gift Aid, and shown alongside your seat unless you tick
          “hide my name”.
        </li>
        <li>
          <strong>
            Donation amount, Stripe identifiers, and Gift Aid confirmations
          </strong>{" "}
          — required to process the payment and, if applicable, claim Gift Aid
          from HMRC.
        </li>
        <li>
          <strong>
            Marketing preference and the timestamp of when it was captured
          </strong>{" "}
          — required so we only contact you with your consent (PECR) and so we
          can prove that consent if asked (ICO).
        </li>
        <li>
          <strong>Tribute text</strong> — only stored if you choose to leave
          one. Shown publicly on the seat wall once moderated, unless you ask us
          to remove it.
        </li>
      </ul>

      <h2 className="font-display mt-4 text-2xl">What we don’t collect</h2>
      <p>
        Card numbers, CVCs, and any other payment-card data go directly to
        Stripe. They never touch our servers.
      </p>

      <h2 className="font-display mt-4 text-2xl">Where it lives</h2>
      <p>
        Your data is stored in our Convex database in the EU (Ireland) region.
        Stripe processes your payment under their own privacy terms. Resend
        sends our transactional email (sign-in links and receipts).
      </p>

      <h2 className="font-display mt-4 text-2xl">Your rights</h2>
      <p>
        Under UK GDPR you can ask us to confirm what we hold, correct it, delete
        it, or export a copy. Email us using the address at the bottom of this
        page. We aim to respond within one calendar month.
      </p>

      <h2 className="font-display mt-4 text-2xl">Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and remember your seat
        hold during checkout. We don’t use advertising or tracking cookies.
        Page-view analytics, when on, run through Plausible — no cookies, no
        personally identifiable data.
      </p>

      <h2 className="font-display mt-4 text-2xl">Changes</h2>
      <p>
        We’ll update the date at the top of this page when we change anything
        material. If the change affects how we use data you’ve already given us,
        we’ll email you.
      </p>
    </PolicyShell>
  );
}
