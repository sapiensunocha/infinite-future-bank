import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Search, ShoppingCart, Star, ChevronRight, ArrowLeft,
  Plus, Minus, Trash2, Truck, Zap, Globe, Package,
  CheckCircle, Loader2, X, ShieldCheck, Tag, Sparkles,
  Store, Wifi, ClipboardList, Clock, MapPin, RotateCcw
} from 'lucide-react';

const RESEND_KEY = import.meta.env.VITE_RESEND_API_KEY;
const ADMIN_EMAIL = 'sapiens@infinitefuturebank.org';

async function sendEmail(to, subject, html) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({ from: 'DEUS Market <noreply@infinitefuturebank.org>', to, subject, html }),
    });
  } catch (_) {}
}

const ORDER_STATUS = {
  pending:          { label: 'Pending',          color: 'text-amber-500',  bg: 'bg-amber-50',   border: 'border-amber-200',  step: 0 },
  sourcing:         { label: 'Sourcing',          color: 'text-blue-500',   bg: 'bg-blue-50',    border: 'border-blue-200',   step: 1 },
  processing:       { label: 'Processing',        color: 'text-indigo-500', bg: 'bg-indigo-50',  border: 'border-indigo-200', step: 2 },
  shipped:          { label: 'Shipped',           color: 'text-violet-500', bg: 'bg-violet-50',  border: 'border-violet-200', step: 3 },
  out_for_delivery: { label: 'Out for Delivery',  color: 'text-cyan-600',   bg: 'bg-cyan-50',    border: 'border-cyan-200',   step: 4 },
  delivered:        { label: 'Delivered',         color: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200',step: 5 },
  cancelled:        { label: 'Cancelled',         color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200',    step: -1 },
};
const STATUS_STEPS = ['pending','sourcing','processing','shipped','out_for_delivery','delivered'];

const PLATFORM_FEE_RATE = 0.025; // 2.5%

const CATEGORY_ICONS = {
  'ALL':          Globe,
  'Connectivity': Wifi,
  'Electronics':  Zap,
  'Energy':       Sparkles,
  'Drones':       Package,
  'Services':     ShieldCheck,
};

const BADGE_STYLE = {
  'POPULAR': 'bg-amber-400 text-amber-900',
  'NEW':     'bg-emerald-500 text-white',
  'SALE':    'bg-red-500 text-white',
  'FREE':    'bg-blue-500 text-white',
};

function fmt(n) {
  if (n === 0) return 'Free';
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ProductImage({ src, name, color = '#0f172a' }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: color }}>
        <Package size={32} className="text-white/40" />
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)} className="w-full h-full object-cover" />;
}

