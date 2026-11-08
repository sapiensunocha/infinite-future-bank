// One catalog of every service, used by the home "Services" row, the full
// Services page and the desktop apps menu, so they can never drift apart.
// Order inside each group = display order. `featured` items appear on home.
import {
  Users, Receipt, FileCode, HandCoins, HeartHandshake, ArrowRightLeft, Rocket,
  Calculator, Ticket, HeartPulse, GraduationCap, ShoppingBag, TrendingUp, Leaf,
  Gift, Link2, Tractor,
} from 'lucide-react';

export const SERVICE_GROUPS = [
  {
    id: 'business',
    title: 'Business & merchants',
    items: [
      { id: 'PAYMENT_PAGES',    Icon: Link2,          label: 'Payment Pages',   desc: 'Payment links with your own form', featured: true },
      { id: 'MERCHANT_TICKETS', Icon: Ticket,         label: 'Box Office',      desc: 'Sell event tickets',               featured: true },
      { id: 'PAYROLL',          Icon: Users,          label: 'Payroll',         desc: 'Pay your team',                    featured: true },
      { id: 'MERCHANT_BILLING', Icon: Calculator,     label: 'Invoicing',       desc: 'Send invoices and get paid' },
      { id: 'PARTNER_HUB',      Icon: Tractor,        label: 'Partner Hub',     desc: 'Farmers, fields and field teams' },
    ],
  },
  {
    id: 'everyday',
    title: 'Everyday',
    items: [
      { id: 'DEUS_MARKET',      Icon: ShoppingBag,    label: 'Marketplace',     desc: 'Verified products and merchants',  featured: true },
      { id: 'BILLS',            Icon: Receipt,        label: 'Pay Bills',       desc: 'Utilities and airtime' },
      { id: 'NPO',              Icon: HeartHandshake, label: 'NPO Hub',         desc: 'Give and fundraise',               featured: true },
      { id: 'CAPITAL_NETWORK',  Icon: Gift,           label: 'Referrals',       desc: 'Invite partners and earn',         featured: true },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & protection',
    items: [
      { id: 'LOANS',            Icon: HandCoins,      label: 'Lending',         desc: 'Borrow and lend' },
      { id: 'P2P_EXCHANGE',     Icon: ArrowRightLeft, label: 'P2P Escrow',      desc: 'Cash agent network' },
      { id: 'CONTRACTS',        Icon: FileCode,       label: 'Smart Contracts', desc: 'Milestone escrow' },
      { id: 'VENTURE_EXCHANGE', Icon: Rocket,         label: 'Venture Exchange', desc: 'Invest in companies' },
      { id: 'PENSION_FUND',     Icon: TrendingUp,     label: 'IFB Pension',     desc: 'Retirement savings' },
      { id: 'AGRI_SHIELD',      Icon: Leaf,           label: 'AgriShield',      desc: 'Crop protection' },
    ],
  },
  {
    id: 'hubs',
    title: 'Health & education',
    items: [
      { id: 'CLYRIX',           Icon: HeartPulse,     label: 'Clyrix Health',   desc: 'Health financing' },
      { id: 'PRAXCI',           Icon: GraduationCap,  label: 'Praxci Edu',      desc: 'Education payments' },
    ],
  },
];

export const ALL_SERVICES = SERVICE_GROUPS.flatMap((g) => g.items);
export const FEATURED_SERVICES = ALL_SERVICES.filter((s) => s.featured);
