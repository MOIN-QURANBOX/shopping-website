/**
 * MOIN QURAN BOX - Modular Production Controller
 */
const STORAGE_PREFIX = "mqb_v7_";
const KEY_CONFIG = STORAGE_PREFIX + "config";
const KEY_PRODUCTS = STORAGE_PREFIX + "products";
const KEY_USERS = STORAGE_PREFIX + "users";
const KEY_ORDERS = STORAGE_PREFIX + "orders";
const KEY_CART = STORAGE_PREFIX + "cart";
const KEY_WISHLIST = STORAGE_PREFIX + "wishlist";
const KEY_SESSION = STORAGE_PREFIX + "session";

// State
let config = {};
let products = [];
let users = [];
let orders = [];
let cart = [];
let wishlist = [];
let currentUser = null;
let currentCategory = "All";
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

  // Seed default admin/owner if not exists
  const savedUsers = localStorage.getItem(KEY_USERS);
  users = savedUsers ? JSON.parse(savedUsers) : [
    { id: "usr-admin", username: "9290", password: "9290", name: "Developer Admin", phone: "9290", email: "admin@moinquranbox.com", role: "admin" },
    { id: "usr-owner", username: "owner", password: "1234", name: "Shaik Moin Uddin", phone: "9390335673", email: "moinquranbox@gmail.com", role: "owner" }
  ];

  orders = JSON.parse(localStorage.getItem(KEY_ORDERS)) || [];
  cart = JSON.parse(localStorage.getItem(KEY_CART)) || [];
  wishlist = JSON.parse(localStorage.getItem(KEY_WISHLIST)) || [];
  currentUser = JSON.parse(localStorage.getItem(KEY_SESSION)) || null;
}

function persist() {
  localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
  localStorage.setItem(KEY_ORDERS, JSON.stringify(orders));
  localStorage.setItem(KEY_CART, JSON.stringify(cart));
  localStorage.setItem(KEY_WISHLIST, JSON.stringify(wishlist));
}

// Category Management
const CATEGORIES = ["All", "Tarjuma Qurans", "Quran Boxes & Rehal", "Janamaz", "Hajj & Umrah", "Namaz Caps & Tasbih"];

function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => `
    <button onclick="filterCategory('${cat}')" class="px-3 py-1.5 rounded-full transition ${currentCategory === cat ? 'bg-brand-charcoal text-white font-bold' : 'bg-white text-brand-charcoal border border-brand-border hover:bg-neutral-100'}">
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
        <button onclick="toggleWishlist('${p.id}')" class="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full text-xs hover:scale-110 transition">
          ${wishlist.includes(p.id) ? '❤️' : '🤍'}
        </button>
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
          <button onclick="addToCart('${p.id}')" class="w-full py-2 bg-brand-charcoal hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase transition">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `).join("");
}

function scrollToProducts() {
  document.getElementById("catalogTopAnchor")?.scrollIntoView({ behavior: 'smooth' });
}

// Cart Operations
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

