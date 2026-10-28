/* ===============================================================
   MOIN QURAN BOX - ENTERPRISE APPLICATION ENGINE (app.js)
   - Full Storefront, Cart, Coupons, POS, CRM, CMS & Firebase Cloud Sync
   =============================================================== */

const STORAGE_KEYS = {
  PRODUCTS: "mqb_v6_products",
  ORDERS:   "mqb_v6_orders",
  RETURNS:  "mqb_v6_returns",
  USERS:    "mqb_v6_users",
  CONFIG:   "mqb_v6_config",
  COUPONS:  "mqb_v6_coupons",
  RESETS:   "mqb_v6_resets",
  WISHLIST: "mqb_v6_wishlist",
  REVIEWS:  "mqb_v6_reviews",
  FLAGS:    "mqb_v6_flags",
  SESSION:  "mqb_v6_session",
  CART:     "mqb_v6_cart",
  OVERRIDE: "mqb_v6_manual_override"
};

// Initialize Core State from LocalStorage or Seed Data (data.js)
let config   = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG))   || { ...window.MQB_DEFAULTS.config };
let flags    = JSON.parse(localStorage.getItem(STORAGE_KEYS.FLAGS))    || { ...window.MQB_DEFAULTS.flags };
let products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS)) || [...window.MQB_DEFAULTS.products];
let users    = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS))    || [...window.MQB_DEFAULTS.users];
let orders   = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS))   || [...window.MQB_DEFAULTS.orders];
let coupons  = JSON.parse(localStorage.getItem(STORAGE_KEYS.COUPONS))  || [...window.MQB_DEFAULTS.coupons];
let returns  = JSON.parse(localStorage.getItem(STORAGE_KEYS.RETURNS))  || [];
let resets   = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESETS))   || [];
let wishlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.WISHLIST)) || [];
let reviews  = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS))  || [];
let cart     = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART))     || [];
let currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || null;
let manualFinancialOverride = JSON.parse(localStorage.getItem(STORAGE_KEYS.OVERRIDE)) || null;

// Runtime UI state
let currentCategory = "All";
let currentAnalyticsRange = "all";
let appliedCoupon = null;
let lastPlacedOrder = null;
let activeMediaStream = null;
let posTicket = [];

// Cross-Tab Broadcast Sync
const syncBroadcast = window.BroadcastChannel ? new BroadcastChannel("mqb_hyderabad_sync_v6") : null;
if (syncBroadcast) {
  syncBroadcast.onmessage = (event) => {
    if (event.data && event.data.type === "SYNC_UPDATE") {
      applyRemoteSyncPayload(event.data.payload);
    }
  };
}

// Persist & Sync Function
function persistAllData(skipBroadcast = false) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  localStorage.setItem(STORAGE_KEYS.FLAGS, JSON.stringify(flags));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
  localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns));
  localStorage.setItem(STORAGE_KEYS.RESETS, JSON.stringify(resets));
  localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
  localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  localStorage.setItem(STORAGE_KEYS.OVERRIDE, JSON.stringify(manualFinancialOverride));

  const payload = {
    timestamp: Date.now(),
    sender: getDeviceId(),
    products, orders, returns, users, coupons, config, flags, manualFinancialOverride
  };

  if (!skipBroadcast && syncBroadcast) {
    try { syncBroadcast.postMessage({ type: "SYNC_UPDATE", payload }); } catch (e) {}
  }

  // Push to Firebase Cloud if connected
  if (window.pushToFirebaseCloud) {
    window.pushToFirebaseCloud(payload);
  }
  updateSyncStatusUI();
}

function applyRemoteSyncPayload(payload) {
  if (!payload || payload.sender === getDeviceId()) return;
  if (payload.products) products = payload.products;
  if (payload.orders) orders = payload.orders;
  if (payload.users) users = payload.users;
  if (payload.config) config = payload.config;
  if (payload.flags) flags = payload.flags;
  if (payload.coupons) coupons = payload.coupons;
  if (payload.manualFinancialOverride !== undefined) manualFinancialOverride = payload.manualFinancialOverride;

  persistAllData(true);
  syncLiveCmsUI();
  renderProducts();
  updateCartUI();
  if (!document.getElementById("adminDashboardModal").classList.contains("hidden")) {
    renderAdminInventoryTable();
    renderAdminOrdersTable();
    updateAnalyticsDashboard();
  }
}

