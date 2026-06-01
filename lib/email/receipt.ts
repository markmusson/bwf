import { calculateGiftAidUpliftPence } from "../donation/giftAid";
import { formatGbpPence } from "../money";

export interface ReceiptDonation {
  amountPence: number;
  giftAid: boolean;
  giftAidConfirmations?: { declaredAt: number };
  displayName?: string;
  hideName: boolean;
}

export interface ReceiptDonor {
  email: string;
  name?: string;
}

export interface ReceiptOptions {
  charityNumber: string;
  fundraisingPageUrl: string;
  managePageUrl: string;
  prizePostalAddress: string;
  // Optional URL to the per-seat photo-realistic share image (the
  // /seat/<slug>/opengraph-image route). When provided, embedded at
  // the top of the email so the donor sees their dedicated seat first.
  shareImageUrl?: string;
}

export interface ReceiptOutput {
  subject: string;
  html: string;
  text: string;
}

const PRIZE_POSTAL_ADDRESS_DEFAULT =
  "The Bob Willis Fund, c/o Stafford House, 10 Prince Of Wales Road, Dorchester, Dorset, DT1 1PW";

const DEFAULT_OPTIONS: ReceiptOptions = {
  charityNumber: "1185346",
  fundraisingPageUrl: "https://bobwillisfund.org/virtualseats",
  managePageUrl: "https://bobwillisfund.org/virtualseats/manage",
  prizePostalAddress: PRIZE_POSTAL_ADDRESS_DEFAULT,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatReceipt(
  donation: ReceiptDonation,
  donor: ReceiptDonor,
  options: Partial<ReceiptOptions> = {},
): ReceiptOutput {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const greeting =
    donor.name && donor.name.trim().length > 0
      ? `Dear ${escapeHtml(donor.name.trim())},`
      : "Hello,";
  const giftAidUplift = donation.giftAid
    ? calculateGiftAidUpliftPence(donation.amountPence)
    : 0;
  const total = donation.amountPence + giftAidUplift;

  const giftAidBlock = donation.giftAid
    ? `<p style="margin:0 0 12px"><strong>Gift Aid uplift:</strong> ${formatGbpPence(giftAidUplift)} (HMRC reclaim on top, at no extra cost to you).</p>` +
      `<p style="margin:0 0 12px;font-size:12px;color:#666">Gift Aid declaration recorded on the donation page. We confirm: you are a UK taxpayer, this is your own money, and your donation was not made as part of a sweepstake, raffle, or lottery.</p>`
    : "";

  const seatLine = donation.hideName
    ? "<em>Anonymous</em>"
    : donation.displayName
      ? escapeHtml(donation.displayName)
      : "<em>Anonymous</em>";

  const subject = `Thank you for supporting the Bob Willis Fund`;

  const shareImageBlock = opts.shareImageUrl
    ? `<img src="${escapeHtml(opts.shareImageUrl)}" alt="Your dedicated seat at Edgbaston" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:0 0 16px">`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#001e3c;font-family:Arial, sans-serif;color:#f5f9fc">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#001e3c;padding:24px 0">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#003B60;border-radius:12px;padding:28px 24px">
        <tr><td>
          ${shareImageBlock}
          <h1 style="margin:0 0 4px;font-family:Arial, sans-serif;font-size:24px;color:#ffffff">Thank you for taking your Blue Seat</h1>
          <p style="margin:0 0 18px;font-size:14px;color:#33a8e0">Blue for Bob 2026 · Edgbaston</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.55">${greeting}</p>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.55">Your Blue Seat has been secured. Thank you for helping us turn Edgbaston blue and making a difference in the fight against prostate cancer.</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,133,202,0.15);border-radius:8px;padding:16px;margin:16px 0">
            <tr><td style="font-size:14px;line-height:1.6">
              <p style="margin:0 0 6px"><strong>Donation:</strong> ${formatGbpPence(donation.amountPence)}</p>
              ${giftAidBlock}
              <p style="margin:0 0 6px"><strong>Total to BWF:</strong> ${formatGbpPence(total)}</p>
              <p style="margin:0"><strong>Seat name:</strong> ${seatLine}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.55">Edit your tribute or seat anytime: <a style="color:#33a8e0" href="${escapeHtml(opts.managePageUrl)}">${escapeHtml(opts.managePageUrl)}</a></p>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:rgba(245,249,252,0.55)">The Bob Willis Fund is administered by The Talent Fund, registered charity ${escapeHtml(opts.charityNumber)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const textLines = [
    `Hello${donor.name ? ` ${donor.name.trim()}` : ""},`,
    "",
    "Your Blue Seat has been secured. Thank you for helping us turn Edgbaston blue and making a difference in the fight against prostate cancer.",
    "",
    `Donation: ${formatGbpPence(donation.amountPence)}`,
    donation.giftAid ? `Gift Aid uplift: ${formatGbpPence(giftAidUplift)}` : "",
    `Total to BWF: ${formatGbpPence(total)}`,
    `Seat name: ${donation.hideName ? "Anonymous" : (donation.displayName ?? "Anonymous")}`,
    "",
    `Manage your seat: ${opts.managePageUrl}`,
    "",
    `The Bob Willis Fund is administered by The Talent Fund, registered charity ${opts.charityNumber}.`,
  ].filter(Boolean);

  return { subject, html, text: textLines.join("\n") };
}
