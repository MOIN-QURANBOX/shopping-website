/**
 * MOIN QURAN BOX - Modular Production Controller v7.5
 * Roles:
 *   Developer Admin: Username 'Admin' | Password '9290'
 *   Store Owner:     Username 'Owner' | Password '8341'
 */

const STORAGE_PREFIX = "mqb_v75_";
const KEY_CONFIG = STORAGE_PREFIX + "config";
const KEY_PRODUCTS = STORAGE_PREFIX + "products";
const KEY_USERS = STORAGE_PREFIX + "users";
const KEY_ORDERS = STORAGE_PREFIX + "orders";
const KEY_COUPONS = STORAGE_PREFIX + "coupons";
const KEY_CART = STORAGE_PREFIX + "cart";
const KEY_WISHLIST = STORAGE_PREFIX + "wishlist";
const KEY_SESSION = STORAGE_PREFIX + "session";

// State
let config = {};
let products = [];
let users = [];
let orders = [];
let coupons = [];
let cart = [];
let wishlist = [];
let currentUser = null;
let currentCategory = "All";
let posTicket = [];
let activeMediaStream = null;

// Initialize on DOM Ready
window.addEventListener("DOMContentLoaded", async () => {
  await loadInitialData();
  renderCategoryChips();
  renderProducts();
  updateCartUI();
  syncLiveCmsUI();
});

async function loadInitialData() {
  // Load Config
  const savedConfig = localStorage.getItem(KEY_CONFIG);
  if (savedConfig) {
    config = JSON.parse(savedConfig);
  } else {
    try {
      const res = await fetch("data/config.json");
      config = await res.json();
    } catch {
      config = {
        brandName: "MOIN QURAN BOX",
        proprietor: "Shaik Moin Uddin",
        address: "Madina Colony, Falaknuma, Hyderabad, Telangana 500053",
        phone1: "9390335673",
        phone2: "8142140905",
        whatsappPhone: "9390335673",
        upiId: "9390335673@ybl",
        merchantName: "MOIN QURAN BOX",
        bankName: "State Bank of India",
        accountNum: "392810482910",
        ifsc: "SBIN0020145",
        announcement: "Holy Quran Direct Manufacturer • Free Packaging Across Hyderabad • COD & Instant UPI Available"
      };
    }
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  }

  // Load Products
  const savedProducts = localStorage.getItem(KEY_PRODUCTS);
  if (savedProducts) {
    products = JSON.parse(savedProducts);
  } else {
    try {
      const res = await fetch("data/products.json");
      products = await res.json();
    } catch {
      products = [];
    }
    localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
  }

  // Strict Credentials: Admin (9290) & Owner (8341)
  const savedUsers = localStorage.getItem(KEY_USERS);
  if (savedUsers) {
    users = JSON.parse(savedUsers);
    // Ensure credentials match your exact specifications
    const adm = users.find(u => u.role === "admin");
    if (adm) { adm.username = "Admin"; adm.password = "9290"; }
    else users.push({ id: "usr-admin", username: "Admin", password: "9290", name: "Developer Admin", phone: "9290", email: "admin@moinquranbox.com", role: "admin" });

    const own = users.find(u => u.role === "owner");
    if (own) { own.username = "Owner"; own.password = "8341"; }
    else users.push({ id: "usr-owner", username: "Owner", password: "8341", name: "Shaik Moin Uddin", phone: "9390335673", email: "moinquranbox@gmail.com", role: "owner" });
  } else {
    users = [
      { id: "usr-admin", username: "Admin", password: "9290", name: "Developer Admin", phone: "9290", email: "admin@moinquranbox.com", role: "admin" },
      { id: "usr-owner", username: "Owner", password: "8341", name: "Shaik Moin Uddin", phone: "9390335673", email: "moinquranbox@gmail.com", role: "owner" }
    ];
  }

  orders = JSON.parse(localStorage.getItem(KEY_ORDERS)) || [];
  coupons = JSON.parse(localStorage.getItem(KEY_COUPONS)) || [
    { code: "RAMADAN50", discount: 50, type: "flat", minOrder: 500 },
    { code: "BARAKAH10", discount: 10, type: "percent", minOrder: 1000 }
  ];
  cart = JSON.parse(localStorage.getItem(KEY_CART)) || [];
  wishlist = JSON.parse(localStorage.getItem(KEY_WISHLIST)) || [];
  currentUser = JSON.parse(localStorage.getItem(KEY_SESSION)) || null;

  persist();
}

