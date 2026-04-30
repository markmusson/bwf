// Gift Aid uplift maths and confirmation shape.
//
// HMRC: a UK taxpayer can let the charity reclaim basic-rate tax on their
// donation. The uplift is 25% of the gross donation (i.e. £25 on £100),
// because the £100 was after 20% basic-rate tax had been paid on £125.
// Integer pence everywhere.

export function calculateGiftAidUpliftPence(amountPence: number): number {
  if (!Number.isInteger(amountPence) || amountPence < 0) {
    throw new TypeError(
      "calculateGiftAidUpliftPence expects a non-negative integer pence value",
    );
  }
  return Math.floor(amountPence / 4);
}

export interface GiftAidConfirmations {
  ukTaxpayer: boolean;
  ownMoney: boolean;
  noBenefit: boolean;
}

export const EMPTY_GIFT_AID_CONFIRMATIONS: GiftAidConfirmations = {
  ukTaxpayer: false,
  ownMoney: false,
  noBenefit: false,
};

export function isGiftAidValid(c: GiftAidConfirmations): boolean {
  return c.ukTaxpayer && c.ownMoney && c.noBenefit;
}