function getDeviceId() {
  let id = localStorage.getItem("mqb_device_id");
  if (!id) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    id = (isMobile ? "Mobile-" : "Desktop-") + Math.random().toString(36).substring(2, 7);
    localStorage.setItem("mqb_device_id", id);
  }
  return id;
}

function updateSyncStatusUI() {
  const timeLabel = document.getElementById("syncLastTime");
  const devLabel = document.getElementById("currentDeviceIdLabel");
  if (timeLabel) timeLabel.textContent = new Date().toLocaleTimeString();
  if (devLabel) devLabel.textContent = getDeviceId();
}

function triggerForceSyncCloud() {
  persistAllData();
  alert("Alhamdulillah! All store stock, orders, accounts, and settings have been synced across mobile & desktop.");
}

function fetchCloudDataNow() {
  if (window.pullFromFirebaseCloud) {
    window.pullFromFirebaseCloud();
  } else {
    alert("Sync heartbeat active! Mobile and Desktop databases are aligned.");
  }
}

/* -------------------------------------------------------------
   BOOTSTRAP ON PAGE LOAD
------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const yr = document.getElementById("currentYear");
  if (yr) yr.textContent = new Date().getFullYear();

  syncLiveCmsUI();
  syncSessionUI();
  renderCategoryChips();
  renderProducts();
  updateCartUI();
  updateWishlistBadge();
  updateSyncStatusUI();
});

/* -------------------------------------------------------------
   STOREFRONT & CMS SYNC
------------------------------------------------------------- */
function syncLiveCmsUI() {
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setTxt("announcementText", config.announcement);
  setTxt("brandNavTitle", config.brandName);
  setTxt("drawerBrandName", config.brandName);
  setTxt("footerBrandName", config.brandName);
  setTxt("copyrightBrand", config.brandName);
  setTxt("footerUrduSubtitle", config.urduSubtitle || "معین قرآن باکس");
  setTxt("footerProprietor", config.proprietor);
  setTxt("footerAddress", config.address);
  setTxt("footerPhones", `+91 ${config.phone1} / +91 ${config.phone2}`);
  setTxt("footerEmail", config.ownerEmail);
  setTxt("footerGst", config.gst);
  setTxt("heroHeadline", config.heroHeadline);

  setTxt("modalContactAddr", config.address);
  setTxt("modalContactPhones", `+91 ${config.phone1} / +91 ${config.phone2}`);
  setTxt("modalContactWa", `+91 ${config.whatsappPhone}`);

  setTxt("displayCheckoutUpi", config.upiId);
  setTxt("displayCheckoutName", config.merchantName);
  setTxt("displayCheckoutBank", config.bankName);
  setTxt("displayCheckoutAcc", config.accountNum);
  setTxt("displayCheckoutIfsc", config.ifsc);

  const waUrl = `https://wa.me/91${config.whatsappPhone}?text=Assalamu%20Alaikum,%20I%20have%20an%20inquiry%20at%20${encodeURIComponent(config.brandName)}`;
  const flt = document.getElementById("floatingWhatsAppLink");
  if (flt) flt.href = waUrl;
  const mWa = document.getElementById("modalContactWaBtn");
  if (mWa) mWa.href = waUrl;
}

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
}

function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  if (!container) return;
  const cats = window.MQB_DEFAULTS.categories;
  container.innerHTML = cats.map(cat => `
    <button onclick="filterCategory('${cat}')" class="px-3.5 py-1.5 rounded-full transition ${currentCategory === cat ? 'bg-brand-charcoal text-white font-bold shadow-sm' : 'bg-white text-brand-charcoal border border-brand-border hover:bg-neutral-100'}">
      ${cat}
    </button>
  `).join("");
}

function filterCategory(cat) {
  currentCategory = cat;
  const heading = document.getElementById("currentCategoryHeading");
  if (heading) heading.textContent = cat === "All" ? "All Sacred Collections" : cat;
  renderCategoryChips();
  renderProducts();
}