function persist() {
  localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
  localStorage.setItem(KEY_ORDERS, JSON.stringify(orders));
  localStorage.setItem(KEY_COUPONS, JSON.stringify(coupons));
  localStorage.setItem(KEY_CART, JSON.stringify(cart));
  localStorage.setItem(KEY_WISHLIST, JSON.stringify(wishlist));
}

// Category Navigation
const CATEGORIES = ["All", "Tarjuma Qurans", "Quran Boxes & Rehal", "Janamaz", "Hajj & Umrah", "Namaz Caps & Tasbih"];

function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => `
    <button onclick="filterCategory('${cat}')" class="px-3 py-1.5 rounded-full transition text-xs font-semibold whitespace-nowrap ${currentCategory === cat ? 'bg-brand-charcoal text-white shadow' : 'bg-white text-brand-charcoal border border-brand-border hover:bg-neutral-100'}">
      ${cat}
    </button>
  `).join("");
}

function filterCategory(cat) {
  currentCategory = cat;
  const heading = document.getElementById("currentCategoryHeading");
  if (heading) heading.textContent = cat === "All" ? "Our Bestsellers" : cat;
  renderCategoryChips();
  renderProducts();
}

// Product Grid Rendering
function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  const inStockOnly = document.getElementById("filterInStockOnly")?.checked;
  const sort = document.getElementById("filterSortOrder")?.value || "featured";

  let list = currentCategory === "All" ? [...products] : products.filter(p => p.category === currentCategory);
  if (inStockOnly) list = list.filter(p => p.stock > 0);

  if (sort === "low-to-high") list.sort((a, b) => a.salePrice - b.salePrice);
  else if (sort === "high-to-low") list.sort((a, b) => b.salePrice - a.salePrice);

  grid.innerHTML = list.map(p => `
    <div class="bg-white rounded-xl border border-brand-border overflow-hidden flex flex-col justify-between hover:shadow-md transition">
      <div class="relative bg-neutral-100 pt-[100%] overflow-hidden">
        <img src="${p.image}" alt="${p.title}" class="absolute inset-0 w-full h-full object-cover" />
        <button onclick="toggleWishlist('${p.id}')" class="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-xs hover:scale-110 transition shadow">
          ${wishlist.includes(p.id) ? '❤️' : '🤍'}
        </button>
        ${p.stock <= 5 && p.stock > 0 ? `<span class="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Only ${p.stock} left</span>` : ''}
        ${p.stock <= 0 ? `<span class="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Out of Stock</span>` : ''}
      </div>
      <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <span class="text-[10px] text-amber-700 font-bold block">${p.category}</span>
          <h4 class="font-serif font-bold text-xs sm:text-sm text-brand-charcoal line-clamp-2 leading-snug">${p.title}</h4>
        </div>
        <div>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-xs line-through text-neutral-400">₹${p.oldPrice || p.salePrice + 400}</span>
            <span class="text-sm sm:text-base font-bold text-brand-charcoal">₹${p.salePrice}</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="w-full py-1.5 bg-brand-charcoal hover:bg-neutral-800 text-white rounded text-[11px] font-bold uppercase transition disabled:opacity-40">
              Add to Cart
            </button>
            <a href="https://wa.me/91${config.whatsappPhone}?text=${encodeURIComponent(`Salam, I want to order: ${p.title} (Price: ₹${p.salePrice})`)}" target="_blank" class="w-full py-1.5 bg-brand-whatsapp text-white rounded text-[11px] font-bold uppercase text-center flex items-center justify-center shadow">
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

function scrollToProducts() {
  document.getElementById("catalogTopAnchor")?.scrollIntoView({ behavior: 'smooth' });
}

// Shopping Bag
function addToCart(prodId) {
  const p = products.find(x => x.id === prodId);
  if (!p) return;
  const exist = cart.find(x => x.id === prodId);
  if (exist) exist.qty += 1;
  else cart.push({ id: p.id, title: p.title, salePrice: p.salePrice, image: p.image, qty: 1 });
  persist();
  updateCartUI();
  toggleCart(true);
}

function updateCartQty(prodId, delta) {
  const it = cart.find(x => x.id === prodId);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) cart = cart.filter(x => x.id !== prodId);
  persist();
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((s, it) => s + it.qty, 0);
  const total = cart.reduce((s, it) => s + (it.salePrice * it.qty), 0);
  const badge = document.getElementById("cartCountBadge");
  const subtotal = document.getElementById("cartSubtotal");
  const rawSubtotal = document.getElementById("cartRawSubtotal");
  if (badge) badge.textContent = count;
  if (subtotal) subtotal.textContent = `₹${total.toFixed(2)}`;
  if (rawSubtotal) rawSubtotal.textContent = `₹${total.toFixed(2)}`;

  const box = document.getElementById("cartContainer");
  if (!box) return;
  if (cart.length === 0) {
    box.innerHTML = `<div class="py-12 text-center text-xs text-brand-muted">Your shopping bag is empty.</div>`;
    return;
  }
  box.innerHTML = cart.map(it => `
    <div class="flex items-center gap-3 py-3 border-b border-brand-border">
      <img src="${it.image}" class="w-12 h-12 object-cover rounded border" />
      <div class="flex-1">
        <h5 class="font-bold text-xs text-brand-charcoal line-clamp-1">${it.title}</h5>
        <span class="text-xs text-brand-muted">₹${it.salePrice}</span>
        <div class="flex items-center gap-2 mt-1">
          <button onclick="updateCartQty('${it.id}', -1)" class="w-5 h-5 bg-neutral-200 rounded font-bold text-xs">-</button>
          <span class="text-xs font-semibold">${it.qty}</span>
          <button onclick="updateCartQty('${it.id}', 1)" class="w-5 h-5 bg-neutral-200 rounded font-bold text-xs">+</button>
        </div>
      </div>
      <span class="font-bold text-xs font-mono">₹${it.salePrice * it.qty}</span>
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

function toggleDrawer(show) {
  const drawer = document.getElementById("drawerMenu");
  const backdrop = document.getElementById("drawerBackdrop");
  if (!drawer || !backdrop) return;
  if (show) {
    drawer.classList.remove("pointer-events-none", "-translate-x-full");
    backdrop.classList.add("opacity-100");
  } else {
    drawer.classList.add("-translate-x-full");
    backdrop.classList.remove("opacity-100");
    setTimeout(() => drawer.classList.add("pointer-events-none"), 300);
  }
}

function navigateDrawer(cat) {
  filterCategory(cat);
  toggleDrawer(false);
  scrollToProducts();
}

// Checkout & Orders
function startCheckout() {
  if (cart.length === 0) { alert("Your cart is empty!"); return; }
  toggleCart(false);
  const total = cart.reduce((s, it) => s + (it.salePrice * it.qty), 0);
  const payable = document.getElementById("checkoutTotalAmount");
  if (payable) payable.textContent = `₹${total.toFixed(2)}`;
  document.getElementById("checkoutModal")?.classList.remove("hidden");
}

function closeCheckoutModal() { document.getElementById("checkoutModal")?.classList.add("hidden"); }

function handlePlaceOrder(e) {
  e.preventDefault();
  const name = document.getElementById("chkName").value.trim();
  const phone = document.getElementById("chkPhone").value.trim();
  const email = document.getElementById("chkEmail").value.trim();
  const address = document.getElementById("chkAddress").value.trim();
  const couponCode = document.getElementById("chkCouponInput")?.value.trim().toUpperCase();
  
  let total = cart.reduce((s, it) => s + (it.salePrice * it.qty), 0);

  // Apply discount if entered
  if (couponCode) {
    const cp = coupons.find(c => c.code === couponCode);
    if (cp && total >= (cp.minOrder || 0)) {
      const disc = cp.type === "percent" ? Math.round((total * cp.discount) / 100) : cp.discount;
      total = Math.max(0, total - disc);
    }
  }

  const orderId = `MQB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = {
    orderId,
    customerName: name,
    customerPhone: phone,
    customerEmail: email,
    address,
    total,
    date: new Date().toISOString(),
    status: "Processing",
    channel: "Online",
    courierName: "Hyderabad Express Dispatch",
    awb: "PENDING-AWB",
    paymentMethod: "UPI",
    items: [...cart]
  };

  // Deduct stock
  cart.forEach(item => {
    const p = products.find(x => x.id === item.id);
    if (p) p.stock = Math.max(0, p.stock - item.qty);
  });

  orders.unshift(newOrder);
  cart = [];
  persist();
  updateCartUI();
  renderProducts();
  closeCheckoutModal();

  const successId = document.getElementById("successOrderIdDisplay");
  if (successId) successId.textContent = orderId;

  const waMsg = encodeURIComponent(
    `*NEW ORDER NOTIFICATION — MOIN QURAN BOX*\n\n` +
    `*Order ID:* ${orderId}\n` +
    `*Customer:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Address:* ${address}\n` +
    `*Total:* ₹${total}\n\n` +
    `*Items:*\n` + newOrder.items.map(it => `• ${it.title} (x${it.qty})`).join('\n')
  );
  const waBtn = document.getElementById("successWhatsAppOrderBtn");
  if (waBtn) waBtn.href = `https://wa.me/91${config.whatsappPhone}?text=${waMsg}`;

  document.getElementById("orderSuccessModal")?.classList.remove("hidden");
}

function closeSuccessModal() { document.getElementById("orderSuccessModal")?.classList.add("hidden"); }

// Invoice Printing & Lookup
function openInvoiceLookupModal() { document.getElementById("invoiceLookupModal")?.classList.remove("hidden"); }
function closeInvoiceLookupModal() { document.getElementById("invoiceLookupModal")?.classList.add("hidden"); }

function handlePublicInvoiceLookup(e) {
  e.preventDefault();
  const id = document.getElementById("lookupOrderId").value.trim().toUpperCase();
  const phone = document.getElementById("lookupPhone").value.replace(/\D/g, "");
  const err = document.getElementById("lookupError");

  const match = orders.find(o => o.orderId.toUpperCase() === id && o.customerPhone.replace(/\D/g, "").includes(phone));
  if (!match) {
    if (err) {
      err.textContent = "No invoice matched this Order ID and phone number.";
      err.classList.remove("hidden");
    }
    return;
  }
  if (err) err.classList.add("hidden");
  closeInvoiceLookupModal();
  prepareAndPrintInvoice(match.orderId);
}

function prepareAndPrintInvoice(orderId) {
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;
  const printDiv = document.getElementById("invoicePrintSection");
  if (!printDiv) return;

  printDiv.innerHTML = `
    <div style="font-family: system-ui, sans-serif; padding: 25px; border: 1px solid #ddd; max-width: 800px; margin: auto;">
      <h2 style="margin: 0; color: #1c3026;">${config.brandName}</h2>
      <p style="margin: 2px 0; font-size: 13px;">${config.address} • Ph: +91 ${config.phone1} / ${config.phone2}</p>
      <p style="margin: 2px 0; font-size: 12px; color: #555;">Proprietor: ${config.proprietor} • GST: ${config.gst}</p>
      <hr style="margin: 15px 0;" />
      <p><strong>Order ID:</strong> ${order.orderId} | <strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      <p><strong>Channel:</strong> ${order.channel || 'Online'} | <strong>Status:</strong> ${order.status}</p>
      <p><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</p>
      <p><strong>Address:</strong> ${order.address}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
        <thead>
          <tr style="background: #f4efe6; text-align: left;">
            <th style="padding: 8px;">Item Description</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: right;">Price</th>
            <th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(it => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px;">${it.title}</td>
              <td style="padding: 8px; text-align: center;">${it.qty}</td>
              <td style="padding: 8px; text-align: right;">₹${it.salePrice}</td>
              <td style="padding: 8px; text-align: right;">₹${it.salePrice * it.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <h3 style="text-align: right; margin-top: 20px; color: #1c3026;">Grand Total: ₹${order.total}</h3>
      <p style="text-align: center; margin-top: 30px; font-size: 11px; color: #777;">Thank you for ordering with Moin Quran Box, Hyderabad.</p>
    </div>
  `;
  printDiv.classList.remove("hidden");
  window.print();
  printDiv.classList.add("hidden");
}

// Courier Tracking
function openTrackingModal() { document.getElementById("trackingModal")?.classList.remove("hidden"); }
function closeTrackingModal() { document.getElementById("trackingModal")?.classList.add("hidden"); }

function trackOrderById() {
  const id = document.getElementById("trackInputId")?.value.trim().toUpperCase();
  const res = document.getElementById("trackingResultBox");
  if (!res) return;
  const order = orders.find(o => o.orderId.toUpperCase() === id);
  res.classList.remove("hidden");
  if (!order) {
    res.innerHTML = `<p class="text-red-600 font-bold">No shipment found with Order ID: ${id}</p>`;
    return;
  }
  res.innerHTML = `
    <p><strong>Status:</strong> <span class="text-emerald-700 font-bold">${order.status}</span></p>
    <p><strong>Courier:</strong> ${order.courierName || 'Local Dispatch'}</p>
    <p><strong>Tracking AWB:</strong> ${order.awb || 'Processing'}</p>
  `;
}

// In-Store POS System (Online & Offline)
function renderPosCatalog() {
  const grid = document.getElementById("posCatalogGrid");
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <div class="p-2 border rounded bg-white flex flex-col justify-between text-xs">
      <div>
        <strong class="line-clamp-1">${p.title}</strong>
        <span class="text-neutral-500 block">Stock: ${p.stock} • ₹${p.salePrice}</span>
      </div>
      <button onclick="addPosTicketItem('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="mt-2 py-1 bg-brand-charcoal text-white rounded font-bold text-[10px] uppercase">
        + Add Bill
      </button>
    </div>
  `).join("");
}

function addPosTicketItem(prodId) {
  const p = products.find(x => x.id === prodId);
  if (!p) return;
  const exist = posTicket.find(x => x.id === prodId);
  if (exist) exist.qty += 1;
  else posTicket.push({ id: p.id, title: p.title, salePrice: p.salePrice, qty: 1 });
  renderPosTicket();
}

function renderPosTicket() {
  const box = document.getElementById("posTicketItems");
  const totalEl = document.getElementById("posTicketTotal");
  if (!box || !totalEl) return;

  const total = posTicket.reduce((s, it) => s + (it.salePrice * it.qty), 0);
  totalEl.textContent = `₹${total}`;

  box.innerHTML = posTicket.map(it => `
    <div class="flex justify-between items-center py-1">
      <span class="truncate max-w-[150px]">${it.title} (x${it.qty})</span>
      <span class="font-bold">₹${it.salePrice * it.qty}</span>
    </div>
  `).join("");
}

function completePosSale() {
  if (posTicket.length === 0) { alert("Ticket is empty."); return; }
  const custName = document.getElementById("posCustName")?.value.trim() || "Walk-in Customer";
  const custPhone = document.getElementById("posCustPhone")?.value.trim() || "Showroom Walk-in";
  const paymentMethod = document.getElementById("posPaymentMethod")?.value || "Cash";
  const total = posTicket.reduce((s, it) => s + (it.salePrice * it.qty), 0);
  const orderId = `POS-${Math.floor(1000 + Math.random() * 9000)}`;

  const orderData = {
    orderId,
    customerName: custName,
    customerPhone: custPhone,
    address: "Showroom Walk-in Purchase (Falaknuma)",
    total,
    date: new Date().toISOString(),
    status: "Delivered",
    channel: "Offline Walk-in",
    paymentMethod,
    items: [...posTicket]
  };

  // Deduct stock
  posTicket.forEach(item => {
    const p = products.find(x => x.id === item.id);
    if (p) p.stock = Math.max(0, p.stock - item.qty);
  });

  orders.unshift(orderData);
  posTicket = [];
  persist();
  renderPosTicket();
  renderPosCatalog();
  renderProducts();
  renderAdminOrders();
  updateAnalytics();
  alert("Walk-in POS Sale completed!");
  prepareAndPrintInvoice(orderId);
}

// Staff Portal Login & Roles
function openAdminLoginModal() { document.getElementById("adminLoginModal")?.classList.remove("hidden"); }
function closeAdminLoginModal() { document.getElementById("adminLoginModal")?.classList.add("hidden"); }

function handlePortalLogin(e) {
  e.preventDefault();
  const u = document.getElementById("portalUsername").value.trim();
  const p = document.getElementById("portalPassword").value.trim();

  // Strict credentials check
  if (u.toLowerCase() === "admin" && p === "9290") {
    currentUser = { role: "admin", name: "Developer Admin" };
  } else if (u.toLowerCase() === "owner" && p === "8341") {
    currentUser = { role: "owner", name: "Shaik Moin Uddin" };
  } else {
    alert("Access Denied: Invalid credentials.");
    return;
  }

  localStorage.setItem(KEY_SESSION, JSON.stringify(currentUser));
  closeAdminLoginModal();
  openAdminDashboardModal();
}

function openAdminDashboardModal() {
  const modal = document.getElementById("adminDashboardModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const badge = document.getElementById("portalRoleBadge");
  if (badge) {
    badge.textContent = currentUser.role === "admin" 
      ? "Developer Admin • Full Supreme Privileges" 
      : "Store Owner (Shaik Moin Uddin) • Operations";
  }

  // Hide developer tabs if Owner
  const isOwner = currentUser.role === "owner";
  document.getElementById("adminTabBtn-salesmodifier")?.classList.toggle("hidden", isOwner);
  document.getElementById("adminTabBtn-cms")?.classList.toggle("hidden", isOwner);
  document.getElementById("adminTabBtn-customers")?.classList.toggle("hidden", isOwner);

  renderAdminOrders();
  renderAdminInventory();
  renderPosCatalog();
  renderCouponsTable();
  updateAnalytics();
}

function closeAdminDashboardModal() { document.getElementById("adminDashboardModal")?.classList.add("hidden"); }

function switchAdminTab(tab) {
  const tabs = ['orders', 'inventory', 'pos', 'analytics', 'salesmodifier', 'cms', 'payments', 'coupons', 'customers'];
  tabs.forEach(t => {
    document.getElementById(`adminTab-${t}`)?.classList.toggle("hidden", t !== tab);
    const btn = document.getElementById(`adminTabBtn-${t}`);
    if (btn) btn.className = "px-4 py-3 border-b-2 font-bold whitespace-nowrap " + (t === tab ? "border-brand-charcoal text-brand-charcoal" : "border-transparent text-neutral-500 hover:text-black");
  });
}

function renderAdminOrders() {
  const cnt = document.getElementById("adminOrdersCount");
  if (cnt) cnt.textContent = orders.length;
  const box = document.getElementById("adminOrdersContainer");
  if (!box) return;
  box.innerHTML = orders.map(o => `
    <div class="p-3 bg-white border rounded-xl text-xs space-y-1 shadow-sm">
      <div class="flex justify-between font-bold">
        <span>${o.orderId} <span class="text-[10px] ml-2 px-1.5 py-0.5 rounded font-bold ${o.channel === 'Offline Walk-in' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">${o.channel || 'Online'}</span></span>
        <span class="text-blue-700">${o.status}</span>
      </div>
      <p>${o.customerName} (📞 ${o.customerPhone})</p>
      <p class="text-neutral-500">${o.items.map(it => `${it.title} (x${it.qty})`).join(', ')}</p>
      <div class="flex justify-between items-center pt-2 border-t">
        <strong>Total: ₹${o.total}</strong>
        <div class="flex gap-2">
          <button onclick="prepareAndPrintInvoice('${o.orderId}')" class="px-2 py-1 bg-neutral-100 rounded font-semibold">Print Bill</button>
          <a href="https://wa.me/91${o.customerPhone}?text=${encodeURIComponent(`Salam ${o.customerName}, update for your order ${o.orderId}: Current Status is ${o.status}.`)}" target="_blank" class="px-2 py-1 bg-green-50 text-green-700 rounded font-semibold">WhatsApp</a>
        </div>
      </div>
    </div>
  `).join('');
}

function renderAdminInventory() {
  const tbody = document.getElementById("adminInventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = products.map(p => `
    <tr class="hover:bg-neutral-50">
      <td class="p-3 font-bold">${p.title}</td>
      <td class="p-3 text-neutral-600">${p.category}</td>
      <td class="p-3 font-bold">${p.stock}</td>
      <td class="p-3 font-mono">₹${p.salePrice}</td>
      <td class="p-3 text-right">
        <button onclick="openProductEditModal('${p.id}')" class="text-blue-600 font-bold hover:underline">Edit</button>
      </td>
    </tr>
  `).join('');
}

function updateAnalytics() {
  const totalRev = orders.reduce((s, o) => s + (o.total || 0), 0);
  const elRev = document.getElementById("anaTotalRevenue");
  const elOrd = document.getElementById("anaTotalOrders");
  if (elRev) elRev.textContent = `₹${totalRev}`;
  if (elOrd) elOrd.textContent = orders.length;
}

function resetAllSalesToZero() {
  if (currentUser?.role !== "admin") { alert("Supreme Admin access required."); return; }
  if (!confirm("Reset all store sales, revenue, and order logs to ZERO (₹0)?")) return;
  orders = [];
  persist();
  renderAdminOrders();
  updateAnalytics();
  alert("All sales data reset to zero.");
}

function openProductEditModal(id = null) {
  document.getElementById("productEditModal")?.classList.remove("hidden");
  const elId = document.getElementById("editProductId");
  const elTitle = document.getElementById("editProductTitle");
  const elCat = document.getElementById("editProductCategory");
  const elStock = document.getElementById("editProductStock");
  const elPrice = document.getElementById("editProductSalePrice");
  const elImg = document.getElementById("editProductImage");

  if (id) {
    const p = products.find(x => x.id === id);
    if (elId) elId.value = p.id;
    if (elTitle) elTitle.value = p.title;
    if (elCat) elCat.value = p.category;
    if (elStock) elStock.value = p.stock;
    if (elPrice) elPrice.value = p.salePrice;
    if (elImg) elImg.value = p.image;
  } else {
    if (elId) elId.value = "";
    if (elTitle) elTitle.value = "";
    if (elStock) elStock.value = "25";
    if (elPrice) elPrice.value = "";
    if (elImg) elImg.value = "";
  }
}

function closeProductEditModal() { document.getElementById("productEditModal")?.classList.add("hidden"); }

function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("editProductId").value;
  const title = document.getElementById("editProductTitle").value.trim();
  const category = document.getElementById("editProductCategory").value;
  const stock = parseInt(document.getElementById("editProductStock").value) || 0;
  const salePrice = parseInt(document.getElementById("editProductSalePrice").value) || 0;
  const image = document.getElementById("editProductImage").value.trim() || "https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=600&q=80";

  if (id) {
    const p = products.find(x => x.id === id);
    if (p) {
      p.title = title;
      p.category = category;
      p.stock = stock;
      p.salePrice = salePrice;
      p.image = image;
    }
  } else {
    products.unshift({
      id: "prod-" + Date.now(),
      title, category, stock, salePrice, image,
      rating: 5.0, reviewsCount: 10
    });
  }
  persist();
  renderProducts();
  renderAdminInventory();
  renderPosCatalog();
  closeProductEditModal();
  alert("Product saved successfully!");
}

function handleCmsSave(e) {
  e.preventDefault();
  if (currentUser?.role !== "admin") { alert("Only Admin can edit master details."); return; }
  config.brandName = document.getElementById("cmsBrandName").value.trim();
  config.proprietor = document.getElementById("cmsProprietor").value.trim();
  config.address = document.getElementById("cmsAddress").value.trim();
  config.phone1 = document.getElementById("cmsPhone1")?.value.trim() || config.phone1;
  config.phone2 = document.getElementById("cmsPhone2")?.value.trim() || config.phone2;
  config.announcement = document.getElementById("cmsAnnouncement")?.value.trim() || config.announcement;

  persist();
  syncLiveCmsUI();
  alert("Store details updated live!");
}

function savePaymentSettings(e) {
  e.preventDefault();
  config.upiId = document.getElementById("cfgUpiId").value.trim();
  config.merchantName = document.getElementById("cfgUpiName").value.trim();
  config.bankName = document.getElementById("cfgBankName").value.trim();
  config.accountNum = document.getElementById("cfgAccountNum").value.trim();
  config.ifsc = document.getElementById("cfgIfsc").value.trim().toUpperCase();
  persist();
  syncLiveCmsUI();
  alert("Payment details updated!");
}

function renderCouponsTable() {
  const tbody = document.getElementById("adminCouponsTableBody");
  if (!tbody) return;
  tbody.innerHTML = coupons.map((c, i) => `
    <tr class="hover:bg-neutral-50">
      <td class="p-3 font-bold font-mono text-brand-gold">${c.code}</td>
      <td class="p-3 font-semibold">${c.type === 'percent' ? `${c.discount}% OFF` : `₹${c.discount} FLAT OFF`}</td>
      <td class="p-3">₹${c.minOrder}</td>
      <td class="p-3 text-right">
        <button onclick="deleteCoupon(${i})" class="text-red-600 font-bold">Delete</button>
      </td>
    </tr>
  `).join("");
}

function promptCreateCoupon() {
  const code = prompt("Enter Promo Code (e.g. FESTIVE10):");
  if (!code) return;
  const discount = parseInt(prompt("Discount value (e.g. 50 or 10):", "50")) || 50;
  const type = prompt("Type: 'flat' or 'percent':", "flat") || "flat";
  const minOrder = parseInt(prompt("Minimum Order Amount (₹):", "500")) || 500;

  coupons.push({ code: code.trim().toUpperCase(), discount, type, minOrder });
  persist();
  renderCouponsTable();
  alert(`Coupon ${code.toUpperCase()} added!`);
}

function deleteCoupon(i) {
  coupons.splice(i, 1);
  persist();
  renderCouponsTable();
}

function syncLiveCmsUI() {
  const elBrand = document.getElementById("brandNavTitle");
  const elDrawerBrand = document.getElementById("drawerBrandName");
  const elFooterBrand = document.getElementById("footerBrandName");
  const elProp = document.getElementById("footerProprietor");
  const elAddr = document.getElementById("footerAddress");
  const elTicker = document.getElementById("announcementText");

  if (elBrand) elBrand.textContent = config.brandName;
  if (elDrawerBrand) elDrawerBrand.textContent = config.brandName;
  if (elFooterBrand) elFooterBrand.textContent = config.brandName;
  if (elProp) elProp.textContent = config.proprietor;
  if (elAddr) elAddr.textContent = config.address;
  if (elTicker) elTicker.textContent = config.announcement;
}

function logoutCurrentUser() {
  currentUser = null;
  localStorage.removeItem(KEY_SESSION);
  closeAdminDashboardModal();
  alert("Logged out successfully.");
}

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
}

function toggleWishlist(id) {
  if (wishlist.includes(id)) wishlist = wishlist.filter(x => x !== id);
  else wishlist.push(id);
  persist();
  renderProducts();
}

function openSearchModal() {
  document.getElementById("searchModal")?.classList.remove("hidden");
  document.getElementById("searchInput")?.focus();
}
function closeSearchModal() { document.getElementById("searchModal")?.classList.add("hidden"); }

function liveSearch(q) {
  const box = document.getElementById("searchResults");
  if (!box) return;
  const query = q.trim().toLowerCase();
  if (!query) { box.innerHTML = ""; return; }
  const matched = products.filter(p => p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
  box.innerHTML = matched.map(m => `
    <div onclick="selectSearchResult('${m.id}')" class="p-2 flex justify-between items-center cursor-pointer hover:bg-brand-sand rounded">
      <span>${m.title}</span>
      <span class="font-bold">₹${m.salePrice}</span>
    </div>
  `).join("");
}

function selectSearchResult(id) {
  closeSearchModal();
  renderProducts();
  scrollToProducts();
}

function openContactModal() { document.getElementById("contactModal")?.classList.remove("hidden"); }
function closeContactModal() { document.getElementById("contactModal")?.classList.add("hidden"); }

function handleUserAccountClick() {
  if (!currentUser) openAdminLoginModal();
  else openAdminDashboardModal();
}