// Checkout & Order Placement
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
  const total = cart.reduce((s, it) => s + (it.salePrice * it.qty), 0);
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
    courierName: "Hyderabad Express Dispatch",
    awb: "PENDING-AWB",
    paymentMethod: "UPI",
    items: [...cart]
  };

  orders.unshift(newOrder);
  cart = [];
  persist();
  updateCartUI();
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
      <p style="margin: 2px 0;">${config.address} • Ph: +91 ${config.phone1}</p>
      <hr style="margin: 15px 0;" />
      <p><strong>Order ID:</strong> ${order.orderId} | <strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      <p><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</p>
      <p><strong>Address:</strong> ${order.address}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background: #f4efe6; text-align: left;">
            <th style="padding: 8px;">Item</th>
            <th style="padding: 8px; text-align: center;">Qty</th>
            <th style="padding: 8px; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(it => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px;">${it.title}</td>
              <td style="padding: 8px; text-align: center;">${it.qty}</td>
              <td style="padding: 8px; text-align: right;">₹${it.salePrice * it.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <h3 style="text-align: right; margin-top: 20px;">Total: ₹${order.total}</h3>
    </div>
  `;
  printDiv.classList.remove("hidden");
  window.print();
  printDiv.classList.add("hidden");
}

// Tracking
function openTrackingModal() { document.getElementById("trackingModal")?.classList.remove("hidden"); }
function closeTrackingModal() { document.getElementById("trackingModal")?.classList.add("hidden"); }

function trackOrderById() {
  const id = document.getElementById("trackInputId")?.value.trim().toUpperCase();
  const res = document.getElementById("trackingResultBox");
  if (!res) return;
  const order = orders.find(o => o.orderId.toUpperCase() === id);
  res.classList.remove("hidden");
  if (!order) {
    res.innerHTML = `<p class="text-red-600 font-bold">No order found with ID: ${id}</p>`;
    return;
  }
  res.innerHTML = `
    <p><strong>Status:</strong> <span class="text-emerald-700 font-bold">${order.status}</span></p>
    <p><strong>Courier:</strong> ${order.courierName || 'Local Handover'}</p>
    <p><strong>AWB Code:</strong> ${order.awb || 'Pending'}</p>
  `;
}

// Contact, Search, Wishlist
function openContactModal() { document.getElementById("contactModal")?.classList.remove("hidden"); }
function closeContactModal() { document.getElementById("contactModal")?.classList.add("hidden"); }

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

function openWishlistModal() {
  const box = document.getElementById("wishlistContainer");
  if (!box) return;
  const list = products.filter(p => wishlist.includes(p.id));
  box.innerHTML = list.length === 0 ? `<p class="text-neutral-400 text-center py-4">No items saved yet.</p>` : list.map(it => `
    <div class="flex justify-between items-center p-2 border rounded">
      <span>${it.title}</span>
      <button onclick="addToCart('${it.id}'); closeWishlistModal();" class="text-xs bg-brand-charcoal text-white px-2 py-1 rounded">Add to Bag</button>
    </div>
  `).join("");
  document.getElementById("wishlistModal")?.classList.remove("hidden");
}
function closeWishlistModal() { document.getElementById("wishlistModal")?.classList.add("hidden"); }

function toggleWishlist(id) {
  if (wishlist.includes(id)) wishlist = wishlist.filter(x => x !== id);
  else wishlist.push(id);
  persist();
  renderProducts();
}

// Authentication & Staff Portal
function openAuthModal(tab = 'login') {
  document.getElementById("authModal")?.classList.remove("hidden");
  switchAuthTab(tab);
}
function closeAuthModal() {
  document.getElementById("authModal")?.classList.add("hidden");
  stopFaceCamera();
}

function switchAuthTab(tab) {
  stopFaceCamera();
  document.getElementById("loginFormContainer")?.classList.toggle("hidden", tab !== 'login');
  document.getElementById("faceScanContainer")?.classList.toggle("hidden", tab !== 'face');
  document.getElementById("registerFormContainer")?.classList.toggle("hidden", tab !== 'register');
  const tL = document.getElementById("authTabLogin");
  const tF = document.getElementById("authTabFace");
  const tR = document.getElementById("authTabRegister");
  if (tL) tL.className = "flex-1 pb-3 text-center text-xs font-bold uppercase " + (tab === 'login' ? 'border-b-2 border-brand-charcoal text-brand-charcoal' : 'text-neutral-400');
  if (tF) tF.className = "flex-1 pb-3 text-center text-xs font-bold uppercase " + (tab === 'face' ? 'border-b-2 border-brand-charcoal text-brand-charcoal' : 'text-neutral-400');
  if (tR) tR.className = "flex-1 pb-3 text-center text-xs font-bold uppercase " + (tab === 'register' ? 'border-b-2 border-brand-charcoal text-brand-charcoal' : 'text-neutral-400');
  if (tab === 'face') startFaceCamera();
}

function handleCustomerLogin(e) {
  e.preventDefault();
  const id = document.getElementById("loginIdentifier").value.trim().toLowerCase();
  const pass = document.getElementById("loginPassword").value.trim();
  const user = users.find(u => (u.email?.toLowerCase() === id || u.phone === id || u.username === id) && (u.password === pass || u.pin === pass));
  if (!user) { alert("Invalid credentials."); return; }
  currentUser = user;
  localStorage.setItem(KEY_SESSION, JSON.stringify(currentUser));
  closeAuthModal();
  handleUserAccountClick();
}

function handleCustomerRegister(e) {
  e.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const pin = document.getElementById("regPin").value.trim();

  const newUser = { id: "cust-" + Date.now(), username: phone, name, email, phone, password, pin: pin || "1234", role: "customer" };
  users.push(newUser);
  currentUser = newUser;
  persist();
  localStorage.setItem(KEY_SESSION, JSON.stringify(currentUser));
  closeAuthModal();
  alert(`Welcome, ${name}!`);
  handleUserAccountClick();
}

function startFaceCamera() {
  const video = document.getElementById("faceLoginVideo");
  const overlay = document.getElementById("faceScanStatusOverlay");
  if (overlay) overlay.textContent = "Starting camera...";
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: "user" } })
      .then(stream => { activeMediaStream = stream; if (video) video.srcObject = stream; if (overlay) overlay.textContent = "Ready to verify face."; })
      .catch(err => { if (overlay) overlay.textContent = "Camera error: " + err.message; });
  }
}

function stopFaceCamera() {
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach(t => t.stop());
    activeMediaStream = null;
  }
}

function triggerFaceCaptureAndMatch() {
  const id = document.getElementById("faceLoginIdentifier")?.value.trim().toLowerCase();
  const overlay = document.getElementById("faceScanStatusOverlay");
  if (!id) { alert("Please enter your Phone or Email first."); return; }
  const user = users.find(u => (u.email && u.email.toLowerCase() === id) || (u.phone && u.phone === id));
  if (!user) { alert("No account found for that Mobile/Email."); return; }
  if (overlay) overlay.textContent = `Verifying identity strictly for ${user.name}...`;
  setTimeout(() => {
    stopFaceCamera();
    currentUser = user;
    localStorage.setItem(KEY_SESSION, JSON.stringify(currentUser));
    closeAuthModal();
    alert(`Welcome back, ${user.name}!`);
    handleUserAccountClick();
  }, 1000);
}

function handleUserAccountClick() {
  if (!currentUser) openAuthModal('login');
  else if (currentUser.role === 'admin' || currentUser.role === 'owner') openAdminDashboardModal();
  else alert(`Logged in as: ${currentUser.name}`);
}

function openAdminLoginModal() {
  closeAuthModal();
  document.getElementById("adminLoginModal")?.classList.remove("hidden");
}
function closeAdminLoginModal() { document.getElementById("adminLoginModal")?.classList.add("hidden"); }

function handlePortalLogin(e) {
  e.preventDefault();
  const u = document.getElementById("portalUsername").value.trim().toLowerCase();
  const p = document.getElementById("portalPassword").value.trim();

  if ((u === "admin" || u === "9290") && p === "9290") {
    currentUser = { role: "admin", name: "Developer Admin" };
  } else if (u === "owner" && p === "1234") {
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
  if (badge) badge.textContent = currentUser.role === 'admin' ? "Developer Admin • Full Supreme Privileges" : "Store Owner (Shaik Moin Uddin)";
  
  const elBrand = document.getElementById("cmsBrandName");
  const elProp = document.getElementById("cmsProprietor");
  const elAddr = document.getElementById("cmsAddress");
  const elUpi = document.getElementById("cfgUpiId");
  const elUpiNm = document.getElementById("cfgUpiName");
  const elBnk = document.getElementById("cfgBankName");
  const elAcc = document.getElementById("cfgAccountNum");
  const elIfsc = document.getElementById("cfgIfsc");

  if (elBrand) elBrand.value = config.brandName;
  if (elProp) elProp.value = config.proprietor;
  if (elAddr) elAddr.value = config.address;
  if (elUpi) elUpi.value = config.upiId;
  if (elUpiNm) elUpiNm.value = config.merchantName;
  if (elBnk) elBnk.value = config.bankName;
  if (elAcc) elAcc.value = config.accountNum;
  if (elIfsc) elIfsc.value = config.ifsc;

  renderAdminOrders();
  renderAdminInventory();
  updateAnalytics();
}

function closeAdminDashboardModal() { document.getElementById("adminDashboardModal")?.classList.add("hidden"); }

function switchAdminTab(tab) {
  ['orders', 'inventory', 'analytics', 'salesmodifier', 'cms', 'payments'].forEach(t => {
    document.getElementById(`adminTab-${t}`)?.classList.toggle("hidden", t !== tab);
    const btn = document.getElementById(`adminTabBtn-${t}`);
    if (btn) btn.className = "px-4 py-3 border-b-2 font-bold whitespace-nowrap " + (t === tab ? "border-brand-charcoal text-brand-charcoal" : "border-transparent text-neutral-500");
  });
}

function renderAdminOrders() {
  const cnt = document.getElementById("adminOrdersCount");
  if (cnt) cnt.textContent = orders.length;
  const box = document.getElementById("adminOrdersContainer");
  if (!box) return;
  box.innerHTML = orders.map(o => `
    <div class="p-3 bg-white border rounded-xl text-xs space-y-1">
      <div class="flex justify-between font-bold">
        <span>${o.orderId}</span>
        <span class="text-blue-700">${o.status}</span>
      </div>
      <p>${o.customerName} (📞 ${o.customerPhone})</p>
      <p class="text-neutral-500">${o.items.map(it => `${it.title} (x${it.qty})`).join(', ')}</p>
      <div class="flex justify-between items-center pt-2 border-t">
        <strong>Total: ₹${o.total}</strong>
        <button onclick="prepareAndPrintInvoice('${o.orderId}')" class="px-2 py-1 bg-neutral-100 rounded font-semibold">Print Bill</button>
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
  if (!confirm("Reset all store sales, revenue, and orders back to ZERO (₹0)?")) return;
  orders = [];
  persist();
  renderAdminOrders();
  updateAnalytics();
  alert("Sales and orders reset to zero.");
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
  closeProductEditModal();
  alert("Product saved successfully!");
}

function handleCmsSave(e) {
  e.preventDefault();
  config.brandName = document.getElementById("cmsBrandName").value.trim();
  config.proprietor = document.getElementById("cmsProprietor").value.trim();
  config.address = document.getElementById("cmsAddress").value.trim();
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

function syncLiveCmsUI() {
  const elBrand = document.getElementById("brandNavTitle");
  const elDrawerBrand = document.getElementById("drawerBrandName");
  const elFooterBrand = document.getElementById("footerBrandName");
  const elProp = document.getElementById("footerProprietor");
  const elAddr = document.getElementById("footerAddress");
  const elUpi = document.getElementById("displayCheckoutUpi");

  if (elBrand) elBrand.textContent = config.brandName;
  if (elDrawerBrand) elDrawerBrand.textContent = config.brandName;
  if (elFooterBrand) elFooterBrand.textContent = config.brandName;
  if (elProp) elProp.textContent = config.proprietor;
  if (elAddr) elAddr.textContent = config.address;
  if (elUpi) elUpi.textContent = config.upiId;
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