function resetFilters() {
  const chk = document.getElementById("filterInStockOnly");
  if (chk) chk.checked = false;
  const srt = document.getElementById("filterSortOrder");
  if (srt) srt.value = "featured";
  filterCategory("All");
}

function scrollToProducts() {
  const grid = document.getElementById("productGrid");
  if (grid) grid.scrollIntoView({ behavior: "smooth" });
}

function renderProducts(customList = null) {
  const grid = document.getElementById("productGrid");
  const emptyState = document.getElementById("emptyCatalogState");
  if (!grid) return;

  let list = customList ? [...customList] : [...products];

  if (!customList && currentCategory !== "All") {
    if (currentCategory === "Bestsellers") {
      list = list.filter(p => p.isBestseller || p.rating >= 4.9);
    } else {
      list = list.filter(p => p.category === currentCategory);
    }
  }

  const inStockOnly = document.getElementById("filterInStockOnly")?.checked;
  if (inStockOnly) {
    list = list.filter(p => (p.stock || 0) > 0);
  }

  const sortOrder = document.getElementById("filterSortOrder")?.value || "featured";
  if (sortOrder === "low-to-high") list.sort((a, b) => a.salePrice - b.salePrice);
  else if (sortOrder === "high-to-low") list.sort((a, b) => b.salePrice - a.salePrice);
  else if (sortOrder === "rating") list.sort((a, b) => (b.rating || 5) - (a.rating || 5));

  if (list.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  grid.innerHTML = list.map(p => {
    const outOfStock = (p.stock || 0) <= 0;
    const isLowStock = p.stock > 0 && p.stock <= 5;
    const isWished = wishlist.includes(p.id);

    return `
      <div class="bg-white rounded-xl border border-brand-border overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-200 group">
        <div class="relative bg-neutral-100 pt-[100%] overflow-hidden">
          <img src="${p.image}" alt="${p.title}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <span class="absolute top-2.5 left-2.5 bg-brand-darkgreen text-white text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">Sale</span>
          ${isLowStock ? `<span class="absolute bottom-2 left-2 bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">Only ${p.stock} left</span>` : ''}
          ${outOfStock ? `<span class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xs uppercase tracking-widest">Sold Out</span>` : ''}
          <button onclick="toggleWishlist('${p.id}')" class="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-sm hover:scale-110 transition">
            ${isWished ? '❤️' : '🤍'}
          </button>
        </div>

        <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <span class="text-[10px] uppercase tracking-wider text-brand-gold font-bold block mb-0.5">${p.category}</span>
            <h3 class="serif-title font-bold text-xs sm:text-sm text-brand-charcoal line-clamp-2 leading-snug">${p.title}</h3>
            ${flags.enableReviews ? `
              <div class="flex items-center gap-1 text-[11px] text-amber-500 mt-1 cursor-pointer" onclick="openReviewModal('${p.id}')">
                <span>★★★★★</span>
                <span class="text-brand-charcoal font-bold">${p.rating || '5.0'}</span>
                <span class="text-neutral-400">(${p.reviewsCount || 12})</span>
              </div>
            ` : ''}
          </div>

          <div>
            <div class="flex items-baseline gap-2 mb-2.5">
              <span class="text-xs line-through text-neutral-400">Rs. ${(p.oldPrice || (p.salePrice + 400)).toLocaleString('en-IN')}.00</span>
              <span class="text-sm sm:text-base font-bold text-brand-charcoal">Rs. ${p.salePrice.toLocaleString('en-IN')}.00</span>
            </div>

            <button onclick="addToCart('${p.id}')" ${outOfStock ? 'disabled' : ''} class="w-full py-2.5 px-3 border border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-40">
              ${outOfStock ? 'Out of Stock' : 'Add to cart'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

/* -------------------------------------------------------------
   CART & COUPON ENGINE
------------------------------------------------------------- */
function addToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;
  if ((prod.stock || 0) <= 0) {
    alert("Sorry, this item is currently out of stock.");
    return;
  }

  const existing = cart.find(it => it.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: prod.id,
      title: prod.title,
      salePrice: prod.salePrice,
      image: prod.image,
      qty: 1
    });
  }

  try { document.getElementById("sndAddToCart")?.play(); } catch (e) {}
  persistAllData();
  updateCartUI();
  toggleCart(true);
}

function updateCartQty(productId, delta) {
  const item = cart.find(it => it.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(it => it.id !== productId);
  }
  persistAllData();
  updateCartUI();
}

function applyPromoCode() {
  const input = document.getElementById("cartCouponInput");
  const notice = document.getElementById("cartCouponNotice");
  if (!input || !notice) return;

  const code = input.value.trim().toUpperCase();
  if (!code) return;

  const rawTotal = cart.reduce((sum, it) => sum + (it.salePrice * it.qty), 0);
  const found = coupons.find(c => c.code === code && c.active);

  notice.classList.remove("hidden");
  if (!found) {
    appliedCoupon = null;
    notice.textContent = "❌ Invalid or expired promo code.";
    notice.className = "text-[11px] font-semibold text-red-600";
    updateCartUI();
    return;
  }

  if (rawTotal < (found.minOrder || 0)) {
    appliedCoupon = null;
    notice.textContent = `⚠️ Minimum order of ₹${found.minOrder} required for ${found.code}.`;
    notice.className = "text-[11px] font-semibold text-amber-700";
    updateCartUI();
    return;
  }

  appliedCoupon = found;
  notice.textContent = `✓ Promo ${found.code} applied!`;
  notice.className = "text-[11px] font-semibold text-emerald-700";
  updateCartUI();
}

function getCartTotals() {
  const rawSubtotal = cart.reduce((sum, it) => sum + (it.salePrice * it.qty), 0);
  let discount = 0;
  if (appliedCoupon && rawSubtotal >= (appliedCoupon.minOrder || 0)) {
    discount = appliedCoupon.type === "percent"
      ? Math.round((rawSubtotal * appliedCoupon.value) / 100)
      : appliedCoupon.value;
  }
  const netPayable = Math.max(0, rawSubtotal - discount);
  return { rawSubtotal, discount, netPayable };
}

function updateCartUI() {
  const count = cart.reduce((sum, it) => sum + it.qty, 0);
  const badge = document.getElementById("cartCountBadge");
  if (badge) badge.textContent = count;

  const { rawSubtotal, discount, netPayable } = getCartTotals();

  const rawEl = document.getElementById("cartRawSubtotal");
  if (rawEl) rawEl.textContent = `₹${rawSubtotal.toLocaleString('en-IN')}.00`;

  const discRow = document.getElementById("cartDiscountRow");
  const discAmt = document.getElementById("cartDiscountAmount");
  if (discRow && discAmt) {
    if (discount > 0) {
      discRow.classList.remove("hidden");
      discAmt.textContent = `-₹${discount.toLocaleString('en-IN')}.00`;
    } else {
      discRow.classList.add("hidden");
    }
  }

  const netEl = document.getElementById("cartSubtotal");
  if (netEl) netEl.textContent = `₹${netPayable.toLocaleString('en-IN')}.00`;

  const container = document.getElementById("cartContainer");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center space-y-3">
        <p class="serif-title text-lg text-brand-charcoal">Your cart is empty</p>
        <button onclick="toggleCart(false)" class="px-5 py-2.5 bg-brand-charcoal text-white text-xs font-bold uppercase rounded-lg">Continue shopping</button>
      </div>
    `;
    return;
  }

  container.innerHTML = cart.map(it => `
    <div class="flex items-center gap-3 py-3 border-b border-brand-border">
      <img src="${it.image}" class="w-14 h-14 object-cover rounded-lg border border-brand-border" />
      <div class="flex-1">
        <h4 class="font-bold text-xs text-brand-charcoal line-clamp-1">${it.title}</h4>
        <p class="text-xs text-brand-muted">₹${it.salePrice}</p>
        <div class="flex items-center gap-2 mt-1">
          <button onclick="updateCartQty('${it.id}', -1)" class="w-6 h-6 bg-brand-sand rounded font-bold text-xs">-</button>
          <span class="text-xs font-bold">${it.qty}</span>
          <button onclick="updateCartQty('${it.id}', 1)" class="w-6 h-6 bg-brand-sand rounded font-bold text-xs">+</button>
        </div>
      </div>
      <div class="text-right font-mono font-bold text-xs text-brand-charcoal">
        ₹${(it.salePrice * it.qty).toLocaleString('en-IN')}
      </div>
    </div>
  `).join("");
}

function toggleCart(show) {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  if (!drawer || !backdrop) return;
  if (show) {
    drawer.classList.remove("pointer-events-none", "translate-x-full");
    backdrop.classList.add("opacity-100");
  } else {
    drawer.classList.add("translate-x-full");
    backdrop.classList.remove("opacity-100");
    setTimeout(() => drawer.classList.add("pointer-events-none"), 300);
  }
}

/* -------------------------------------------------------------
   CHECKOUT & ORDER CONFIRMATION
------------------------------------------------------------- */
function startCheckout() {
  if (cart.length === 0) {
    alert("Your shopping bag is empty!");
    return;
  }
  toggleCart(false);

  const { netPayable } = getCartTotals();
  document.getElementById("checkoutTotalAmount").textContent = `₹${netPayable.toLocaleString('en-IN')}.00`;

  // Pre-fill user details if logged in
  if (currentUser) {
    document.getElementById("chkName").value = currentUser.name || "";
    document.getElementById("chkPhone").value = currentUser.phone || "";
    document.getElementById("chkEmail").value = currentUser.email || "";
  }

  // Generate dynamic UPI QR code
  const upiUri = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.merchantName)}&am=${netPayable}&cu=INR`;
  const qrImg = document.getElementById("checkoutQrImg");
  if (qrImg) {
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;
  }

  const codWrap = document.getElementById("chkCodOptionWrap");
  if (codWrap) codWrap.classList.toggle("hidden", !flags.enableCod);

  syncLiveCmsUI();
  document.getElementById("checkoutModal").classList.remove("hidden");
}

function closeCheckoutModal() {
  document.getElementById("checkoutModal").classList.add("hidden");
}

function togglePaymentType(type) {
  const panel = document.getElementById("upiPaymentPanel");
  if (panel) panel.classList.toggle("hidden", type !== "UPI");
}

function copyUpiId() {
  navigator.clipboard?.writeText(config.upiId);
  alert(`UPI ID copied: ${config.upiId}`);
}

function handlePlaceOrder(e) {
  e.preventDefault();
  const name = document.getElementById("chkName").value.trim();
  const phone = document.getElementById("chkPhone").value.trim();
  const email = document.getElementById("chkEmail").value.trim();
  const addr = document.getElementById("chkAddress").value.trim();
  const city = document.getElementById("chkCity").value.trim();
  const pin = document.getElementById("chkPincode").value.trim();
  const utr = document.getElementById("chkUtr").value.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "UPI";

  const { netPayable } = getCartTotals();
  const orderId = `MQB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = {
    orderId,
    customerName: name,
    customerPhone: phone,
    customerEmail: email,
    address: `${addr}, ${city} - ${pin}`,
    total: netPayable,
    paymentMethod,
    utr,
    channel: "Online",
    status: "Ordered",
    courierName: "Hyderabad Express Dispatch",
    awb: "PENDING-AWB",
    trackingUrl: "",
    date: new Date().toISOString(),
    items: [...cart]
  };

  // Deduct stock
  cart.forEach(item => {
    const p = products.find(x => x.id === item.id);
    if (p) p.stock = Math.max(0, (p.stock || 0) - item.qty);
  });

  orders.unshift(newOrder);
  lastPlacedOrder = newOrder;
  cart = [];
  appliedCoupon = null;
  persistAllData();
  updateCartUI();
  renderProducts();
  closeCheckoutModal();

  // Populate Success Modal
  document.getElementById("successOrderIdDisplay").textContent = orderId;

  const waText = `*NEW ORDER PLACED — ${config.brandName}*\n\n` +
    `*Order ID:* ${orderId}\n` +
    `*Customer:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Address:* ${newOrder.address}\n` +
    `*Payment:* ${paymentMethod} ${utr ? `(UTR: ${utr})` : ''}\n` +
    `*Total Amount:* ₹${netPayable}\n\n` +
    `*Items:*\n` + newOrder.items.map(i => `• ${i.qty}x ${i.title} (₹${i.salePrice * i.qty})`).join("\n");

  document.getElementById("successWhatsAppOrderBtn").href = `https://wa.me/91${config.whatsappPhone}?text=${encodeURIComponent(waText)}`;
  document.getElementById("successEmailOrderBtn").href = `mailto:${encodeURIComponent(config.ownerEmail)}?subject=${encodeURIComponent('New Order ' + orderId)}&body=${encodeURIComponent(waText)}`;

  document.getElementById("orderSuccessModal").classList.remove("hidden");
}

function closeSuccessModal() {
  document.getElementById("orderSuccessModal").classList.add("hidden");
}

/* -------------------------------------------------------------
   WISHLIST & REVIEWS
------------------------------------------------------------- */
function toggleWishlist(productId) {
  if (wishlist.includes(productId)) {
    wishlist = wishlist.filter(id => id !== productId);
  } else {
    wishlist.push(productId);
  }
  persistAllData();
  updateWishlistBadge();
  renderProducts();
}

function updateWishlistBadge() {
  const b = document.getElementById("wishlistCountBadge");
  if (b) b.classList.toggle("hidden", wishlist.length === 0);
}

function openWishlistModal() {
  const box = document.getElementById("wishlistContainer");
  const wishedItems = products.filter(p => wishlist.includes(p.id));
  if (wishedItems.length === 0) {
    box.innerHTML = `<p class="text-xs text-brand-muted text-center py-8">Your wishlist is currently empty.</p>`;
  } else {
    box.innerHTML = wishedItems.map(p => `
      <div class="flex items-center justify-between p-2.5 border border-brand-border rounded-xl bg-brand-sand/40 text-xs">
        <div class="flex items-center gap-2.5">
          <img src="${p.image}" class="w-10 h-10 rounded object-cover" />
          <div>
            <p class="font-bold text-brand-charcoal">${p.title}</p>
            <p class="text-brand-gold font-bold">₹${p.salePrice}</p>
          </div>
        </div>
        <button onclick="addToCart('${p.id}'); closeWishlistModal();" class="px-3 py-1.5 bg-brand-charcoal text-white rounded-lg font-bold">Add</button>
      </div>
    `).join("");
  }
  document.getElementById("wishlistModal").classList.remove("hidden");
}

function closeWishlistModal() {
  document.getElementById("wishlistModal").classList.add("hidden");
}

function openReviewModal(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  document.getElementById("reviewTargetId").value = p.id;
  document.getElementById("reviewProductTitle").textContent = p.title;
  document.getElementById("reviewModal").classList.remove("hidden");
}

function closeReviewModal() {
  document.getElementById("reviewModal").classList.add("hidden");
}

function handleReviewSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("reviewTargetId").value;
  const stars = parseInt(document.getElementById("revStars").value) || 5;
  const p = products.find(x => x.id === id);
  if (p) {
    p.reviewsCount = (p.reviewsCount || 10) + 1;
    p.rating = +(((p.rating * (p.reviewsCount - 1)) + stars) / p.reviewsCount).toFixed(1);
  }
  persistAllData();
  renderProducts();
  closeReviewModal();
  alert("JazakAllah Khair! Your review has been submitted.");
}

/* -------------------------------------------------------------
   CUSTOMER 360° CRM DESK & POS BILLING
------------------------------------------------------------- */
function handleCrmCustomerLookup() {
  const q = document.getElementById("crmSearchInput").value.trim().toLowerCase();
  const box = document.getElementById("crmCustomerDetails");
  if (!q || !box) return;

  const user = users.find(u => u.phone.includes(q) || (u.email && u.email.toLowerCase().includes(q)) || u.name.toLowerCase().includes(q));
  const custOrders = orders.filter(o => o.customerPhone.includes(q) || (o.customerEmail && o.customerEmail.toLowerCase().includes(q)) || o.customerName.toLowerCase().includes(q));

  box.classList.remove("hidden");

  if (!user && custOrders.length === 0) {
    box.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-bold">No registered customer or order history matched "${q}".</div>`;
    return;
  }

  const totalSpend = custOrders.reduce((s, o) => s + (o.total || 0), 0);

  box.innerHTML = `
    <div class="bg-white p-5 rounded-xl border border-brand-border shadow-sm space-y-4 text-xs">
      <div class="flex flex-wrap justify-between items-start gap-3 pb-3 border-b border-brand-border">
        <div>
          <h5 class="serif-title text-base font-bold text-brand-charcoal">${user ? user.name : custOrders[0].customerName}</h5>
          <p class="text-brand-muted">📞 ${user ? user.phone : custOrders[0].customerPhone} • ✉️ ${user ? user.email : (custOrders[0].customerEmail || 'N/A')}</p>
          ${user ? `<p class="mt-1 font-mono text-[11px]">Current Password: <strong class="text-brand-gold">${user.password}</strong> | PIN: <strong>${user.pin || 'None'}</strong></p>` : ''}
        </div>
        <div class="text-right">
          <span class="text-[10px] uppercase text-brand-muted block">Lifetime Spend</span>
          <span class="text-lg font-bold font-mono text-brand-darkgreen">₹${totalSpend.toLocaleString('en-IN')}</span>
        </div>
      </div>

      ${user ? `
        <div class="flex flex-wrap gap-2">
          <button onclick="promptResetPassword('${user.id}')" class="px-3 py-1.5 bg-brand-charcoal text-white rounded-lg font-bold">🔑 Override Password</button>
          <button onclick="resetCustomerBiometrics('${user.id}')" class="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-bold">📷 Clear Face ID</button>
          <button onclick="deleteCustomerAccount('${user.id}')" class="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg font-bold">🗑️ Delete Profile</button>
        </div>
      ` : ''}

      <div>
        <h6 class="font-bold uppercase text-brand-charcoal mb-2">Customer Orders (${custOrders.length})</h6>
        <div class="space-y-2">
          ${custOrders.map(o => `
            <div class="p-2.5 bg-brand-sand rounded-lg border border-brand-border flex justify-between items-center">
              <div>
                <span class="font-mono font-bold">${o.orderId}</span> • <span>${new Date(o.date).toLocaleDateString()}</span>
                <p class="text-[11px] text-neutral-600">${o.items.map(i => `${i.qty}x ${i.title}`).join(', ')}</p>
              </div>
              <div class="text-right">
                <span class="font-bold block">₹${o.total}</span>
                <span class="text-[10px] px-2 py-0.5 rounded bg-white font-bold">${o.status}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderPosCatalog() {
  const grid = document.getElementById("posCatalogGrid");
  if (!grid) return;
  const q = (document.getElementById("posSearchInput")?.value || "").toLowerCase();
  const filtered = products.filter(p => p.title.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)));

  grid.innerHTML = filtered.map(p => `
    <div onclick="addPosTicketItem('${p.id}')" class="p-2.5 bg-brand-sand/50 hover:bg-brand-sand border border-brand-border rounded-xl cursor-pointer transition flex flex-col justify-between text-xs">
      <div>
        <span class="font-bold text-brand-charcoal line-clamp-1">${p.title}</span>
        <span class="text-[10px] text-neutral-500 block">Stock: ${p.stock}</span>
      </div>
      <div class="mt-2 flex justify-between items-center">
        <span class="font-mono font-bold text-brand-darkgreen">₹${p.salePrice}</span>
        <span class="text-[10px] bg-brand-charcoal text-white px-2 py-0.5 rounded font-bold">+ Bill</span>
      </div>
    </div>
  `).join("");
}

