import type { Metadata } from "next";
import { PolicyShell } from "@/app/components/PolicyShell";

export const metadata: Metadata = {
  title: "Prize draw terms",
  description:
    "Free prize draw terms for the Blue for Bob 2026 fundraising campaign.",
};

export default function PrizeTermsPage() {
  return (
    <PolicyShell title="Prize draw — terms" reviewedDate="30 April 2026">
      <p>
        The Blue for Bob 2026 prize draw is a <strong>free</strong> promotion
        run by The Bob Willis Fund (administered by The Talent Fund, registered
        charity <strong>1185346</strong>). Entry is{" "}
        <strong>not contingent on a donation</strong>. Anyone who wants to enter
        can do so by post for free, and donors are offered an entry as a
        separate, free post-donation choice.
      </p>

      <h2 className="font-display mt-4 text-2xl">Why we keep it separate</h2>
      <p>
        HMRC’s Gift Aid rules require that a donation does not result in a
        meaningful benefit to the donor. A prize-draw entry would otherwise be a
        benefit. By making the entry separate, free, and equally available by
        post, we keep Gift Aid valid for all donors who tick the Gift Aid box.
      </p>

      <h2 className="font-display mt-4 text-2xl">Who can enter</h2>
      <ul className="list-disc pl-6">
        <li>Open to UK residents aged 18 or over.</li>
        <li>
          Employees and trustees of The Talent Fund, immediate family members,
          and anyone professionally connected with the administration of the
          draw are excluded.
        </li>
      </ul>

      <h2 className="font-display mt-4 text-2xl">How to enter — online</h2>
      <p>
        After making a donation on this site you’ll see an{" "}
        <strong>Enter the prize draw (free)</strong> button on the confirmation
        pane. Clicking it once enters you. You don’t have to donate to enter.
      </p>

      <h2 className="font-display mt-4 text-2xl">How to enter — by post</h2>
      <p>
        Post a card or letter with your full name, email or postal address for
        contact, and the words <strong>“Blue for Bob 2026 prize draw”</strong>{" "}
        to:
      </p>
      <p className="bg-bwf-navy ring-bwf-blue/30 rounded-lg p-4 ring-1">
        The Bob Willis Fund
        <br />
        c/o Stafford House
        <br />
        10 Prince Of Wales Road
        <br />
        Dorchester
        <br />
        Dorset DT1 1PW
      </p>
      <p>
        Postal entries must be received before the closing date. Each envelope
        counts as one entry.
      </p>

      <h2 className="font-display mt-4 text-2xl">Closing date &amp; prize</h2>
      <p>
        Prize details and the closing date will be confirmed here closer to the
        match. We’ll update this page and post on{" "}
        <a href="https://bobwillisfund.org" className="hover:text-white">
          bobwillisfund.org
        </a>{" "}
        when they’re locked.
      </p>

      <h2 className="font-display mt-4 text-2xl">Drawing the winner</h2>
      <p>
        After the closing date, BWF runs a single seeded random draw from all
        eligible entries (online + postal). The seed is logged for auditability.
        The winner is contacted by email or post within 7 days. We may publish
        the winner’s first name and last initial on this site unless they ask
        not to.
      </p>

      <h2 className="font-display mt-4 text-2xl">Acceptance</h2>
      <ul className="list-disc pl-6">
        <li>
          The winner must respond within 14 days of being notified or BWF may
          pick another winner.
        </li>
        <li>The prize is non-transferable and has no cash alternative.</li>
        <li>Entries can’t be sold or transferred.</li>
      </ul>

      <h2 className="font-display mt-4 text-2xl">Data &amp; complaints</h2>
      <p>
        We use entrants’ data only to run the draw and contact the winner. See
        our{" "}
        <a href="/privacy" className="hover:text-white">
          privacy notice
        </a>{" "}
        for details. Complaints about the draw can be sent to the email at the
        bottom of this page.
      </p>

      <h2 className="font-display mt-4 text-2xl">Promoter</h2>
      <p>
        Promoter: The Bob Willis Fund, administered by The Talent Fund,
        registered charity <strong>1185346</strong>, England &amp; Wales.
      </p>
    </PolicyShell>
  );
}
