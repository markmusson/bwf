import type { Metadata } from "next";
import { PolicyShell } from "@/app/components/PolicyShell";

export const metadata: Metadata = {
  title: "Terms — BWF Virtual Seats",
  description: "Terms of use for the BWF Virtual Seats fundraising platform.",
};

export default function TermsPage() {
  return (
    <PolicyShell title="Terms of use" reviewedDate="30 April 2026">
      <p>
        These terms cover your use of the BWF Virtual Seats platform. By
        donating, leaving a tribute, or signing in, you agree to them. If you
        don’t agree, please don’t use the site.
      </p>

      <h2 className="font-display mt-4 text-2xl">Who we are</h2>
      <p>
        The Bob Willis Fund is administered by The Talent Fund, a charity
        registered in England and Wales with charity number{" "}
        <strong>1185346</strong>. References to “we” or “us” mean BWF.
      </p>

      <h2 className="font-display mt-4 text-2xl">Donations</h2>
      <ul className="list-disc pl-6">
        <li>
          The minimum donation is £10. You can choose larger preset amounts or
          enter a custom amount.
        </li>
        <li>
          Payments are processed by Stripe. Your card statement will show a
          charge from Stripe on behalf of The Bob Willis Fund.
        </li>
        <li>
          Donations are non-refundable as a rule. If you’ve made a donation in
          error, email us within 7 days and we’ll do our best to help.
        </li>
        <li>
          A “virtual seat” is a symbolic record of your donation on this site.
          It doesn’t grant entry to any in-person match.
        </li>
      </ul>

      <h2 className="font-display mt-4 text-2xl">Gift Aid</h2>
      <p>
        If you tick the Gift Aid box you confirm you are a UK taxpayer, the
        donation is your own money, and you’re not receiving anything of
        meaningful benefit in return (the prize draw is separate and free — see
        the prize T&amp;Cs). If you stop being a UK taxpayer or change your
        mind, please tell us.
      </p>

      <h2 className="font-display mt-4 text-2xl">Tributes</h2>
      <p>
        You’re welcome to leave a short tribute (up to 280 characters) with your
        seat. Tributes are auto-checked for profanity and spam; flagged tributes
        are held for human review before they appear on the public wall. We may
        remove or edit tributes that we judge offensive, off-topic, or unlawful,
        with or without notice.
      </p>

      <h2 className="font-display mt-4 text-2xl">Account &amp; sign-in</h2>
      <p>
        We use email-only magic-link sign-in. Keep your email account secure. If
        you suspect someone else has access to your inbox, contact us so we can
        invalidate active sessions.
      </p>

      <h2 className="font-display mt-4 text-2xl">Acceptable use</h2>
      <ul className="list-disc pl-6">
        <li>Don’t try to break, abuse, or scrape the site.</li>
        <li>
          Don’t use it to publish unlawful, hateful, or harassing content.
        </li>
        <li>
          Don’t impersonate another person or pretend to donate on behalf of
          someone who hasn’t consented.
        </li>
      </ul>

      <h2 className="font-display mt-4 text-2xl">Liability</h2>
      <p>
        We provide this site as-is and as available. We try to keep it running
        but can’t guarantee it’ll be available all the time or free of errors.
        To the extent allowed by UK law, we’re not liable for indirect or
        consequential losses.
      </p>

      <h2 className="font-display mt-4 text-2xl">Changes</h2>
      <p>
        We may update these terms. Material changes will be flagged at the top
        of the page or by email if we have your address.
      </p>

      <h2 className="font-display mt-4 text-2xl">Governing law</h2>
      <p>
        These terms are governed by the laws of England &amp; Wales. The courts
        of England &amp; Wales have exclusive jurisdiction.
      </p>
    </PolicyShell>
  );
}