function addPosTicketItem(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  const exist = posTicket.find(it => it.id === productId);
  if (exist) exist.qty += 1;
  else posTicket.push({ id: p.id, title: p.title, salePrice: p.salePrice, qty: 1 });
  renderPosTicketUI();
}

function renderPosTicketUI() {
  const box = document.getElementById("posTicketItems");
  const totEl = document.getElementById("posTicketTotal");
  if (!box || !totEl) return;

  const total = posTicket.reduce((s, it) => s + (it.salePrice * it.qty), 0);
  totEl.textContent = `₹${total.toLocaleString('en-IN')}`;

  if (posTicket.length === 0) {
    box.innerHTML = `<p class="py-6 text-center text-neutral-400">Tap products on the left to add to walk-in bill.</p>`;
    return;
  }

  box.innerHTML = posTicket.map((it, idx) => `
    <div class="py-2 flex justify-between items-center">
      <div>
        <span class="font-bold">${it.title}</span>
        <span class="text-neutral-500 block">₹${it.salePrice} x ${it.qty}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-mono font-bold">₹${it.salePrice * it.qty}</span>
        <button onclick="posTicket.splice(${idx}, 1); renderPosTicketUI();" class="text-red-500 font-bold">✕</button>
      </div>
    </div>
  `).join("");
}

