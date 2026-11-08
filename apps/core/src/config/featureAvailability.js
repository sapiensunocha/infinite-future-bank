// Which features are live, still being built, or waiting on a regulatory licence.
// Users only ever see "Coming soon": `reason` is the public text; `note` (licence
// features) is the internal reason it is gated and is never shown in the app.
// The single source of truth for "Coming soon" badges and for
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
  IFB_AUDIT:        { status: STATUS.COMING_SOON, title: 'IFB Audit',          reason: 'Paid company audits are not connected to billing and delivery yet.' },

  // ── Regulated: needs a licence (shown to users as Coming soon) ─────────────
  LOANS:            { status: STATUS.LICENCE, title: 'Lending',            reason: 'Borrow and lend with your community. We are getting it ready.', note: 'Lending requires a credit licence in each country we operate in.' },
  P2P_EXCHANGE:     { status: STATUS.LICENCE, title: 'P2P Escrow',         reason: 'Cash in and cash out through trusted local agents. We are getting it ready.', note: 'Cash agent networks require money transmission and agent licensing.' },
  CONTRACTS:        { status: STATUS.LICENCE, title: 'Smart Contracts',    reason: 'Hold money safely until work is delivered. We are getting it ready.', note: 'Holding funds in escrow requires a payment / escrow licence.' },
  VENTURE_EXCHANGE: { status: STATUS.LICENCE, title: 'Venture Exchange',   reason: 'Invest in growing companies. We are getting it ready.', note: 'Offering company shares requires a securities licence.' },
  LISTINGS:         { status: STATUS.LICENCE, title: 'Company Listings',   reason: 'List your company for investors. We are getting it ready.', note: 'Listing companies for investment requires a securities licence.' },
  INVEST:           { status: STATUS.LICENCE, title: 'Wealth & Invest',    reason: 'Grow your savings with investment products. We are getting it ready.', note: 'Investment products require an investment adviser / broker licence.' },
  INSURANCE:        { status: STATUS.LICENCE, title: 'Insurance',          reason: 'Protect your family, health and business. We are getting it ready.', note: 'Selling insurance requires an insurance licence or a licensed partner.' },
  PENSION_FUND:     { status: STATUS.LICENCE, title: 'IFB Pension',        reason: 'Save for your retirement. We are getting it ready.', note: 'Pension schemes require approval from the pension regulator.' },
  AGRI_SHIELD:      { status: STATUS.LICENCE, title: 'AgriShield',         reason: 'Protect your crops against drought, flood and disease. We are getting it ready.', note: 'Crop insurance requires an insurance licence or a licensed partner.' },
  NETWORK:          { status: STATUS.LICENCE, title: 'AFR Node',           reason: 'Earn rewards by supporting the IFB network. We are getting it ready.', note: 'Issuing and rewarding a digital token requires a virtual-asset licence.' },
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