// ── HOME SCREEN ──────────────────────────────────────────────────────
function HomeScreen({ vendors, allProducts, search, setSearch, activeCategory, setActiveCategory, onVendorClick, onAddToCart, cart, balances }) {
  const categories = ['ALL', ...new Set(vendors.map(v => v.category))];

  const filteredVendors = vendors.filter(v =>
    activeCategory === 'ALL' || v.category === activeCategory
  );

  const filteredProducts = allProducts.filter(p => {
    const matchCat = activeCategory === 'ALL' || p.vendor?.category === activeCategory;
    const matchQ   = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const featured = vendors.filter(v => v.is_featured);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products or brands…"
          className="w-full pl-10 pr-4 py-3.5 bg-slate-100 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat] || Globe;
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${active ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <Icon size={12} />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Featured vendors — horizontal scroll */}
      {!search && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Featured Brands</h2>
            <span className="text-[10px] text-slate-400 font-semibold">{featured.length} partners</span>
          </div>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {filteredVendors.map(vendor => (
              <button
                key={vendor.id}
                onClick={() => onVendorClick(vendor)}
                className="shrink-0 w-52 rounded-3xl overflow-hidden shadow-md active:scale-95 transition-transform group"
              >
                <div className="h-28 flex items-center justify-center relative" style={{ backgroundColor: vendor.cover_color }}>
                  {vendor.logo_url ? (
                    <img
                      src={vendor.logo_url}
                      alt={vendor.name}
                      className="h-10 max-w-[150px] object-contain filter brightness-0 invert px-3"
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="text-2xl font-black text-white tracking-tight px-4">{vendor.name}</div>
                  )}
                  <div className="absolute bottom-2.5 left-0 right-0 text-center">
                    <span className="text-[9px] text-white/50 uppercase tracking-widest">{vendor.country}</span>
                  </div>
                  {vendor.is_verified && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <ShieldCheck size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="bg-white p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-800">{vendor.category}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <span className="text-[10px] text-slate-500 font-semibold">{vendor.rating} · {vendor.review_count.toLocaleString()}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
            {search ? `Results for "${search}"` : 'All Products'}
          </h2>
          <span className="text-[10px] text-slate-400 font-semibold">{filteredProducts.length} items</span>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                vendorColor={product.vendor?.cover_color}
                qty={cart[product.id]?.quantity || 0}
                onAdd={() => onAddToCart(product)}
                onRemove={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VENDOR SCREEN ────────────────────────────────────────────────────
function VendorScreen({ vendor, products, onBack, onAddToCart, onRemoveFromCart, cart }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const categories = ['ALL', ...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => activeTab === 'ALL' || p.category === activeTab);

  return (
    <div className="space-y-0 -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      {/* Vendor header */}
      <div className="relative h-44 flex items-end" style={{ backgroundColor: vendor.cover_color }}>
        <button onClick={onBack} className="absolute top-4 left-4 w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="px-6 pb-5 w-full">
          {vendor.logo_url ? (
            <img
              src={vendor.logo_url}
              alt={vendor.name}
              className="h-11 max-w-[200px] object-contain filter brightness-0 invert mb-2"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <h1 className="text-3xl font-black text-white tracking-tight">{vendor.name}</h1>
          )}
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] text-white/80 font-semibold">{vendor.rating} ({vendor.review_count.toLocaleString()} reviews)</span>
            </div>
            <span className="text-white/30">·</span>
            <div className="flex items-center gap-1 text-white/70">
              <Truck size={12} />
              <span className="text-[11px] font-semibold">{vendor.delivery_label}</span>
            </div>
            {vendor.is_verified && (
              <div className="flex items-center gap-1 text-blue-300">
                <ShieldCheck size={12} />
                <span className="text-[11px] font-semibold">Verified</span>
              </div>
            )}
          </div>
          <p className="text-white/60 text-[11px] mt-1.5 line-clamp-2">{vendor.tagline}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-8 py-4 bg-white border-b border-slate-100">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${activeTab === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4 md:px-8 pt-5 pb-8">
        {filtered.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            vendorColor={vendor.cover_color}
            qty={cart[product.id]?.quantity || 0}
            onAdd={() => onAddToCart(product)}
            onRemove={() => onRemoveFromCart(product.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── PRODUCT CARD ─────────────────────────────────────────────────────
function ProductCard({ product, vendorColor, qty, onAdd, onRemove }) {
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-shadow">
      <div className="h-36 relative overflow-hidden bg-slate-100">
        <ProductImage src={product.image_url} name={product.name} color={vendorColor} />
        {product.badge && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${BADGE_STYLE[product.badge] || 'bg-slate-800 text-white'}`}>
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{product.category}</p>
        <p className="text-xs font-black text-slate-800 leading-tight line-clamp-2 flex-1">{product.name}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-sm font-black text-slate-900">{fmt(product.price_usd)}</p>
            {product.original_price_usd && (
              <p className="text-[9px] text-slate-400 line-through">{fmt(product.original_price_usd)}</p>
            )}
          </div>
          {qty === 0 ? (
            <button onClick={onAdd} className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors active:scale-90 shadow-sm">
              <Plus size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={onRemove} className="w-7 h-7 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 active:scale-90 transition-all">
                <Minus size={12} />
              </button>
              <span className="text-xs font-black text-slate-800 w-4 text-center">{qty}</span>
              <button onClick={onAdd} className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center hover:bg-emerald-200 active:scale-90 transition-all">
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CART SCREEN ──────────────────────────────────────────────────────
function CartScreen({ cart, onBack, onRemove, onAdd, onCheckout, balances, isPlacingOrder }) {
  const items = Object.values(cart);
  const subtotal   = items.reduce((s, { product, quantity }) => s + product.price_usd * quantity, 0);
  const fee        = subtotal * PLATFORM_FEE_RATE;
  const total      = subtotal + fee;
  const canAfford  = (balances?.liquid_usd || 0) >= total;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ShoppingCart size={48} className="text-slate-200" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Your cart is empty</p>
        <button onClick={onBack} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-colors">
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">Continue Shopping</span>
      </button>

      <h2 className="text-lg font-black text-slate-800">Your Cart</h2>

      <div className="space-y-3">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              <ProductImage src={product.image_url} name={product.name} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-800 line-clamp-1">{product.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{product.category}</p>
              <p className="text-sm font-black text-slate-900 mt-1">{fmt(product.price_usd * quantity)}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => onAdd(product)} className="w-7 h-7 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 transition-all active:scale-90">
                <Plus size={12} />
              </button>
              <span className="text-xs font-black text-slate-800">{quantity}</span>
              <button onClick={() => onRemove(product.id)} className="w-7 h-7 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-all active:scale-90">
                {quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Order Summary</h3>
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
          <span className="font-bold">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600">
          <span className="flex items-center gap-1"><Tag size={12} /> Platform fee (2.5%)</span>
          <span className="font-bold">{fmt(fee)}</span>
        </div>
        <div className="h-px bg-slate-200" />
        <div className="flex justify-between text-base font-black text-slate-900">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Your IFB balance</span>
          <span className={canAfford ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmt(balances?.liquid_usd || 0)}</span>
        </div>
      </div>

      {!canAfford && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <X size={18} className="text-red-500 shrink-0" />
          <p className="text-xs font-bold text-red-700">Insufficient IFB balance. Top up your account to complete this order.</p>
        </div>
      )}

      <button
        disabled={!canAfford || isPlacingOrder}
        onClick={onCheckout}
        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
      >
        {isPlacingOrder ? <><Loader2 size={18} className="animate-spin" /> Processing…</> : <><ShieldCheck size={18} /> Pay {fmt(total)} with IFB</>}
      </button>

      <p className="text-center text-[10px] text-slate-400">Secured by Infinite Future Bank · 2.5% platform fee applies</p>
    </div>
  );
}

// ── ORDER CONFIRMATION ────────────────────────────────────────────────
function OrderConfirm({ order, onDone }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-5">
      <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
        <CheckCircle size={40} className="text-emerald-500" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-900">Order Placed!</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-xs">Your purchase is confirmed and being processed by the vendor. You'll receive updates in your notifications.</p>
      </div>
      <div className="bg-slate-50 rounded-2xl p-5 w-full max-w-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Order ID</span>
          <span className="font-black text-slate-800 font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Total charged</span>
          <span className="font-black text-slate-800">{fmt(order.total_usd)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">Status</span>
          <span className="font-black text-emerald-600 uppercase text-[11px] tracking-widest">Confirmed</span>
        </div>
      </div>
      <button onClick={onDone} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-colors shadow-md">
        Back to Market
      </button>
    </div>
  );
}

// ── CART FAB ─────────────────────────────────────────────────────────
function CartFAB({ count, total, onClick }) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none z-50 px-4">
      <button
        onClick={onClick}
        className="pointer-events-auto flex items-center gap-4 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl hover:bg-blue-700 transition-colors active:scale-95 animate-in slide-in-from-bottom-4 duration-300"
      >
        <div className="relative">
          <ShoppingCart size={20} />
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full text-[10px] font-black flex items-center justify-center">{count}</span>
        </div>
        <span className="font-black text-sm">View Cart</span>
        <span className="font-black text-sm text-blue-300">{fmt(total)}</span>
      </button>
    </div>
  );
}

// ── MY ORDERS SCREEN ─────────────────────────────────────────────────
function OrdersScreen({ orders }) {
  const [expanded, setExpanded] = useState(null);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <ClipboardList size={48} className="text-slate-200" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const meta = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
        const step = meta.step;
        const isOpen = expanded === order.id;
        return (
          <div key={order.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${meta.border}`}>
            {/* Order header */}
            <button
              onClick={() => setExpanded(isOpen ? null : order.id)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                {order.status === 'delivered' ? <CheckCircle size={18} className={meta.color} /> :
                 order.status === 'cancelled' ? <X size={18} className={meta.color} /> :
                 order.status === 'shipped' || order.status === 'out_for_delivery' ? <Truck size={18} className={meta.color} /> :
                 <Clock size={18} className={meta.color} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 font-mono">{order.id.slice(0,8).toUpperCase()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' · '}{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${meta.color} ${meta.bg} ${meta.border}`}>
                  {meta.label}
                </span>
                <p className="text-sm font-black text-slate-900 mt-1">{fmt(order.total_usd)}</p>
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-4">
                {/* Status timeline (skip for cancelled) */}
                {order.status !== 'cancelled' && (
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((s, i) => {
                      const done = step >= i;
                      return (
                        <React.Fragment key={s}>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${done ? 'bg-slate-900' : 'bg-slate-100'}`}>
                              {done && <CheckCircle size={10} className="text-white" />}
                            </div>
                            <span className={`text-[7px] font-black uppercase text-center w-12 leading-tight ${done ? 'text-slate-700' : 'text-slate-300'}`}>
                              {ORDER_STATUS[s].label}
                            </span>
                          </div>
                          {i < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mb-4 transition-colors ${step > i ? 'bg-slate-900' : 'bg-slate-100'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Items */}
                <div className="space-y-2">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-600">{item.quantity}× {item.product_name}</span>
                      <span className="font-bold text-slate-800">{fmt(item.line_total)}</span>
                    </div>
                  ))}
                </div>

                {/* Tracking */}
                {order.tracking_number && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${ORDER_STATUS.shipped.bg} border ${ORDER_STATUS.shipped.border}`}>
                    <MapPin size={14} className={ORDER_STATUS.shipped.color} />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-500">Tracking</p>
                      <p className="text-xs font-bold text-slate-800">{order.tracking_number}</p>
                    </div>
                    {order.tracking_url && (
                      <a href={order.tracking_url} target="_blank" rel="noreferrer"
                        className="ml-auto text-[10px] font-black text-blue-600 underline">Track</a>
                    )}
                  </div>
                )}

                {/* Estimated delivery */}
                {order.estimated_delivery && order.status !== 'delivered' && (
                  <p className="text-[10px] text-slate-500 font-semibold">
                    Estimated delivery: <strong className="text-slate-800">
                      {new Date(order.estimated_delivery).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </strong>
                  </p>
                )}

                {/* Admin notes to user */}
                {order.admin_notes && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-[10px] font-black uppercase text-blue-500 mb-1">Update from IFB</p>
                    <p className="text-xs text-slate-700">{order.admin_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────
export default function DeusMarket({ session, balances, fetchAllData }) {
  const [view, setView] = useState('HOME'); // HOME | VENDOR | CART | CONFIRM | ORDERS
  const [vendors, setVendors] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [myOrders, setMyOrders] = useState([]);

  const cartItems  = Object.values(cart);
  const cartCount  = cartItems.reduce((s, { quantity }) => s + quantity, 0);
  const cartSubtotal = cartItems.reduce((s, { product, quantity }) => s + product.price_usd * quantity, 0);
  const cartTotal  = cartSubtotal * (1 + PLATFORM_FEE_RATE);

  useEffect(() => { loadMarket(); }, []);

  // Load user's orders + subscribe to real-time status changes
  useEffect(() => {
    if (!session?.user?.id) return;
    const loadOrders = async () => {
      const { data } = await supabase
        .from('deus_market_orders')
        .select('*, items:deus_market_order_items(product_name, quantity, unit_price, line_total)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setMyOrders(data || []);
    };
    loadOrders();
    const channel = supabase.channel('my_market_orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'deus_market_orders',
        filter: `user_id=eq.${session.user.id}`
      }, () => loadOrders())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  const loadMarket = async () => {
    setIsLoading(true);
    try {
      const [{ data: vData }, { data: pData }] = await Promise.all([
        supabase.from('deus_market_vendors').select('*').order('is_featured', { ascending: false }),
        supabase.from('deus_market_products').select('*, vendor:deus_market_vendors(id,name,cover_color,category)').eq('is_available', true).order('sort_order'),
      ]);
      setVendors(vData || []);
      setAllProducts(pData || []);
    } catch (err) {
      console.error('DeusMarket load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openVendor = useCallback(async (vendor) => {
    setSelectedVendor(vendor);
    const { data } = await supabase
      .from('deus_market_products')
      .select('*')
      .eq('vendor_id', vendor.id)
      .eq('is_available', true)
      .order('sort_order');
    setVendorProducts(data || []);
    setView('VENDOR');
  }, []);

  const addToCart = useCallback((product) => {
    setCart(prev => ({
      ...prev,
      [product.id]: { product, quantity: (prev[product.id]?.quantity || 0) + 1 }
    }));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[productId]?.quantity > 1) {
        next[productId] = { ...next[productId], quantity: next[productId].quantity - 1 };
      } else {
        delete next[productId];
      }
      return next;
    });
  }, []);

  const placeOrder = async () => {
    setIsPlacingOrder(true);
    try {
      const fee   = cartSubtotal * PLATFORM_FEE_RATE;
      const total = cartSubtotal + fee;

      // 1. Create order record first — so we have an ID before touching balance
      const { data: order, error: orderErr } = await supabase
        .from('deus_market_orders')
        .insert({ user_id: session.user.id, total_usd: total, platform_fee: fee, status: 'pending' })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // 2. Insert order items
      const itemRows = cartItems.map(({ product, quantity }) => ({
        order_id:     order.id,
        vendor_id:    product.vendor_id,
        product_id:   product.id,
        product_name: product.name,
        quantity,
        unit_price:   product.price_usd,
        line_total:   product.price_usd * quantity,
      }));
      const { error: itemsErr } = await supabase.from('deus_market_order_items').insert(itemRows);
      if (itemsErr) {
        await supabase.from('deus_market_orders').delete().eq('id', order.id);
        throw itemsErr;
      }

      // 3. Deduct balance — only succeeds if liquid_usd >= total (safe decrement)
      const { data: updatedBal, error: balErr } = await supabase
        .from('balances')
        .update({ liquid_usd: (balances.liquid_usd - total) })
        .eq('user_id', session.user.id)
        .gte('liquid_usd', total)
        .select('liquid_usd');
      if (balErr || !updatedBal?.length) {
        // Rollback: cancel order so IFB doesn't process it
        await supabase.from('deus_market_orders').update({ status: 'cancelled' }).eq('id', order.id);
        throw new Error('Insufficient balance. Your order has been cancelled.');
      }

      // Record in user's transaction history
      await supabase.from('transactions').insert({
        user_id:          session.user.id,
        transaction_type: 'market_purchase',
        amount:           -total,
        description:      `DEUS Market — ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`,
        status:           'completed',
      });

      // Notify back office
      const itemList = cartItems.map(({ product, quantity }) =>
        `<li>${quantity}× ${product.name} — ${fmt(product.price_usd * quantity)}</li>`).join('');
      await sendEmail(ADMIN_EMAIL, `🛒 New DEUS Market Order — ${fmt(total)}`,
        `<h2>New order received</h2><p>Order ID: <strong>${order.id}</strong></p>
         <p>Total: <strong>${fmt(total)}</strong> (fee: ${fmt(fee)})</p>
         <ul>${itemList}</ul>
         <p>User ID: ${session.user.id}</p>
         <p>Please process this order in the Admin Dashboard → Market Orders.</p>`
      );

      setLastOrder(order);
      setCart({});
      await fetchAllData();
      setView('CONFIRM');
    } catch (err) {
      console.error('Order error:', err);
      alert(err.message || 'Order failed. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading DEUS Market…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      {/* Header bar */}
      {view !== 'VENDOR' && view !== 'CONFIRM' && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-none">DEUS Market</h1>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{vendors.length} brands · {allProducts.length} products</p>
            </div>
          </div>
          {(view === 'HOME' || view === 'ORDERS') && cartCount > 0 && (
            <button onClick={() => setView('CART')} className="relative flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-black hover:bg-blue-600 transition-colors shadow-md">
              <ShoppingCart size={14} />
              <span>{cartCount}</span>
              <span className="text-blue-300">{fmt(cartTotal)}</span>
            </button>
          )}
          {view === 'CART' && (
            <button onClick={() => setView('HOME')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Bottom nav tabs (HOME / ORDERS only) */}
      {(view === 'HOME' || view === 'ORDERS') && (
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-5 gap-1">
          {[
            { id: 'HOME',   Icon: Store,         label: 'Browse' },
            { id: 'ORDERS', Icon: ClipboardList,  label: `My Orders${myOrders.length ? ` (${myOrders.length})` : ''}` },
          ].map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Views */}
      {view === 'HOME' && (
        <HomeScreen
          vendors={vendors}
          allProducts={allProducts}
          search={search}
          setSearch={setSearch}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          onVendorClick={openVendor}
          onAddToCart={addToCart}
          cart={cart}
          balances={balances}
        />
      )}
      {view === 'VENDOR' && selectedVendor && (
        <VendorScreen
          vendor={selectedVendor}
          products={vendorProducts}
          onBack={() => setView('HOME')}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
          cart={cart}
        />
      )}
      {view === 'CART' && (
        <CartScreen
          cart={cart}
          onBack={() => setView('HOME')}
          onAdd={addToCart}
          onRemove={removeFromCart}
          onCheckout={placeOrder}
          balances={balances}
          isPlacingOrder={isPlacingOrder}
        />
      )}
      {view === 'CONFIRM' && lastOrder && (
        <OrderConfirm order={lastOrder} onDone={() => setView('ORDERS')} />
      )}
      {view === 'ORDERS' && (
        <OrdersScreen orders={myOrders} />
      )}

      {/* Floating cart button (HOME and VENDOR views) */}
      {(view === 'HOME' || view === 'VENDOR') && (
        <CartFAB count={cartCount} total={cartTotal} onClick={() => setView('CART')} />
      )}
    </div>
  );
}