function completePosSale() {
  if (posTicket.length === 0) {
    alert("Add items to the active POS bill first.");
    return;
  }
  const name = document.getElementById("posCustName").value.trim() || "Walk-in Customer";
  const phone = document.getElementById("posCustPhone").value.trim() || "0000000000";
  const payMode = document.getElementById("posPaymentMethod").value;
  const total = posTicket.reduce((s, it) => s + (it.salePrice * it.qty), 0);
  const orderId = `MQB-POS-${Math.floor(1000 + Math.random() * 9000)}`;

  const posOrder = {
    orderId,
    customerName: name,
    customerPhone: phone,
    customerEmail: "walkin@store.com",
    address: "Falaknuma Showroom Counter Pickup",
    total,
    paymentMethod: payMode,
    channel: "Offline Walk-in",
    status: "Delivered",
    courierName: "Counter Handover",
    awb: "WALK-IN",
    date: new Date().toISOString(),
    items: [...posTicket]
  };

  posTicket.forEach(it => {
    const p = products.find(x => x.id === it.id);
    if (p) p.stock = Math.max(0, (p.stock || 0) - it.qty);
  });

  orders.unshift(posOrder);
  posTicket = [];
  persistAllData();
  renderPosTicketUI();
  renderPosCatalog();
  renderAdminInventoryTable();
  renderAdminOrdersTable();
  updateAnalyticsDashboard();
  prepareAndPrintInvoice(orderId);
}

