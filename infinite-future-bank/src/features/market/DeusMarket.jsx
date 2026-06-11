import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Search, ShoppingCart, Star, ChevronRight, ArrowLeft,
  Plus, Minus, Trash2, Truck, Zap, Globe, Package,
  CheckCircle, Loader2, X, ShieldCheck, Tag, Sparkles,
  Store, Wifi
} from 'lucide-react';

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
                  <div className="text-center px-4">
                    <div className="text-2xl font-black text-white tracking-tight">{vendor.name}</div>
                    <div className="text-[10px] text-white/60 mt-1 uppercase tracking-widest">{vendor.country}</div>
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
          <h1 className="text-3xl font-black text-white tracking-tight">{vendor.name}</h1>
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

// ── MAIN COMPONENT ───────────────────────────────────────────────────
export default function DeusMarket({ session, balances, fetchAllData }) {
  const [view, setView] = useState('HOME'); // HOME | VENDOR | CART | CONFIRM
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

  const cartItems  = Object.values(cart);
  const cartCount  = cartItems.reduce((s, { quantity }) => s + quantity, 0);
  const cartSubtotal = cartItems.reduce((s, { product, quantity }) => s + product.price_usd * quantity, 0);
  const cartTotal  = cartSubtotal * (1 + PLATFORM_FEE_RATE);

  useEffect(() => { loadMarket(); }, []);

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

      // Deduct from liquid balance
      const { error: balErr } = await supabase
        .from('balances')
        .update({ liquid_usd: (balances.liquid_usd - total) })
        .eq('user_id', session.user.id);
      if (balErr) throw balErr;

      // Create order record
      const { data: order, error: orderErr } = await supabase
        .from('deus_market_orders')
        .insert({ user_id: session.user.id, total_usd: total, platform_fee: fee, status: 'confirmed' })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // Insert order items
      const itemRows = cartItems.map(({ product, quantity }) => ({
        order_id:     order.id,
        vendor_id:    product.vendor_id,
        product_id:   product.id,
        product_name: product.name,
        quantity,
        unit_price:   product.price_usd,
        line_total:   product.price_usd * quantity,
      }));
      await supabase.from('deus_market_order_items').insert(itemRows);

      // Record in user's transaction history
      await supabase.from('transactions').insert({
        user_id:          session.user.id,
        transaction_type: 'market_purchase',
        amount:           -total,
        description:      `DEUS Market — ${cartItems.length} item${cartItems.length > 1 ? 's' : ''}`,
        status:           'completed',
      });

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
      {view !== 'VENDOR' && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-2xl flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-none">DEUS Market</h1>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{vendors.length} brands · {allProducts.length} products</p>
            </div>
          </div>
          {view !== 'CART' && cartCount > 0 && (
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
        <OrderConfirm order={lastOrder} onDone={() => setView('HOME')} />
      )}

      {/* Floating cart button (HOME and VENDOR views) */}
      {(view === 'HOME' || view === 'VENDOR') && (
        <CartFAB count={cartCount} total={cartTotal} onClick={() => setView('CART')} />
      )}
    </div>
  );
}
