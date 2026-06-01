import { describe, expect, it } from "vitest";
import {
  buildEmailShareUrl,
  buildFacebookShareUrl,
  buildLinkedInShareUrl,
  buildTwitterShareUrl,
  buildWhatsAppShareUrl,
} from "./shareIntents";

const url = "https://blue.bobwillisfund.org/seat/wyatt-1-4";
const text = "I just dedicated a seat at Edgbaston for the Bob Willis Fund.";

describe("share intents", () => {
  describe("Twitter / X", () => {
    it("uses the twitter intent endpoint", () => {
      const out = buildTwitterShareUrl({ url, text });
      expect(out).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/);
    });

    it("includes the encoded url and text", () => {
      const out = buildTwitterShareUrl({ url, text });
      expect(out).toContain(`url=${encodeURIComponent(url)}`);
      // URLSearchParams uses + for spaces (RFC 1738 form-encoding).
      // Both that and %20 round-trip in browsers, so we check the
      // important tokens rather than full encoding equality.
      expect(out).toContain("text=I");
      expect(out).toContain("Bob+Willis+Fund");
    });
  });

  describe("LinkedIn", () => {
    it("uses the sharing/share-offsite endpoint", () => {
      const out = buildLinkedInShareUrl({ url });
      expect(out).toMatch(
        /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?/,
      );
    });

    it("encodes the url", () => {
      const out = buildLinkedInShareUrl({ url });
      expect(out).toContain(`url=${encodeURIComponent(url)}`);
    });
  });

  describe("Facebook", () => {
    it("uses the sharer endpoint", () => {
      const out = buildFacebookShareUrl({ url });
      expect(out).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php/);
      expect(out).toContain(`u=${encodeURIComponent(url)}`);
    });
  });

  describe("WhatsApp", () => {
    it("uses the wa.me endpoint with text param", () => {
      const out = buildWhatsAppShareUrl({ url, text });
      expect(out).toMatch(/^https:\/\/wa\.me\/\?text=/);
      // Form-encoded URL — '+' is the space form-encoding.
      expect(out).toContain("Bob+Willis+Fund");
      expect(out).toContain(encodeURIComponent(url));
    });
  });

  describe("Email", () => {
    it("returns a mailto: link with subject and body", () => {
      const out = buildEmailShareUrl({
        url,
        subject: "I dedicated a seat",
        text,
      });
      expect(out).toMatch(/^mailto:\?/);
      expect(out).toContain("subject=I+dedicated+a+seat");
      expect(out).toContain(encodeURIComponent(url));
      expect(out).toContain("Bob+Willis+Fund");
    });
  });
});