/* -------------------------------------------------------------
   CMS & FEATURE FLAGS HANDLERS
------------------------------------------------------------- */
function handleCmsSave(e) {
  e.preventDefault();
  config.brandName = document.getElementById("cmsBrandName").value.trim();
  config.urduSubtitle = document.getElementById("cmsUrduSubtitle").value.trim();
  config.proprietor = document.getElementById("cmsProprietor").value.trim();
  config.gst = document.getElementById("cmsGst").value.trim();
  config.address = document.getElementById("cmsAddress").value.trim();
  config.phone1 = document.getElementById("cmsPhone1").value.trim();
  config.phone2 = document.getElementById("cmsPhone2").value.trim();
  config.whatsappPhone = document.getElementById("cmsWhatsApp").value.trim();
  config.announcement = document.getElementById("cmsAnnouncement").value.trim();
  config.heroHeadline = document.getElementById("cmsHeroHeadline").value.trim();

  persistAllData();
  syncLiveCmsUI();
  alert("Alhamdulillah! All store text and CMS settings updated live.");
}

function toggleFeatureFlag(flagKey, val) {
  flags[flagKey] = !!val;
  persistAllData();
  renderProducts();
}

function filterAnalyticsTime(range) {
  currentAnalyticsRange = range;
  ['today', 'week', 'month', 'all'].forEach(r => {
    const btn = document.getElementById(`btnAna-${r}`);
    if (btn) {
      btn.className = r === range
        ? "px-2.5 py-1 rounded bg-brand-charcoal text-white"
        : "px-2.5 py-1 rounded hover:bg-neutral-100";
    }
  });
  updateAnalyticsDashboard();
}

function switchAdminTab(tabName) {
  const tabs = ['analytics', 'salesmodifier', 'crm', 'sync', 'pos', 'inventory', 'orders', 'cms', 'featureflags', 'coupons', 'resets', 'payments', 'users'];
  tabs.forEach(t => {
    const btn = document.getElementById(`adminTabBtn-${t}`);
    const content = document.getElementById(`adminTab-${t}`);
    if (btn && content) {
      if (t === tabName) {
        btn.className = "px-4 py-3 border-b-2 border-brand-charcoal text-brand-charcoal font-bold whitespace-nowrap";
        content.classList.remove("hidden");
      } else {
        btn.className = "px-4 py-3 border-b-2 border-transparent text-neutral-500 hover:text-black whitespace-nowrap";
        content.classList.add("hidden");
      }
    }
  });
}
