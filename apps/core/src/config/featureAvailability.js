// Which features are live, still being built, or waiting on a regulatory licence.
// The single source of truth for "Coming soon" / "Licence pending" badges and for
// gating: a gated feature never renders its screen, wherever it is opened from.
//
// Staging/QA: set VITE_ENABLE_GATED_FEATURES=true to open every feature for testing.

export const STATUS = {
  COMING_SOON: 'coming_soon',     // not finished, or currently simulated
  LICENCE: 'licence_required',    // regulated activity; needs a licence before launch
};

const GATED = {
  // ── Not finished / simulated ─────────────────────────────────────────────
  CLYRIX:           { status: STATUS.COMING_SOON, title: 'Clyrix Health',      reason: 'Health financing pools are still being built.' },
  PRAXCI:           { status: STATUS.COMING_SOON, title: 'Praxci Edu',         reason: 'Education payments are still being built.' },
  AGENTS:           { status: STATUS.COMING_SOON, title: 'AI Team',            reason: 'Agent tasks are not connected to a real backend yet.' },
  SOS:              { status: STATUS.COMING_SOON, title: 'Emergency SOS',      reason: 'Emergency advances are not connected to real funds yet.' },
  BILLS:            { status: STATUS.COMING_SOON, title: 'Pay Bills',          reason: 'We are integrating with bill providers so payments actually reach the biller.' },
  MERCHANT_BILLING: { status: STATUS.COMING_SOON, title: 'Invoicing',          reason: 'Use Payment Pages with a private link to bill a client today.' },
  IFB_AUDIT:        { status: STATUS.COMING_SOON, title: 'IFB Audit',          reason: 'Paid company audits are not connected to billing and delivery yet.' },

  // ── Regulated: needs a licence ───────────────────────────────────────────
  LOANS:            { status: STATUS.LICENCE, title: 'Lending',            reason: 'Lending requires a credit licence in each country we operate in.' },
  P2P_EXCHANGE:     { status: STATUS.LICENCE, title: 'P2P Escrow',         reason: 'Cash agent networks require money transmission and agent licensing.' },
  CONTRACTS:        { status: STATUS.LICENCE, title: 'Smart Contracts',    reason: 'Holding funds in escrow requires a payment / escrow licence.' },
  VENTURE_EXCHANGE: { status: STATUS.LICENCE, title: 'Venture Exchange',   reason: 'Offering company shares requires a securities licence.' },
  LISTINGS:         { status: STATUS.LICENCE, title: 'Company Listings',   reason: 'Listing companies for investment requires a securities licence.' },
  INVEST:           { status: STATUS.LICENCE, title: 'Wealth & Invest',    reason: 'Investment products require an investment adviser / broker licence.' },
  INSURANCE:        { status: STATUS.LICENCE, title: 'Insurance',          reason: 'Selling insurance requires an insurance licence or a licensed partner.' },
  PENSION_FUND:     { status: STATUS.LICENCE, title: 'IFB Pension',        reason: 'Pension schemes require approval from the pension regulator.' },
  AGRI_SHIELD:      { status: STATUS.LICENCE, title: 'AgriShield',         reason: 'Crop insurance requires an insurance licence or a licensed partner.' },
  NETWORK:          { status: STATUS.LICENCE, title: 'AFR Node',           reason: 'Issuing and rewarding a digital token requires a virtual-asset licence.' },
};

const overrideAll = import.meta.env.VITE_ENABLE_GATED_FEATURES === 'true';

/** The availability entry for a feature id, or null when it is live. */
export function getFeatureStatus(id) {
  return GATED[id] ?? null;
}

/** True when the feature's screen must not render. */
export function isGated(id) {
  return !overrideAll && Boolean(GATED[id]);
}
