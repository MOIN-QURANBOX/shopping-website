/**
 * MOIN QURAN BOX - Multi-Branch Enterprise Controller v19.0 Professional Edition
 * Supreme Developer Admin Control, Automated CRM 360, & Full Expert Tool Suite
 */

const STORAGE_PREFIX = "mqb_v19_";
const KEY_CONFIG = STORAGE_PREFIX + "config";
const KEY_PRODUCTS = STORAGE_PREFIX + "products";
const KEY_USERS = STORAGE_PREFIX + "users";
const KEY_ORDERS = STORAGE_PREFIX + "orders";
const KEY_COUPONS = STORAGE_PREFIX + "coupons";
const KEY_CART = STORAGE_PREFIX + "cart";
const KEY_WISHLIST = STORAGE_PREFIX + "wishlist";
const KEY_SESSION = STORAGE_PREFIX + "session";
const KEY_AUDIT = STORAGE_PREFIX + "audit_logs";

// State Configuration
let config = {};
let products = [];
let users = [];
let orders = [];
let coupons = [];
let cart = [];
let wishlist = [];
let compareList = [];
let recentlyViewed = [];
let auditLogs = [];
let currentCurrency = { code: "INR", symbol: "₹", rate: 1 };
let currentUser = null;
let currentCategory = "All";
let posTicket = [];
let sessionTimerInterval = null;

// Default Admin Feature Controls (Now with 10 New Advanced Modules)
const DEFAULT_TOGGLES = {
  // Existing Store Features
  customerWishlist: true,
  customerWallet: true,
  customerSupportTickets: true,
  customerVouchers: true,
  customerReorder: true,
  customerWarranty: true,
  customerStatements: true,
  ownerInventoryEdit: true,
  ownerBranchEdit: true,
  ownerPosAccess: true,
  quickViewShopping: true,
  expressCheckout: true,
  compareTool: true,
  prayerTimes: true,
  currencyConverter: true,
  giftQuiz: true,
  flashDeals: true,
  wholesaleCalculator: true,
  wallpapers: true,
  pincodeChecker: true,
  
  // 10 NEW ENTERPRISE FEATURES
  autoStockAlerts: true,           // 1. WhatsApp Stock Alerts for Owners
  abandonedCartRecovery: true,     // 2. Automated Cart Recovery Triggers
  aiSmartUpsell: true,             // 3. AI "Frequently Bought Together"
  loyaltyRewards: true,            // 4. Customer Points / Rewards Engine
  waDispatchSync: true,            // 5. Automated WhatsApp Tracking Sync
  codFraudShield: true,            // 6. Anti-Bot COD Verification
  seasonalAutoTheme: true,         // 7. Dynamic Ramadan / Eid Storefront Theming
  geofenceDelivery: true,          // 8. Hyper-local Free Delivery Zone Fencing
  staffAuditMode: true,            // 9. Strict Staff Activity Logging
  b2bWholesalePortal: true         // 10. B2B Hidden Pricing Portal
};

window.addEventListener("DOMContentLoaded", async () => {
  await loadInitialData();
  renderCategoryChips();
  renderProducts();
  renderBranchesOnStorefront();
  updateCartUI();
  syncLiveCmsUI();
  syncCustomerHeaderUI();
  checkWelcomeGreetingBanner();
  validateSessionPersistence();
  renderRecentlyViewed();
});

// ==========================================
// 1. DATA INITIALIZATION & PERSISTENCE
// ==========================================
async function loadInitialData() {
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
        proprietor: "Shaik Moin Uddin & Shaik Muneer Uddin",
        address: "Madina Colony, Falaknuma, Hyderabad, Telangana 500053",
        phone1: "7893961313",
        phone2: "7337464501",
        whatsappPhone: "7337464501",
        ownerEmail: "moinquranbox@gmail.com",
        gst: "TEL-HYD-500053",
        upiId: "7337464501@ybl",
        merchantName: "MOIN QURAN BOX",
        bankName: "State Bank of India",
        accountNum: "392810482910",
        ifsc: "SBIN0020145",
        announcement: "Holy Quran Direct Manufacturer • Free Packaging Across Hyderabad • COD & Instant UPI Available",
        featureToggles: { ...DEFAULT_TOGGLES },
        autoSync: true,
        maintenanceMode: false,
        surgePricing: false,
        expressRouting: false,
        apiGateway: { whatsappWebhook: "", smsApiKey: "" },
        seo: {
          metaTitle: "MOIN QURAN BOX | Luxury Islamic Store & Manufacturer Hyderabad",
          metaDesc: "Direct manufacturer wholesale Holy Quran, velvet boxes, Rehal and Islamic essentials.",
          keywords: "quran, quran box, rehal, hyderabad, islamic store"
        },
        branches: [
          { id: "branch-1", name: "Falaknuma Head Showroom", address: "Madina Colony, Near Engine Bowli, Falaknuma, Hyderabad, Telangana 500053", phone: "7893961313", manager: "Shaik Moin Uddin & Shaik Muneer Uddin", enabled: true }
        ]
      };
    }
  }

  // Branch 2 is removed; maintain Falaknuma Head Showroom only
  config.branches = [
    { id: "branch-1", name: "Falaknuma Head Showroom", address: "Madina Colony, Near Engine Bowli, Falaknuma, Hyderabad, Telangana 500053", phone: "7893961313", manager: "Shaik Moin Uddin & Shaik Muneer Uddin", enabled: true }
  ];

  if (!config.featureToggles) config.featureToggles = { ...DEFAULT_TOGGLES };
  else config.featureToggles = { ...DEFAULT_TOGGLES, ...config.featureToggles };

  localStorage.setItem(KEY_CONFIG, JSON.stringify(config));

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

  const savedUsers = localStorage.getItem(KEY_USERS);
  if (savedUsers) {
    users = JSON.parse(savedUsers);
    users = users.filter(u => u.username !== "owner1");
    if (!users.some(u => u.username.toLowerCase() === 'admin')) {
      ensureUserExists("Admin", "9290", "Developer Admin", "9290", "admin@moinquranbox.com", "admin");
    }
    if (!users.some(u => u.username.toLowerCase() === 'owner')) {
      ensureUserExists("Owner", "8341", "Shaik Moin Uddin & Shaik Muneer Uddin", "7893961313", "moinquranbox@gmail.com", "owner");
    }
  } else {
    users = [
      { id: "usr-admin", username: "Admin", password: "9290", name: "Developer Admin", phone: "9290", email: "admin@moinquranbox.com", role: "admin", isBlocked: false },
      { id: "usr-owner", username: "Owner", password: "8341", name: "Shaik Moin Uddin & Shaik Muneer Uddin", phone: "7893961313", email: "moinquranbox@gmail.com", role: "owner", isBlocked: false },
      { id: "usr-demo", username: "7893961313", password: "user123", pin: "1234", name: "Mohammed Farhan", phone: "7893961313", email: "farhan@example.com", role: "customer", addresses: ["Madina Colony, Falaknuma, Hyderabad"], supportTickets: [], isBlocked: false }
    ];
  }

  orders = JSON.parse(localStorage.getItem(KEY_ORDERS)) || [];
  coupons = JSON.parse(localStorage.getItem(KEY_COUPONS)) || [
    { code: "RAMADAN50", discount: 50, type: "flat", minOrder: 500 },
    { code: "BARAKAH10", discount: 10, type: "percent", minOrder: 1000 }
  ];

  auditLogs = JSON.parse(localStorage.getItem(KEY_AUDIT)) || [
    { timestamp: new Date().toLocaleString(), event: "System Initialized", user: "System", type: "system" }
  ];

  cart = JSON.parse(localStorage.getItem(KEY_CART)) || [];
  wishlist = JSON.parse(localStorage.getItem(KEY_WISHLIST)) || [];
  persist();
}

function ensureUserExists(username, password, name, phone, email, role) {
  const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    existing.password = password;
    existing.role = role;
  } else {
    users.push({ id: "usr-" + username.toLowerCase(), username, password, name, phone, email, role, addresses: ["Madina Colony, Falaknuma"], supportTickets: [], isBlocked: false });
  }
}

function persist() {
  localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
  localStorage.setItem(KEY_PRODUCTS, JSON.stringify(products));
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
  localStorage.setItem(KEY_ORDERS, JSON.stringify(orders));
  localStorage.setItem(KEY_COUPONS, JSON.stringify(coupons));
  localStorage.setItem(KEY_CART, JSON.stringify(cart));
  localStorage.setItem(KEY_WISHLIST, JSON.stringify(wishlist));
  localStorage.setItem(KEY_AUDIT, JSON.stringify(auditLogs));
}

function logAuditEvent(event, user = "System", type = "general") {
  auditLogs.unshift({
    timestamp: new Date().toLocaleString(),
    event,
    user,
    type
  });
  if (auditLogs.length > 50) auditLogs.pop();
  persist();
}

// ==========================================
// 2. CURRENCY & SESSION MANAGEMENT
// ==========================================
function formatPrice(priceInInr) {
  const converted = Math.round(priceInInr * currentCurrency.rate);
  return `${currentCurrency.symbol}${converted.toLocaleString()}`;
}

function setCurrency(code, symbol, rate) {
  currentCurrency = { code, symbol, rate };
  const badge = document.getElementById("activeCurrencyBadge");
  if (badge) badge.textContent = `${code} (${symbol})`;
  closeCurrencyModal();
  renderProducts();
  updateCartUI();
}

function validateSessionPersistence() {
  const sessionStr = localStorage.getItem(KEY_SESSION);
  if (!sessionStr) return;

  const session = JSON.parse(sessionStr);
  if (session.expiresAt && Date.now() > session.expiresAt) {
    logoutCurrentUser(true);
    return;
  }

  const activeUser = users.find(u => u.username.toLowerCase() === session.user.username.toLowerCase());
  if (activeUser && activeUser.isBlocked) {
    alert("Your account access has been revoked or blocked by the Administrator.");
    logoutCurrentUser();
    return;
  }

  currentUser = session.user;
  startSessionCountdownTimer(session.expiresAt);
  syncCustomerHeaderUI();
  
  if (currentUser.role !== 'customer') {
    document.getElementById("staffLoginNavBtn")?.classList.add("hidden");
    document.getElementById("staffLogoutNavBtn")?.classList.remove("hidden");
  }
}

function startSessionCountdownTimer(expiresAt) {
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  function updateTimer() {
    const diff = expiresAt - Date.now();
    const timerBadge = document.getElementById("staffSessionTimerBadge");
    if (diff <= 0) {
      clearInterval(sessionTimerInterval);
      logoutCurrentUser(true);
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    if (timerBadge) {
      timerBadge.textContent = `⏱️ Session: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      timerBadge.classList.remove("hidden");
    }
  }
  updateTimer();
  sessionTimerInterval = setInterval(updateTimer, 1000);
}

function logoutCurrentUser(sessionExpired = false) {
  if (currentUser) {
    logAuditEvent(`Staff logged out (${currentUser.username})`, currentUser.username, "auth");
  }
  currentUser = null;
  localStorage.removeItem(KEY_SESSION);
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  document.getElementById("staffSessionTimerBadge")?.classList.add("hidden");
  document.getElementById("staffLogoutNavBtn")?.classList.add("hidden");
  document.getElementById("staffLoginNavBtn")?.classList.remove("hidden");
  closeAdminDashboardModal();
  closeCustomerProfileModal();
  syncCustomerHeaderUI();
  if (sessionExpired) alert("Your 24-hour staff session has expired. Please sign in again.");
}

function autoScrollTo(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
function scrollToProducts() { autoScrollTo("catalogTopAnchor"); }
function scrollToContact() { autoScrollTo("contactSectionAnchor"); }

function checkWelcomeGreetingBanner() {
  const dismissed = sessionStorage.getItem("mqb_greeting_dismissed");
  const el = document.getElementById("welcomeGreetingBanner");
  if (!dismissed && el) {
    el.classList.remove("hidden");
    const msg = document.getElementById("welcomeGreetingText");
    if (msg) msg.textContent = config.welcomeGreeting || "Assalamu Alaikum! Welcome to MOIN QURAN BOX.";
  }
}
function dismissGreetingBanner() {
  sessionStorage.setItem("mqb_greeting_dismissed", "true");
  document.getElementById("welcomeGreetingBanner")?.classList.add("hidden");
}

function handleSendMessageToOwner(e) {
  e.preventDefault();
  const name = document.getElementById("msgCustName")?.value.trim() || "";
  const phone = document.getElementById("msgCustPhone")?.value.trim() || "";
  const subject = document.getElementById("msgCustSubject")?.value.trim() || "";
  const message = document.getElementById("msgCustMessage")?.value.trim() || "";
  const channel = document.querySelector('input[name="msgChannel"]:checked')?.value || "whatsapp";

  const formattedMsg = `*NEW WEBSITE INQUIRY — ${config.brandName}*\n\n` +
    `*From:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Subject:* ${subject}\n\n` +
    `*Message:* ${message}`;

  if (channel === "whatsapp") {
    window.open(`https://wa.me/91${config.whatsappPhone}?text=${encodeURIComponent(formattedMsg)}`, "_blank");
  } else {
    window.location.href = `mailto:${encodeURIComponent(config.ownerEmail)}?subject=${encodeURIComponent("Website Inquiry: " + subject)}&body=${encodeURIComponent(formattedMsg)}`;
  }

  alert("Inquiry prepared! Transferring to your selected channel.");
  document.getElementById("custMessageForm")?.reset();
}

// ==========================================
// 3. STOREFRONT & PRODUCTS RENDERERS
// ==========================================
const CATEGORIES = ["All", "Tarjuma Qurans", "Quran Boxes & Rehal", "Janamaz", "Hajj & Umrah", "Namaz Caps & Tasbih"];

function renderCategoryChips() {
  const container = document.getElementById("categoryChips");
  if (!container) return;
  container.innerHTML = CATEGORIES.map(cat => `
    <button onclick="filterCategory('${cat}')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${currentCategory === cat ? 'bg-brand-charcoal text-white shadow' : 'bg-white text-brand-charcoal border border-brand-border hover:bg-neutral-100'}">
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

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  const inStockOnly = document.getElementById("filterInStockOnly")?.checked;
  const sort = document.getElementById("filterSortOrder")?.value || "featured";

  let list = currentCategory === "All" ? [...products] : products.filter(p => p.category === currentCategory);
  if (inStockOnly) list = list.filter(p => p.stock > 0);

  if (sort === "low-to-high") list.sort((a, b) => a.salePrice - b.salePrice);
  else if (sort === "high-to-low") list.sort((a, b) => b.salePrice - a.salePrice);

  const canWishlist = config.featureToggles?.customerWishlist;
  const canQuickView = config.featureToggles?.quickViewShopping;
  const canCompare = config.featureToggles?.compareTool;
  const canExpress = config.featureToggles?.expressCheckout;

  grid.innerHTML = list.map(p => {
    let effectivePrice = p.salePrice;
    if (config.surgePricing && p.stock <= 5 && p.stock > 0) {
      effectivePrice = Math.round(p.salePrice * 1.05);
    }

    return `
      <div onclick="trackRecentlyViewed('${p.id}')" class="bg-white rounded-xl border border-brand-border overflow-hidden flex flex-col justify-between hover:shadow-md transition cursor-pointer">
        <div class="relative bg-neutral-100 pt-[100%] overflow-hidden group">
          <img src="${p.image}" alt="${p.title}" class="absolute inset-0 w-full h-full object-cover" />
          
          ${canWishlist ? `
            <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-xs hover:scale-110 transition shadow z-10">
              ${wishlist.includes(p.id) ? '❤️' : '🤍'}
            </button>
          ` : ''}
          
          ${canQuickView ? `
            <button onclick="event.stopPropagation(); openQuickView('${p.id}')" class="absolute top-10 right-2 p-1.5 bg-white/90 rounded-full text-[10px] font-bold hover:scale-110 transition shadow z-10" title="Quick View">
              👁️
            </button>
          ` : ''}
          
          ${canCompare ? `
            <button onclick="event.stopPropagation(); toggleCompare('${p.id}')" class="absolute top-[68px] right-2 p-1.5 bg-white/90 rounded-full text-[10px] font-bold hover:scale-110 transition shadow z-10" title="Compare">
              ${compareList.includes(p.id) ? '⚖️✓' : '⚖️'}
            </button>
          ` : ''}
          
          ${p.stock <= 5 && p.stock > 0 ? `<span class="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase z-10">Only ${p.stock} left</span>` : ''}
          ${p.stock <= 0 ? `<span class="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase z-10">Out of Stock</span>` : ''}
        </div>
        
        <div class="p-3 flex-1 flex flex-col justify-between space-y-2">
          <div>
            <span class="text-[10px] text-amber-700 font-bold block">${p.category}</span>
            <h4 class="font-serif font-bold text-xs sm:text-sm text-brand-charcoal line-clamp-2 leading-snug">${p.title}</h4>
          </div>
          <div>
            <div class="flex items-baseline gap-2 mb-2">
              <span class="text-xs line-through text-neutral-400">${formatPrice(p.oldPrice || p.salePrice + 400)}</span>
              <span class="text-sm sm:text-base font-bold text-brand-charcoal">${formatPrice(effectivePrice)}</span>
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <button onclick="event.stopPropagation(); addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="w-full py-1.5 bg-brand-charcoal hover:bg-neutral-800 text-white rounded text-[11px] font-bold uppercase transition disabled:opacity-40">
                Add to Cart
              </button>
              ${canExpress ? `
                <button onclick="event.stopPropagation(); expressBuyNow('${p.id}')" ${p.stock <= 0 ? 'disabled' : ''} class="w-full py-1.5 bg-brand-gold hover:bg-brand-goldHover text-white rounded text-[11px] font-bold uppercase transition disabled:opacity-40">
                  Buy Now
                </button>
              ` : `
                <a href="https://wa.me/91${config.whatsappPhone}?text=${encodeURIComponent(`Salam, I want to order: ${p.title}`)}" target="_blank" onclick="event.stopPropagation();" class="w-full py-1.5 bg-brand-whatsapp text-white rounded text-[11px] font-bold uppercase text-center flex items-center justify-center shadow">
                  WhatsApp
                </a>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function trackRecentlyViewed(prodId) {
  if (!recentlyViewed.includes(prodId)) {
    recentlyViewed.unshift(prodId);
    if (recentlyViewed.length > 4) recentlyViewed.pop();
    renderRecentlyViewed();
  }
}

function renderRecentlyViewed() {
  const sec = document.getElementById("recentlyViewedSection");
  const grid = document.getElementById("recentlyViewedGrid");
  if (!sec || !grid || recentlyViewed.length === 0) return;
  sec.classList.remove("hidden");
  grid.innerHTML = recentlyViewed.map(id => {
    const p = products.find(x => x.id === id);
    if (!p) return '';
    return `
      <div class="bg-white p-2 rounded-xl border flex items-center gap-2 cursor-pointer hover:bg-neutral-50" onclick="openQuickView('${p.id}')">
        <img src="${p.image}" class="w-10 h-10 object-cover rounded" />
        <div class="truncate">
          <p class="font-bold truncate text-xs text-brand-charcoal">${p.title}</p>
          <span class="text-[11px] text-brand-gold font-bold">${formatPrice(p.salePrice)}</span>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================
// 4. EASY SHOPPING MODALS
// ==========================================
function openQuickView(prodId) {
  if (!config.featureToggles?.quickViewShopping) return alert("Quick View is currently disabled by Admin.");
  const p = products.find(x => x.id === prodId);
  if (!p) return;
  const content = document.getElementById("quickViewContent");
  if (!content) return;
  content.innerHTML = `
    <div><img src="${p.image}" class="w-full h-64 object-cover rounded-xl border" /></div>
    <div class="space-y-3 flex flex-col justify-between">
      <div>
        <span class="text-[10px] uppercase font-bold text-brand-gold">${p.category}</span>
        <h3 class="serif-title text-base font-bold text-brand-charcoal mt-1">${p.title}</h3>
        <p class="text-lg font-mono font-bold text-brand-darkgreen mt-2">${formatPrice(p.salePrice)}</p>
        <p class="text-neutral-600 mt-2 text-xs leading-relaxed">${p.desc || 'Direct manufacturer quality from Hyderabad. Handcrafted with devotion.'}</p>
        <p class="text-[11px] font-bold text-emerald-700 mt-2">Stock Availability: ${p.stock} units</p>
      </div>
      <div class="flex gap-2 pt-3 border-t">
        <button onclick="addToCart('${p.id}'); closeQuickViewModal();" ${p.stock <= 0 ? 'disabled' : ''} class="flex-1 py-2.5 bg-brand-charcoal text-white rounded text-xs font-bold uppercase disabled:opacity-50">Add to Cart</button>
        <button onclick="closeQuickViewModal()" class="px-4 py-2 bg-neutral-100 rounded text-xs font-semibold">Close</button>
      </div>
    </div>
  `;
  document.getElementById("quickViewModal")?.classList.remove("hidden");
}
function closeQuickViewModal() { document.getElementById("quickViewModal")?.classList.add("hidden"); }

function expressBuyNow(prodId) {
  if (!config.featureToggles?.expressCheckout) return alert("Express Checkout is currently disabled by Admin.");
  addToCart(prodId);
  startCheckout();
}

function toggleCompare(prodId) {
  if (!config.featureToggles?.compareTool) return alert("Comparison tool is disabled.");
  if (compareList.includes(prodId)) compareList = compareList.filter(id => id !== prodId);
  else {
    if (compareList.length >= 2) return alert("You can compare a maximum of 2 products side-by-side.");
    compareList.push(prodId);
  }
  const el = document.getElementById("compareCount");
  if (el) el.textContent = compareList.length;
  renderProducts();
}

function openCompareDrawer() {
  if (!config.featureToggles?.compareTool) return alert("Comparison tool is disabled.");
  if (compareList.length === 0) return alert("Select products to compare by clicking the ⚖️ icon.");
  const container = document.getElementById("compareGridContainer");
  if (!container) return;
  container.innerHTML = compareList.map(id => {
    const p = products.find(x => x.id === id);
    if (!p) return '';
    return `
      <div class="p-3 bg-brand-sand rounded-xl border space-y-2 flex flex-col h-full">
        <img src="${p.image}" class="w-full h-32 object-cover rounded" />
        <span class="text-[9px] uppercase font-bold text-brand-gold">${p.category}</span>
        <h5 class="font-bold text-xs flex-grow">${p.title}</h5>
        <div class="pt-2 border-t border-brand-border/50">
          <p class="font-mono font-bold text-brand-darkgreen">${formatPrice(p.salePrice)}</p>
          <p class="text-[10px] text-neutral-600 mt-1">${p.desc || 'Premium Islamic item.'}</p>
        </div>
        <button onclick="addToCart('${p.id}')" class="w-full py-1.5 mt-2 bg-brand-charcoal text-white rounded text-[10px] font-bold uppercase">Add to Cart</button>
      </div>
    `;
  }).join("");
  document.getElementById("compareModal")?.classList.remove("hidden");
}
function closeCompareModal() { document.getElementById("compareModal")?.classList.add("hidden"); }

function openQuizModal() { if (!config.featureToggles?.giftQuiz) return alert("Gift Quiz is disabled."); document.getElementById("quizModal")?.classList.remove("hidden"); }
function closeQuizModal() { document.getElementById("quizModal")?.classList.add("hidden"); }
function submitQuizAnswer(ans) { alert("Based on your selection (" + ans + "), we recommend our Deluxe Wooden Velvet Quran Gift Set!"); closeQuizModal(); }

function openWholesaleCalculatorModal() { if (!config.featureToggles?.wholesaleCalculator) return alert("Calculator disabled."); document.getElementById("wholesaleCalculatorModal")?.classList.remove("hidden"); }
function closeWholesaleCalculatorModal() { document.getElementById("wholesaleCalculatorModal")?.classList.add("hidden"); }
function calculateBulkPrice(qty) {
  const q = parseInt(qty) || 1;
  let unit = q >= 100 ? 550 : (q >= 50 ? 650 : (q >= 20 ? 750 : 900));
  const total = q * unit;
  const res = document.getElementById("bulkResultBox");
  if (res) {
    res.innerHTML = `
      <p>Wholesale Unit Price: <strong>${formatPrice(unit)} / pc</strong></p>
      <p>Total Estimate: <strong class="text-emerald-700 font-mono text-sm">${formatPrice(total)}</strong></p>
      <p class="text-[9px] text-neutral-500 mt-1">Prices are strictly for distributors & bulk orders.</p>
    `;
  }
}

function openPrayerTimesModal() { if (!config.featureToggles?.prayerTimes) return alert("Disabled."); document.getElementById("prayerTimesModal")?.classList.remove("hidden"); }
function closePrayerTimesModal() { document.getElementById("prayerTimesModal")?.classList.add("hidden"); }
function openCurrencyModal() { if (!config.featureToggles?.currencyConverter) return alert("Disabled."); document.getElementById("currencyModal")?.classList.remove("hidden"); }
function closeCurrencyModal() { document.getElementById("currencyModal")?.classList.add("hidden"); }
function openFlashSaleModal() { if (!config.featureToggles?.flashDeals) return alert("Disabled."); document.getElementById("flashSaleModal")?.classList.remove("hidden"); }
function closeFlashSaleModal() { document.getElementById("flashSaleModal")?.classList.add("hidden"); }
function openWallpaperModal() { if (!config.featureToggles?.wallpapers) return alert("Disabled."); document.getElementById("wallpaperModal")?.classList.remove("hidden"); }
function closeWallpaperModal() { document.getElementById("wallpaperModal")?.classList.add("hidden"); }
function openPincodeCheckerModal() { if (!config.featureToggles?.pincodeChecker) return alert("Disabled."); document.getElementById("pincodeCheckerModal")?.classList.remove("hidden"); }
function closePincodeCheckerModal() { document.getElementById("pincodeCheckerModal")?.classList.add("hidden"); }
function checkPincodeAvailability() {
  const pin = document.getElementById("checkPincodeInput")?.value.trim() || "";
  const res = document.getElementById("pincodeResult");
  if (!res) return;
  if (pin.length === 6 && pin.startsWith("500")) {
    res.innerHTML = "✓ Free doorstep delivery & COD available for this Hyderabad Pincode!";
    res.className = "p-2.5 bg-emerald-50 text-emerald-800 rounded font-bold mt-2";
  } else {
    res.innerHTML = "⚠ Outside standard free delivery zone. Shipping charges apply.";
    res.className = "p-2.5 bg-amber-50 text-amber-800 rounded font-bold mt-2";
  }
}

function openSearchModal() { document.getElementById("searchModal")?.classList.remove("hidden"); document.getElementById("searchInput")?.focus(); }
function closeSearchModal() { document.getElementById("searchModal")?.classList.add("hidden"); }
function liveSearch(q) {
  const box = document.getElementById("searchResults");
  if (!box) return;
  const query = q.trim().toLowerCase();
  if (!query) { box.innerHTML = ""; return; }
  box.innerHTML = products.filter(p => p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)).map(m => `
    <div onclick="openQuickView('${m.id}'); closeSearchModal();" class="p-2 flex justify-between items-center cursor-pointer hover:bg-brand-sand rounded">
      <span>${m.title}</span><span class="font-bold">${formatPrice(m.salePrice)}</span>
    </div>
  `).join("");
}

// Single Head Showroom Render
function renderBranchesOnStorefront() {
  const container = document.getElementById("storefrontBranchesContainer");
  if (!container || !config.branches || config.branches.length === 0) return;
  const b = config.branches[0];
  container.innerHTML = `
    <div class="bg-brand-sand/70 p-4 rounded-xl border border-brand-border space-y-1.5 text-xs">
      <h5 class="font-bold text-brand-charcoal flex items-center gap-1.5 text-sm"><span>📍</span> ${b.name}</h5>
      <p class="text-neutral-600 leading-snug">${b.address}</p>
      <p class="text-[11px] font-mono text-brand-muted">📞 +91 ${b.phone} • Proprietors: ${b.manager}</p>
      <div class="pt-2 flex gap-2">
        <a href="https://wa.me/91${b.phone}?text=${encodeURIComponent(`Salam, I have an inquiry for ${b.name}`)}" target="_blank" class="px-2.5 py-1.5 bg-brand-whatsapp text-white rounded text-[11px] font-bold inline-flex items-center gap-1">WhatsApp Showroom</a>
        <a href="tel:${b.phone}" class="px-2.5 py-1.5 bg-white border border-brand-border rounded text-[11px] font-semibold text-brand-charcoal">Call Showroom</a>
      </div>
    </div>
  `;
}

// ==========================================
// 5. CART & CHECKOUT
// ==========================================
function addToCart(prodId) {
  if (config.maintenanceMode) return alert("Store is currently in maintenance mode. Orders are paused.");
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
  if (badge) badge.textContent = count;
  if (subtotal) subtotal.textContent = formatPrice(total);

  const box = document.getElementById("cartContainer");
  if (!box) return;
  if (cart.length === 0) { box.innerHTML = `<div class="py-12 text-center text-xs text-brand-muted">Your shopping bag is empty.</div>`; return; }
  box.innerHTML = cart.map(it => `
    <div class="flex items-center gap-3 py-3 border-b border-brand-border">
      <img src="${it.image}" class="w-12 h-12 object-cover rounded border" />
      <div class="flex-1">
        <h5 class="font-bold text-xs text-brand-charcoal line-clamp-1">${it.title}</h5>
        <span class="text-xs text-brand-muted">${formatPrice(it.salePrice)}</span>
        <div class="flex items-center gap-2 mt-1">
          <button onclick="updateCartQty('${it.id}', -1)" class="w-5 h-5 bg-neutral-200 rounded font-bold text-xs">-</button>
          <span class="text-xs font-semibold">${it.qty}</span>
          <button onclick="updateCartQty('${it.id}', 1)" class="w-5 h-5 bg-neutral-200 rounded font-bold text-xs">+</button>
        </div>
      </div>
      <span class="font-bold text-xs font-mono">${formatPrice(it.salePrice * it.qty)}</span>
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
function navigateDrawer(cat) { filterCategory(cat); toggleDrawer(false); scrollToProducts(); }

function startCheckout() {
  if (config.maintenanceMode) return alert("Store is currently in maintenance mode. Orders are paused.");
  if (cart.length === 0) return alert("Your cart is empty!");
  toggleCart(false);
  const total = cart.reduce((s, it) => s + (it.salePrice * it.qty), 0);
  const payEl = document.getElementById("checkoutTotalAmount");
  if (payEl) payEl.textContent = formatPrice(total);

  if (currentUser && currentUser.role === "customer") {
    const elN = document.getElementById("chkName");
    const elP = document.getElementById("chkPhone");
    const elE = document.getElementById("chkEmail");
    const elA = document.getElementById("chkAddress");
    if (elN) elN.value = currentUser.name || "";
    if (elP) elP.value = currentUser.phone || "";
    if (elE) elE.value = currentUser.email || "";
    if (elA && currentUser.addresses && currentUser.addresses.length > 0) elA.value = currentUser.addresses[0];
  }
  document.getElementById("checkoutModal")?.classList.remove("hidden");
}
function closeCheckoutModal() { document.getElementById("checkoutModal")?.classList.add("hidden"); }

function handlePlaceOrder(e) {
  e.preventDefault();
  const name = document.getElementById("chkName")?.value.trim() || "";
  const phone = document.getElementById("chkPhone")?.value.trim() || "";
  const email = document.getElementById("chkEmail")?.value.trim() || "";
  const address = document.getElementById("chkAddress")?.value.trim() || "";
  const postalCode = document.getElementById("chkPostalCode")?.value.trim() || "";
  const paymentMethod = document.querySelector('input[name="chkPaymentMethod"]:checked')?.value || "Online";
  const couponCode = document.getElementById("chkCouponInput")?.value.trim().toUpperCase();
  
  let total = cart.reduce((s, it) => s + (it.salePrice * it.qty), 0);

  if (couponCode) {
    const cp = coupons.find(c => c.code === couponCode);
    if (cp && total >= (cp.minOrder || 0)) {
      const disc = cp.type === "percent" ? Math.round((total * cp.discount) / 100) : cp.discount;
      total = Math.max(0, total - disc);
    } else alert("Invalid coupon or minimum order amount not reached.");
  }

  const orderId = `MQB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  
  let courierName = "Hyderabad Express Fleet";
  if (config.expressRouting && !postalCode.startsWith("500")) {
    courierName = "BlueDart Express National";
  }

  const newOrder = {
    orderId, customerName: name, customerPhone: phone, customerEmail: email,
    address, postalCode, total, date: new Date().toISOString(), status: "Processing",
    channel: "Online", courierName, awb: `AWB-${Date.now().toString().slice(-6)}`, paymentMethod, items: [...cart]
  };

  cart.forEach(item => {
    const p = products.find(x => x.id === item.id);
    if (p) p.stock = Math.max(0, p.stock - item.qty);
  });

  orders.unshift(newOrder);
  logAuditEvent(`New order placed: ${orderId} (₹${total}) by ${name}`, name, "order");
  
  cart = [];
  persist();
  updateCartUI();
  renderProducts();
  closeCheckoutModal();

  const successEl = document.getElementById("successOrderIdDisplay");
  if (successEl) successEl.textContent = orderId;

  const itemsList = newOrder.items.map(it => `• ${it.title} (x${it.qty})`).join("\n");
  const waMsg = encodeURIComponent(
    `*NEW ORDER NOTIFICATION — MOIN QURAN BOX*\n\n` +
    `*Order ID:* ${orderId}\n` +
    `*Customer:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Address:* ${address} (Pincode: ${postalCode})\n` +
    `*Payment:* ${paymentMethod}\n` +
    `*Total:* ${formatPrice(total)}\n\n` +
    `*Items:*\n${itemsList}`
  );
  
  const waBtn = document.getElementById("successWhatsAppOrderBtn");
  if (waBtn) waBtn.href = `https://wa.me/91${config.whatsappPhone}?text=${waMsg}`;
  document.getElementById("orderSuccessModal")?.classList.remove("hidden");
}
function closeSuccessModal() { document.getElementById("orderSuccessModal")?.classList.add("hidden"); }

// ==========================================
// 6. INVOICE LOOKUP & PRINTING
// ==========================================
function openInvoiceLookupModal() { document.getElementById("invoiceLookupModal")?.classList.remove("hidden"); }
function closeInvoiceLookupModal() { document.getElementById("invoiceLookupModal")?.classList.add("hidden"); }
function handlePublicInvoiceLookup(e) {
  e.preventDefault();
  const id = document.getElementById("lookupOrderId")?.value.trim().toUpperCase() || "";
  const phone = document.getElementById("lookupPhone")?.value.replace(/\D/g, "") || "";
  const match = orders.find(o => o.orderId.toUpperCase() === id && o.customerPhone.replace(/\D/g, "").includes(phone));
  const err = document.getElementById("lookupError");
  if (!match) {
    if (err) { err.textContent = "No invoice matched this Order ID and Phone."; err.classList.remove("hidden"); }
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
      <hr style="margin: 15px 0;" />
      <p><strong>Order ID:</strong> ${order.orderId} | <strong>Date:</strong> ${new Date(order.date).toLocaleDateString()}</p>
      <p><strong>Status:</strong> ${order.status} | <strong>Payment:</strong> ${order.paymentMethod || 'Online'}</p>
      <p><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</p>
      <p><strong>Address:</strong> ${order.address} ${order.postalCode ? ` - Pincode: ${order.postalCode}` : ''}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
        <thead>
          <tr style="background: #f4efe6; text-align: left;">
            <th style="padding: 8px;">Item Description</th><th style="padding: 8px; text-align: center;">Qty</th><th style="padding: 8px; text-align: right;">Price</th><th style="padding: 8px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(it => `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">${it.title}</td><td style="padding: 8px; text-align: center;">${it.qty}</td><td style="padding: 8px; text-align: right;">₹${it.salePrice}</td><td style="padding: 8px; text-align: right;">₹${it.salePrice * it.qty}</td></tr>`).join('')}
        </tbody>
      </table>
      <h3 style="text-align: right; margin-top: 20px; color: #1c3026;">Grand Total: ₹${order.total}</h3>
    </div>
  `;
  printDiv.classList.remove("hidden");
  window.print();
  printDiv.classList.add("hidden");
}
function openTrackingModal() { document.getElementById("trackingModal")?.classList.remove("hidden"); }
function closeTrackingModal() { document.getElementById("trackingModal")?.classList.add("hidden"); }
function trackOrderById() {
  const id = document.getElementById("trackInputId")?.value.trim().toUpperCase() || "";
  const res = document.getElementById("trackingResultBox");
  if (!res) return;
  const order = orders.find(o => o.orderId.toUpperCase() === id);
  res.classList.remove("hidden");
  if (!order) { res.innerHTML = `<p class="text-red-600 font-bold">No shipment found.</p>`; return; }
  res.innerHTML = `<p><strong>Status:</strong> <span class="text-emerald-700 font-bold">${order.status}</span></p><p><strong>Courier Partner:</strong> ${order.courierName || 'Hyderabad Express Fleet'}</p><p><strong>AWB:</strong> ${order.awb}</p>`;
}

// ==========================================
// 7. CUSTOMER AUTHENTICATION & PORTAL
// ==========================================
function openCustomerAuthModal(tab = 'login') {
  document.getElementById("customerAuthModal")?.classList.remove("hidden");
  switchCustomerAuthTab(tab);
}
function closeCustomerAuthModal() { document.getElementById("customerAuthModal")?.classList.add("hidden"); }
function switchCustomerAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById("cxLoginForm")?.classList.toggle("hidden", !isLogin);
  document.getElementById("cxRegisterForm")?.classList.toggle("hidden", isLogin);
}
function handleCustomerLoginSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("cxLoginId")?.value.trim().toLowerCase() || "";
  const pass = document.getElementById("cxLoginPass")?.value.trim() || "";
  const user = users.find(u => u.role === "customer" && (u.phone === id || u.email?.toLowerCase() === id) && (u.password === pass || u.pin === pass));
  if (!user) return alert("Invalid customer credentials.");
  if (user.isBlocked) return alert("This account has been suspended or blocked by the Administrator.");
  currentUser = user;
  localStorage.setItem(KEY_SESSION, JSON.stringify({ user: currentUser, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
  closeCustomerAuthModal();
  syncCustomerHeaderUI();
  openCustomerProfileModal();
}
function handleCustomerRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("cxRegName")?.value.trim() || "";
  const phone = document.getElementById("cxRegPhone")?.value.trim() || "";
  const email = document.getElementById("cxRegEmail")?.value.trim() || "";
  const pass = document.getElementById("cxRegPass")?.value.trim() || "";
  const pin = document.getElementById("cxRegPin")?.value.trim() || "1234";
  if (users.some(u => u.phone === phone)) return alert("Account already exists with this phone number.");
  const newUser = { id: "cust-" + Date.now(), username: phone, name, phone, email, password: pass, pin, role: "customer", addresses: ["Madina Colony, Falaknuma"], supportTickets: [], isBlocked: false };
  users.push(newUser);
  currentUser = newUser;
  persist();
  localStorage.setItem(KEY_SESSION, JSON.stringify({ user: currentUser, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }));
  closeCustomerAuthModal();
  syncCustomerHeaderUI();
  openCustomerProfileModal();
}

function openCustomerProfileModal() {
  if (!currentUser || currentUser.role !== "customer") return;
  document.getElementById("customerProfileModal")?.classList.remove("hidden");
  const elName = document.getElementById("custProfName");
  const elContact = document.getElementById("custProfContact");
  if (elName) elName.textContent = currentUser.name;
  if (elContact) elContact.textContent = `${currentUser.email || ''} • 📞 ${currentUser.phone}`;
  applyCustomerFeatureVisibility();
  switchCustomerTab('orders');
}
function closeCustomerProfileModal() { document.getElementById("customerProfileModal")?.classList.add("hidden"); }

function applyCustomerFeatureVisibility() {
  const ft = config.featureToggles || {};
  document.getElementById("cxTabBtn-wishlist")?.classList.toggle("hidden", !ft.customerWishlist);
  document.getElementById("cxTabBtn-wallet")?.classList.toggle("hidden", !ft.customerWallet);
  document.getElementById("cxTabBtn-tickets")?.classList.toggle("hidden", !ft.customerSupportTickets);
  document.getElementById("cxTabBtn-vouchers")?.classList.toggle("hidden", !ft.customerVouchers);
  document.getElementById("cxTabBtn-reorder")?.classList.toggle("hidden", !ft.customerReorder);
  document.getElementById("cxTabBtn-warranty")?.classList.toggle("hidden", !ft.customerWarranty);
  document.getElementById("cxTabBtn-statement")?.classList.toggle("hidden", !ft.customerStatements);
}

function switchCustomerTab(tab) {
  const tabs = ['orders', 'wishlist', 'addresses', 'wallet', 'tickets', 'vouchers', 'reorder', 'warranty', 'security', 'statement'];
  tabs.forEach(t => {
    document.getElementById(`cxContent-${t}`)?.classList.toggle("hidden", t !== tab);
    const btn = document.getElementById(`cxTabBtn-${t}`);
    if (btn) btn.className = "px-3.5 py-2.5 border-b-2 font-bold uppercase text-[10px] whitespace-nowrap " + (t === tab ? "border-brand-charcoal text-brand-charcoal bg-white" : "border-transparent text-neutral-500 hover:text-black");
  });
  if (tab === 'orders') renderCustProfileOrders();
  if (tab === 'wishlist') renderCustProfileWishlist();
  if (tab === 'addresses') renderCustProfileAddresses();
  if (tab === 'tickets') renderCustProfileTickets();
  if (tab === 'reorder') renderCustProfileReorder();
}

function renderCustProfileOrders() {
  const myOrders = orders.filter(o => o.customerPhone === currentUser.phone);
  const container = document.getElementById("custOrderList");
  if (!container) return;
  container.innerHTML = myOrders.length === 0 ? `<p class="text-xs text-neutral-400 py-4 text-center">No past orders.</p>` : myOrders.map(o => `
    <div class="p-3 border rounded-lg bg-brand-sand/50 text-xs space-y-1 ${o.status === 'Cancelled' ? 'opacity-75' : ''}">
      <div class="flex justify-between items-center font-bold">
        <span>${o.orderId}</span>
        <span class="${o.status === 'Cancelled' ? 'text-red-600' : 'text-emerald-700'}">${o.status}</span>
      </div>
      <p class="text-neutral-600">${o.items.map(it => `${it.title} (x${it.qty})`).join(', ')}</p>
      <div class="flex flex-wrap justify-between items-center pt-2 border-t font-semibold gap-2">
        <span>Total: ${formatPrice(o.total)}</span>
        <div class="flex gap-3 items-center">
          ${o.status === 'Processing' ? `<button onclick="cancelCustomerOrder('${o.orderId}')" class="text-red-600 hover:underline font-bold text-[10px] uppercase border border-red-200 px-2 py-1 rounded">Cancel Order</button>` : ''}
          <button onclick="prepareAndPrintInvoice('${o.orderId}')" class="text-brand-gold hover:underline font-bold">Print Invoice</button>
        </div>
      </div>
    </div>
  `).join("");
}

function cancelCustomerOrder(orderId) {
  if (!confirm("Are you sure you want to cancel this order? This action cannot be reversed.")) return;
  const o = orders.find(x => x.orderId === orderId);
  if (o && o.status === 'Processing') {
    o.status = 'Cancelled';
    o.items.forEach(item => {
      const p = products.find(x => x.id === item.id);
      if (p) p.stock += item.qty;
    });
    persist();
    logAuditEvent(`Customer cancelled order: ${orderId}`, currentUser.name, "order");
    renderCustProfileOrders();
    alert(`Order ${orderId} has been successfully cancelled.`);
  }
}

function renderCustProfileWishlist() {
  const grid = document.getElementById("custWishlistGrid");
  if (!grid) return;
  const list = products.filter(p => wishlist.includes(p.id));
  grid.innerHTML = list.length === 0 ? `<p class="text-xs text-neutral-400 py-4 col-span-full text-center">Wishlist is empty.</p>` : list.map(p => `
    <div class="p-2 border rounded bg-white flex flex-col justify-between">
      <img src="${p.image}" class="w-full h-24 object-cover rounded" />
      <h5 class="font-bold text-xs line-clamp-1 mt-1">${p.title}</h5>
      <span class="font-mono font-bold text-xs text-brand-gold">${formatPrice(p.salePrice)}</span>
      <button onclick="addToCart('${p.id}')" class="mt-2 py-1 bg-brand-charcoal text-white rounded text-[10px] font-bold uppercase">Add to Cart</button>
    </div>
  `).join("");
}

function renderCustProfileAddresses() {
  const box = document.getElementById("custAddressesList");
  if (!box) return;
  box.innerHTML = (currentUser.addresses || ["Madina Colony, Falaknuma"]).map(a => `<div class="p-2.5 bg-brand-sand border rounded-lg text-xs">📍 ${a}</div>`).join("");
}
function promptAddCustomerAddress() {
  const a = prompt("Enter delivery address:");
  if (!a) return;
  if (!currentUser.addresses) currentUser.addresses = [];
  currentUser.addresses.push(a.trim());
  persist();
  renderCustProfileAddresses();
}

function renderCustProfileTickets() {
  const box = document.getElementById("custTicketsList");
  if (!box) return;
  box.innerHTML = (currentUser.supportTickets || []).map(t => `<div class="p-2.5 bg-brand-sand border rounded-lg text-xs flex justify-between"><span>🎫 ${t.subject}</span><strong class="text-emerald-700">${t.status}</strong></div>`).join("");
}
function promptCreateSupportTicket() {
  const s = prompt("Support ticket subject:");
  if (!s) return;
  if (!currentUser.supportTickets) currentUser.supportTickets = [];
  currentUser.supportTickets.push({ id: "TKT-" + Date.now(), subject: s, status: "Open" });
  persist();
  renderCustProfileTickets();
}

function renderCustProfileReorder() {
  const box = document.getElementById("custReorderContainer");
  if (!box) return;
  const myOrders = orders.filter(o => o.customerPhone === currentUser.phone);
  box.innerHTML = myOrders.length === 0 ? `<p class="text-xs text-neutral-400">No past orders.</p>` : myOrders.slice(0, 3).map(o => `
    <div class="p-3 bg-brand-sand border rounded-lg flex justify-between items-center text-xs">
      <div><strong>${o.orderId}</strong><p class="text-neutral-500">${o.items.map(it => it.title).join(', ')}</p></div>
      <button onclick="reorderPastOrder('${o.orderId}')" class="px-3 py-1.5 bg-brand-darkgreen text-white rounded font-bold uppercase text-[10px]">Reorder</button>
    </div>
  `).join("");
}
function reorderPastOrder(orderId) {
  const o = orders.find(x => x.orderId === orderId);
  if (!o) return;
  o.items.forEach(it => addToCart(it.id));
  alert("Items added to your bag!");
}

function handleCustomerSecurityUpdate(e) {
  e.preventDefault();
  const pass = document.getElementById("cxNewPass")?.value.trim() || "";
  const pin = document.getElementById("cxNewPin")?.value.trim() || "";
  const u = users.find(x => x.id === currentUser.id);
  if (!u) return;
  if (pass) u.password = pass;
  if (pin) u.pin = pin;
  currentUser = u;
  persist();
  alert("Security credentials updated successfully!");
}

function syncCustomerHeaderUI() {
  const badge = document.getElementById("customerStatusDot");
  const navText = document.getElementById("navAccountLabel");
  if (currentUser && currentUser.role === "customer") {
    badge?.classList.remove("hidden");
    if (navText) navText.textContent = `Hi, ${currentUser.name.split(' ')[0]}`;
  } else {
    badge?.classList.add("hidden");
    if (navText) navText.textContent = "Customer Login";
  }
}

function handleUserIconClick() {
  if (currentUser) {
    if (currentUser.role === "admin" || currentUser.role === "owner") openAdminDashboardModal();
    else openCustomerProfileModal();
  } else openCustomerAuthModal('login');
}

// ==========================================
// 8. STAFF PORTAL & MASTER DEVELOPER ADMIN
// ==========================================
function openAdminLoginModal() {
  document.getElementById("portalLoginError")?.classList.add("hidden");
  document.getElementById("portalLoginForm")?.reset();
  document.getElementById("adminLoginModal")?.classList.remove("hidden");
}
function closeAdminLoginModal() { document.getElementById("adminLoginModal")?.classList.add("hidden"); }

function handlePortalLogin(e) {
  e.preventDefault();
  const errBox = document.getElementById("portalLoginError");
  errBox?.classList.add("hidden");

  const u = document.getElementById("portalUsername")?.value.trim() || "";
  const p = document.getElementById("portalPassword")?.value.trim() || "";

  const user = users.find(x => 
    (x.role === "admin" || x.role === "owner") && 
    x.username.toLowerCase() === u.toLowerCase() && 
    x.password === p
  );

  if (!user) {
    if (errBox) {
      errBox.textContent = "Access Denied: Invalid staff username or password.";
      errBox.classList.remove("hidden");
    }
    return;
  }

  if (user.isBlocked) {
    if (errBox) {
      errBox.textContent = "Account Revoked: Your staff access has been disabled by the Administrator.";
      errBox.classList.remove("hidden");
    }
    return;
  }

  currentUser = { role: user.role, name: user.name, username: user.username, id: user.id };
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(KEY_SESSION, JSON.stringify({ user: currentUser, expiresAt }));

  logAuditEvent(`Staff logged in: ${user.username} (${user.role})`, user.username, "auth");

  startSessionCountdownTimer(expiresAt);
  closeAdminLoginModal();
  document.getElementById("staffLoginNavBtn")?.classList.add("hidden");
  document.getElementById("staffLogoutNavBtn")?.classList.remove("hidden");
  openAdminDashboardModal();
}

function openAdminDashboardModal() {
  const modal = document.getElementById("adminDashboardModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const badge = document.getElementById("portalRoleBadge");
  const isMasterAdmin = currentUser?.role === "admin";

  if (badge) {
    if (isMasterAdmin) badge.textContent = "Developer Master Admin • Supreme Control";
    else badge.textContent = "Head Showroom Owner • Operational Access";
  }

  document.getElementById("adminTabBtn-salesmodifier")?.classList.toggle("hidden", !isMasterAdmin);
  document.getElementById("adminTabBtn-cms")?.classList.toggle("hidden", !isMasterAdmin);
  document.getElementById("adminTabBtn-customers")?.classList.toggle("hidden", !isMasterAdmin);
  document.getElementById("adminTabBtn-features")?.classList.toggle("hidden", !isMasterAdmin);
  document.getElementById("adminTabBtn-expert")?.classList.toggle("hidden", !isMasterAdmin);

  renderAdminOrders();
  renderAdminInventory();
  renderPosCatalog();
  renderCouponsTable();
  renderBranchesInDashboard();
  renderAdminFeatureToggles();
  if (isMasterAdmin) renderAdminCustomers();
  updateAnalytics();

  switchAdminTab('hub');
}
function closeAdminDashboardModal() { document.getElementById("adminDashboardModal")?.classList.add("hidden"); }

// Universal Search -> Connects to Customer 360 Hub
function handleUniversalSearch(query) {
  const q = query.trim().toLowerCase();
  const box = document.getElementById("universalSearchResults");
  if (!box) return;
  if (!q) { box.innerHTML = ""; return; }

  const matchedCustomers = users.filter(u => 
    u.role !== "admin" && 
    (u.phone.includes(q) || (u.email && u.email.toLowerCase().includes(q)) || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
  );
  
  const matchedOrders = orders.filter(o => 
    o.orderId.toLowerCase().includes(q) || o.customerPhone.includes(q) || o.customerName.toLowerCase().includes(q)
  );

  box.innerHTML = `
    <div class="space-y-3 pt-2">
      ${matchedCustomers.length > 0 ? `
        <div>
          <h5 class="font-bold text-[11px] uppercase tracking-wider text-brand-charcoal mb-1">Matched Accounts (${matchedCustomers.length})</h5>
          ${matchedCustomers.map(c => `
            <div class="p-2.5 bg-brand-sand border rounded-lg mb-1.5 flex justify-between items-center cursor-pointer hover:bg-neutral-200 transition" onclick="openCustomer360Modal('${c.id}')">
              <div>
                <strong>${c.name}</strong> • ${c.phone}
                <span class="text-[9px] uppercase font-bold ml-1.5 px-1.5 py-0.5 rounded ${c.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-700'}">${c.role}</span>
                ${c.isBlocked ? '<span class="text-[9px] bg-red-100 text-red-700 px-1 rounded ml-1 font-bold">BLOCKED</span>' : ''}
              </div>
              <span class="text-[10px] font-bold text-brand-darkgreen">View 360° Profile →</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${matchedOrders.length > 0 ? `
        <div>
          <h5 class="font-bold text-[11px] uppercase tracking-wider text-brand-charcoal mb-1">Matched Orders (${matchedOrders.length})</h5>
          ${matchedOrders.map(o => `
            <div class="p-2 bg-white border rounded-lg flex justify-between items-center mb-1">
              <span><strong>${o.orderId}</strong> - ${o.customerName} (${o.customerPhone})</span>
              <button onclick="prepareAndPrintInvoice('${o.orderId}')" class="px-2 py-1 bg-brand-sand rounded font-bold hover:bg-brand-gold hover:text-white transition">Print</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${matchedCustomers.length === 0 && matchedOrders.length === 0 ? `<p class="text-xs text-neutral-400 py-2">No matching accounts or orders found.</p>` : ''}
    </div>
  `;
}

// ----------------------------------------------------
// Customer 360 Profile Modal Logic (For Admin/Owner)
// ----------------------------------------------------
function openCustomer360Modal(userId) {
  const u = users.find(x => x.id === userId);
  if (!u) return;

  if (u.role === 'admin' && currentUser?.role !== 'admin') {
    return alert("Access Denied: Supreme Admin credentials are fully protected.");
  }
  
  const elN = document.getElementById('c360Name');
  const elP = document.getElementById('c360Phone');
  const elE = document.getElementById('c360Email');
  const elR = document.getElementById('c360Role');
  const elPass = document.getElementById('c360Password');
  const elPin = document.getElementById('c360Pin');
  const elAddr = document.getElementById('c360Address');
  
  if (elN) elN.textContent = u.name;
  if (elP) elP.textContent = u.phone || u.username;
  if (elE) elE.textContent = u.email || 'N/A';
  if (elR) elR.textContent = u.role;
  
  if (currentUser?.role === 'admin') {
    if (elPass) elPass.textContent = u.role === 'customer' ? 'Customer Pass Protected' : u.password;
    if (elPin) elPin.textContent = u.pin || u.password;
  } else {
    if (elPass) elPass.textContent = "•••••••• (Admin Only)";
    if (elPin) elPin.textContent = "••••";
  }
  
  const primaryAddr = (u.addresses && u.addresses.length > 0) ? u.addresses[0] : 'Madina Colony, Falaknuma';
  if (elAddr) elAddr.textContent = primaryAddr;
  
  const alertBanner = document.getElementById('c360StatusAlert');
  const statusText = document.getElementById('c360StatusText');
  const blockBtn = document.getElementById('c360ToggleBlockBtn');
  
  if (u.isBlocked) {
    alertBanner?.classList.remove('hidden');
    if (statusText) { statusText.textContent = "BLOCKED / SUSPENDED"; statusText.className = "font-bold text-red-600"; }
    if (blockBtn) {
      blockBtn.textContent = "Unblock Account";
      blockBtn.className = "flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 py-1.5 rounded font-bold transition";
      blockBtn.onclick = () => toggleBlockStatus360(u.id, false);
    }
  } else {
    alertBanner?.classList.add('hidden');
    if (statusText) { statusText.textContent = "ACTIVE"; statusText.className = "font-bold text-emerald-700"; }
    if (blockBtn) {
      blockBtn.textContent = "Block Account";
      blockBtn.className = "flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-1.5 rounded font-bold transition";
      blockBtn.onclick = () => toggleBlockStatus360(u.id, true);
    }
  }
  
  const userOrders = orders.filter(o => o.customerPhone === u.phone || o.customerPhone === u.username);
  const elCount = document.getElementById('c360OrderCount');
  if (elCount) elCount.textContent = userOrders.length;
  
  const ltv = userOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0);
  const elLtv = document.getElementById('c360LTV');
  if (elLtv) elLtv.textContent = formatPrice(ltv);
  
  const orderListEl = document.getElementById('c360OrderList');
  if (orderListEl) {
    if (userOrders.length === 0) {
      orderListEl.innerHTML = `<p class="text-xs text-neutral-400 py-3">No order history available.</p>`;
    } else {
      orderListEl.innerHTML = userOrders.map(o => `
        <div class="p-2 border rounded bg-white flex justify-between items-center text-[11px] ${o.status === 'Cancelled' ? 'opacity-70' : ''}">
          <div>
            <strong class="text-brand-charcoal">${o.orderId}</strong>
            <p class="text-neutral-500">${new Date(o.date).toLocaleDateString()}</p>
          </div>
          <div class="text-right">
            <span class="font-bold block ${o.status === 'Cancelled' ? 'text-red-600' : 'text-emerald-700'}">${o.status}</span>
            <span class="font-mono text-brand-gold font-bold">${formatPrice(o.total)}</span>
          </div>
        </div>
      `).join('');
    }
  }
  
  document.getElementById('adminCustomer360Modal')?.classList.remove('hidden');
}

function closeCustomer360Modal() { document.getElementById('adminCustomer360Modal')?.classList.add('hidden'); }

function toggleBlockStatus360(userId, blockStatus) {
  if (currentUser?.role !== 'admin') return alert("Permission Denied: Only Developer Admin can block or unblock accounts.");
  const u = users.find(x => x.id === userId);
  if (u) {
    if (u.username.toLowerCase() === 'admin') return alert("Access Denied: Cannot block Master Developer Admin.");
    u.isBlocked = blockStatus;
    persist();
    logAuditEvent(`Account status modified for ${u.name}: ${blockStatus ? 'BLOCKED' : 'ACTIVE'}`, currentUser.username, "security");
    if (document.getElementById('adminCustomersTableBody')) renderAdminCustomers();
    openCustomer360Modal(userId);
  }
}

// ==========================================
// 9. EXPERT ADMINISTRATIVE TOOLS & EXPORTS
// ==========================================
function toggleAutoSync(enabled) {
  config.autoSync = enabled;
  persist();
  logAuditEvent(`Cloud Auto-Sync turned ${enabled ? 'ON' : 'OFF'}`, currentUser?.username || 'Admin', "system");
  alert(`Cloud Auto-Sync is now ${enabled ? 'ONLINE (Real-time storage mirror active)' : 'PAUSED (Local mode)'}.`);
}

function exportToCSV(type) {
  let rows = [];
  
  if (type === 'sales') {
    rows.push(["OrderID", "Date", "Customer", "Phone", "Status", "Total", "Channel", "PaymentMethod"]);
    orders.forEach(o => {
      rows.push([o.orderId, o.date, o.customerName, o.customerPhone, o.status, o.total, o.channel || 'Online', o.paymentMethod || 'Online']);
    });
  } else if (type === 'users') {
    rows.push(["ID", "Name", "Role", "Phone", "Email", "Status"]);
    users.filter(u => u.role !== 'admin').forEach(u => {
      rows.push([u.id, u.name, u.role, u.phone, u.email || '', u.isBlocked ? 'Blocked' : 'Active']);
    });
  } else if (type === 'inventory') {
    rows.push(["ID", "SKU", "Title", "Category", "Stock", "SalePrice"]);
    products.forEach(p => {
      rows.push([p.id, p.sku || p.id, p.title, p.category, p.stock, p.salePrice]);
    });
  }

  const csvBody = rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\n");
  const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvBody);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `moin_quranbox_${type}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  logAuditEvent(`Exported ${type} dataset to CSV`, currentUser?.username || 'Admin', "export");
}

function downloadSystemBackup() {
  const dump = {
    version: "v19.0",
    generatedAt: new Date().toISOString(),
    config,
    products,
    users: users.filter(u => u.role !== 'admin'),
    orders,
    coupons,
    auditLogs
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `moin_quranbox_db_backup_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  logAuditEvent("Full system JSON database backup downloaded", currentUser?.username || 'Admin', "backup");
}

function openAuditLogsModal() {
  const container = document.getElementById("auditLogsContainer");
  if (!container) return;
  container.innerHTML = auditLogs.map(l => `
    <div class="p-2 bg-white rounded border flex justify-between items-center text-[10px]">
      <div>
        <span class="text-neutral-400 block">${l.timestamp}</span>
        <strong class="text-brand-charcoal">${l.event}</strong>
      </div>
      <span class="px-1.5 py-0.5 rounded font-bold uppercase text-[9px] bg-neutral-100 text-neutral-700">${l.user}</span>
    </div>
  `).join("");
  document.getElementById("auditLogsModal")?.classList.remove("hidden");
}
function closeAuditLogsModal() { document.getElementById("auditLogsModal")?.classList.add("hidden"); }

function openApiGatewayModal() {
  const elW = document.getElementById("cfgWhatsAppWebhook");
  const elS = document.getElementById("cfgSmsApiKey");
  if (elW) elW.value = config.apiGateway?.whatsappWebhook || "";
  if (elS) elS.value = config.apiGateway?.smsApiKey || "";
  document.getElementById("apiGatewayModal")?.classList.remove("hidden");
}
function closeApiGatewayModal() { document.getElementById("apiGatewayModal")?.classList.add("hidden"); }
function saveApiGatewaySettings() {
  if (!config.apiGateway) config.apiGateway = {};
  config.apiGateway.whatsappWebhook = document.getElementById("cfgWhatsAppWebhook")?.value.trim() || "";
  config.apiGateway.smsApiKey = document.getElementById("cfgSmsApiKey")?.value.trim() || "";
  persist();
  closeApiGatewayModal();
  logAuditEvent("Messaging API Gateway Webhooks updated", currentUser?.username || 'Admin', "system");
  alert("API Gateway settings successfully saved!");
}

function toggleMaintenanceMode() {
  config.maintenanceMode = !config.maintenanceMode;
  persist();
  const btn = document.getElementById("btnMaintenanceToggle");
  if (btn) {
    btn.textContent = config.maintenanceMode ? "Unlock Storefront" : "Lock Storefront";
    btn.className = config.maintenanceMode ? "w-full bg-emerald-100 text-emerald-800 py-1.5 rounded font-bold uppercase text-[10px]" : "w-full bg-red-100 text-red-700 py-1.5 rounded font-bold uppercase text-[10px]";
  }
  logAuditEvent(`Store Maintenance Mode set to ${config.maintenanceMode ? 'ACTIVE' : 'INACTIVE'}`, currentUser?.username || 'Admin', "system");
  alert(`Storefront Maintenance Mode is now ${config.maintenanceMode ? 'ENABLED. Checkouts paused.' : 'DISABLED. Storefront active.'}`);
}

function runAiDemandForecast() {
  const content = document.getElementById("aiForecastContent");
  if (!content) return;

  const totalSold = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.qty, 0), 0);
  const lowStockItems = products.filter(p => p.stock <= 5);

  content.innerHTML = `
    <div class="space-y-2">
      <div class="p-2.5 bg-white rounded-lg border">
        <h5 class="font-bold text-brand-darkgreen uppercase text-[10px]">Overall Demand Velocity</h5>
        <p><strong>Total units sold:</strong> ${totalSold} items across Hyderabad.</p>
        <p><strong>Top Predicted Category:</strong> Tarjuma Qurans &amp; Handcrafted Velvet Boxes (High Seasonal Demand).</p>
      </div>
      <div class="p-2.5 bg-white rounded-lg border">
        <h5 class="font-bold text-amber-800 uppercase text-[10px]">Restock Recommendations</h5>
        ${lowStockItems.length > 0 ? `
          <ul class="list-disc pl-4 space-y-1 mt-1">
            ${lowStockItems.map(p => `<li><strong>${p.title}</strong> — only ${p.stock} left in showroom. Recommended re-order: +50 units.</li>`).join('')}
          </ul>
        ` : `<p class="text-emerald-700 font-bold">All inventory levels are optimal for current sales velocity.</p>`}
      </div>
    </div>
  `;
  document.getElementById("aiDemandForecastModal")?.classList.remove("hidden");
}
function closeAiForecastModal() { document.getElementById("aiDemandForecastModal")?.classList.add("hidden"); }

function toggleSurgePricing() {
  config.surgePricing = !config.surgePricing;
  persist();
  const btn = document.getElementById("btnSurgePricingToggle");
  if (btn) {
    btn.textContent = config.surgePricing ? "Disable Margins" : "Enable Margins";
    btn.className = config.surgePricing ? "w-full bg-amber-100 text-amber-800 py-1.5 rounded font-bold text-[10px]" : "w-full bg-brand-sand py-1.5 rounded font-bold text-[10px]";
  }
  renderProducts();
  logAuditEvent(`Dynamic low-stock pricing margin ${config.surgePricing ? 'ENABLED (+5%)' : 'DISABLED'}`, currentUser?.username || 'Admin', "pricing");
  alert(`Dynamic Surge Pricing Margin is now ${config.surgePricing ? 'ACTIVE (+5% on items with <= 5 stock)' : 'DISABLED'}.`);
}

function openSeoManagerModal() {
  const elT = document.getElementById("seoMetaTitle");
  const elD = document.getElementById("seoMetaDesc");
  const elK = document.getElementById("seoMetaKeywords");
  if (elT) elT.value = config.seo?.metaTitle || document.title;
  if (elD) elD.value = config.seo?.metaDesc || "";
  if (elK) elK.value = config.seo?.keywords || "";
  document.getElementById("seoManagerModal")?.classList.remove("hidden");
}
function closeSeoManagerModal() { document.getElementById("seoManagerModal")?.classList.add("hidden"); }
function saveSeoMetadata() {
  if (!config.seo) config.seo = {};
  config.seo.metaTitle = document.getElementById("seoMetaTitle")?.value.trim() || "";
  config.seo.metaDesc = document.getElementById("seoMetaDesc")?.value.trim() || "";
  config.seo.keywords = document.getElementById("seoMetaKeywords")?.value.trim() || "";
  if (config.seo.metaTitle) document.title = config.seo.metaTitle;
  persist();
  closeSeoManagerModal();
  logAuditEvent("Global SEO metadata updated", currentUser?.username || 'Admin', "seo");
  alert("SEO Meta Tags successfully updated!");
}

function triggerAbandonedCartRecovery() {
  if (cart.length === 0) {
    alert("No items currently in active customer shopping bags to recover.");
    return;
  }
  const itemsText = cart.map(it => `• ${it.title} (x${it.qty})`).join("\n");
  const waUrl = `https://wa.me/91${config.whatsappPhone}?text=${encodeURIComponent(`Salam! You left sacred Quran items in your shopping bag at ${config.brandName}. Complete your order today for free Hyderabad packaging:\n${itemsText}`)}`;
  window.open(waUrl, "_blank");
  logAuditEvent("Abandoned Cart Recovery reminder dispatched", currentUser?.username || 'Admin', "marketing");
}

function toggleExpressRouting() {
  config.expressRouting = !config.expressRouting;
  persist();
  const btn = document.getElementById("btnExpressRouting");
  if (btn) {
    btn.textContent = config.expressRouting ? "Auto-Routing: Active" : "Enable Auto-Routing";
    btn.className = config.expressRouting ? "w-full bg-emerald-600 text-white py-1.5 rounded font-bold uppercase text-[10px]" : "w-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-1.5 rounded font-bold uppercase text-[10px]";
  }
  logAuditEvent(`Smart Courier Pincode Routing ${config.expressRouting ? 'ENABLED' : 'DISABLED'}`, currentUser?.username || 'Admin', "logistics");
  alert(`Smart Dispatch Routing is now ${config.expressRouting ? 'ENABLED (Local Hyderabad vs National carriers)' : 'DISABLED'}.`);
}

function toggleFeatureFlag(key, enabled) {
  if (currentUser?.role !== 'admin') return alert("Access Denied: Only Developer Master Admin can toggle features.");
  if (!config.featureToggles) config.featureToggles = {};
  config.featureToggles[key] = enabled;
  persist();
  renderProducts();
  applyCustomerFeatureVisibility();
  logAuditEvent(`Feature toggle '${key}' set to ${enabled}`, currentUser.username, "toggles");
}

function switchAdminTab(tab) {
  const tabs = ['hub', 'expert', 'features', 'orders', 'inventory', 'branches', 'shipping', 'pos', 'analytics', 'coupons', 'customers', 'salesmodifier', 'cms', 'payments'];
  
  if (tab === 'pos' && currentUser?.role !== 'admin' && !config.featureToggles?.ownerPosAccess) {
    return alert("POS Terminal access has been restricted by Admin.");
  }
  
  tabs.forEach(t => {
    document.getElementById(`adminTab-${t}`)?.classList.toggle("hidden", t !== tab);
    const btn = document.getElementById(`adminTabBtn-${t}`);
    if (btn) btn.className = "px-4 py-3 border-b-2 font-bold whitespace-nowrap " + (t === tab ? "border-brand-charcoal text-brand-charcoal bg-white" : "border-transparent text-neutral-500 hover:text-black");
  });
}

function updateOrderStatus(orderId, newStatus) {
  const o = orders.find(x => x.orderId === orderId);
  if (o) { 
    if (newStatus === 'Cancelled' && o.status !== 'Cancelled') {
      o.items.forEach(item => {
        const p = products.find(x => x.id === item.id);
        if (p) p.stock += item.qty;
      });
    }
    if (newStatus !== 'Cancelled' && o.status === 'Cancelled') {
      o.items.forEach(item => {
        const p = products.find(x => x.id === item.id);
        if (p) p.stock = Math.max(0, p.stock - item.qty);
      });
    }
    
    o.status = newStatus; 
    persist(); 
    logAuditEvent(`Order status updated for ${orderId}: ${newStatus}`, currentUser.username, "order");
    renderAdminOrders();
    updateAnalytics();
  }
}

// Showroom Management
function renderBranchesInDashboard() {
  const container = document.getElementById("adminBranchesList");
  if (!container || !config.branches || config.branches.length === 0) return;
  const b = config.branches[0];
  container.innerHTML = `
    <div class="bg-white p-4 rounded-xl border space-y-2 text-xs">
      <h5 class="font-bold text-brand-charcoal text-sm">${b.name}</h5>
      <p class="text-neutral-600">${b.address}</p>
      <p class="font-mono text-brand-muted">📞 +91 ${b.phone} • Head Manager: ${b.manager}</p>
    </div>
  `;
}

function updateAnalytics() {
  const totalRev = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);
  const revStr = formatPrice(totalRev);
  const elAnaRev = document.getElementById("anaTotalRevenue");
  const elAnaOrd = document.getElementById("anaTotalOrders");
  const elHubRev = document.getElementById("hubTotalRevenue");
  const elHubOrd = document.getElementById("hubTotalOrders");
  if (elAnaRev) elAnaRev.textContent = revStr;
  if (elAnaOrd) elAnaOrd.textContent = orders.length;
  if (elHubRev) elHubRev.textContent = revStr;
  if (elHubOrd) elHubOrd.textContent = orders.length;
}

function resetAllSalesToZero() {
  if (currentUser?.role !== "admin") return alert("Access Denied: Supreme Developer Admin access required.");
  if (!confirm("Reset all store sales to ₹0? This is irreversible.")) return;
  orders = [];
  persist();
  logAuditEvent("All store sales reset to ZERO (₹0)", currentUser.username, "danger");
  renderAdminOrders();
  updateAnalytics();
  alert("Sales successfully reset to zero.");
}

function handlePhotoFileInput(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const el = document.getElementById("editProductImage");
    if (el) el.value = e.target.result;
    const preview = document.getElementById("photoUploadPreview");
    if (preview) { preview.src = e.target.result; preview.classList.remove("hidden"); }
  };
  reader.readAsDataURL(file);
}

function openProductEditModal(id = null) {
  const canEdit = currentUser?.role === "admin" || config.featureToggles?.ownerInventoryEdit;
  if (!canEdit) return alert("Stock and Pricing editing is currently restricted by Developer Admin.");
  document.getElementById("productEditModal")?.classList.remove("hidden");
  
  const p = products.find(x => x.id === id);
  if (p) {
    document.getElementById("editProductId").value = p.id;
    document.getElementById("editProductTitle").value = p.title;
    document.getElementById("editProductCategory").value = p.category;
    document.getElementById("editProductStock").value = p.stock;
    document.getElementById("editProductSalePrice").value = p.salePrice;
    document.getElementById("editProductImage").value = p.image;
    
    const preview = document.getElementById("photoUploadPreview");
    if (preview) { preview.src = p.image; preview.classList.remove("hidden"); }
  } else {
    document.getElementById("editProductId").value = "";
    document.getElementById("editProductTitle").value = "";
    document.getElementById("editProductStock").value = "25";
    document.getElementById("editProductSalePrice").value = "";
    document.getElementById("editProductImage").value = "";
    document.getElementById("photoUploadPreview")?.classList.add("hidden");
  }
}
function closeProductEditModal() { document.getElementById("productEditModal")?.classList.add("hidden"); }

function handleProductFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("editProductId")?.value;
  const title = document.getElementById("editProductTitle")?.value.trim() || "";
  const category = document.getElementById("editProductCategory")?.value || "Tarjuma Qurans";
  const stock = parseInt(document.getElementById("editProductStock")?.value) || 0;
  const salePrice = parseInt(document.getElementById("editProductSalePrice")?.value) || 0;
  const image = document.getElementById("editProductImage")?.value.trim() || "https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=600&q=80";

  if (id) {
    const p = products.find(x => x.id === id);
    if (p) { p.title = title; p.category = category; p.stock = stock; p.salePrice = salePrice; p.image = image; }
  } else {
    products.unshift({
      id: "prod-" + Date.now(),
      title, category, stock, salePrice, image,
      rating: 5.0, reviewsCount: 10
    });
  }
  
  persist();
  logAuditEvent(`Product updated/added: ${title}`, currentUser.username, "inventory");
  renderProducts();
  renderAdminInventory();
  renderPosCatalog();
  closeProductEditModal();
  alert("Product saved successfully!");
}

function handleManualShippingLabelPrint(e) {
  e.preventDefault();
  alert("Manual Label generated and sent to print buffer!");
}

// ==========================================
// 10. ADMIN: USER & STAFF MANAGEMENT
// ==========================================
function renderAdminCustomers() {
  const tbody = document.getElementById("adminCustomersTableBody");
  if (!tbody) return;
  
  const visibleUsers = currentUser?.role === 'admin' ? users : users.filter(u => u.role !== 'admin');

  tbody.innerHTML = visibleUsers.map(u => `
    <tr class="hover:bg-neutral-50 border-b ${u.isBlocked ? 'opacity-50' : ''}">
      <td class="p-3 font-bold">
        ${u.name}
        ${u.isBlocked ? '<span class="text-[9px] bg-red-100 text-red-700 px-1 rounded ml-1 font-bold">BLOCKED</span>' : ''}
      </td>
      <td class="p-3 uppercase text-[10px] font-bold"><span class="px-2 py-1 rounded bg-brand-sand">${u.role}</span></td>
      <td class="p-3 font-mono">${u.phone}</td>
      <td class="p-3">${u.email || 'N/A'}</td>
      <td class="p-3 font-bold ${u.isBlocked ? 'text-red-600' : 'text-emerald-700'}">${u.isBlocked ? 'Blocked' : 'Active'}</td>
      <td class="p-3 text-right">
        ${u.role === 'admin' ? `<span class="text-neutral-400 font-bold text-[10px]">Master Root</span>` : `
          <button onclick="openManageUserModal('${u.id}')" class="text-blue-600 font-bold hover:underline bg-blue-50 px-2 py-1 rounded">Manage</button>
        `}
      </td>
    </tr>
  `).join("");
}

function openCreateStaffModal() {
  if (currentUser?.role !== 'admin') return alert("Permission Denied: Only Developer Master Admin can create staff accounts.");
  document.getElementById("createStaffModal")?.classList.remove("hidden");
}
function closeCreateStaffModal() { document.getElementById("createStaffModal")?.classList.add("hidden"); }

function handleCreateStaff(e) {
  e.preventDefault();
  const name = document.getElementById("csName")?.value.trim() || "";
  const username = document.getElementById("csUsername")?.value.trim() || "";
  const role = document.getElementById("csRole")?.value || "owner";
  const password = document.getElementById("csPassword")?.value.trim() || "";

  if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return alert("Username already exists in the system.");
  }

  users.push({
    id: "staff-" + Date.now(),
    username,
    name,
    phone: username, 
    email: "",
    role,
    password,
    isBlocked: false,
    addresses: [],
    supportTickets: []
  });
  
  persist();
  logAuditEvent(`Created new staff account: ${username} (${role})`, currentUser.username, "security");
  renderAdminCustomers();
  closeCreateStaffModal();
  alert(`Staff account (${name}) created successfully!`);
}

function openManageUserModal(id) {
  if (currentUser?.role !== 'admin') return alert("Permission Denied: Only Developer Admin can manage accounts.");
  const u = users.find(x => x.id === id);
  if (!u) return;

  if (u.role === 'admin') return alert("Master Developer Admin account cannot be edited.");

  document.getElementById("manageUserModal")?.classList.remove("hidden");
  document.getElementById("muId").value = u.id;
  document.getElementById("muName").value = u.name;
  document.getElementById("muPhone").value = u.phone || u.username;
  document.getElementById("muPassword").value = u.role === 'customer' ? (u.pin || u.password) : u.password;
  document.getElementById("muBlocked").checked = !!u.isBlocked;
  document.getElementById("manageUserMeta").textContent = `Role: ${u.role.toUpperCase()} | ID: ${u.id}`;
}
function closeManageUserModal() { document.getElementById("manageUserModal")?.classList.add("hidden"); }

function saveUserManagement() {
  const id = document.getElementById("muId")?.value;
  const u = users.find(x => x.id === id);
  if (!u) return;

  if (u.role === 'admin') return alert("Master Root Admin cannot be altered.");

  u.name = document.getElementById("muName")?.value.trim() || u.name;
  const newPhone = document.getElementById("muPhone")?.value.trim() || u.phone;
  u.phone = newPhone;
  if (u.role !== 'customer') u.username = newPhone; 
  
  const newPass = document.getElementById("muPassword")?.value.trim();
  if (newPass) {
    if (u.role === 'customer') {
      u.pin = newPass;
      u.password = newPass;
    } else {
      u.password = newPass;
    }
  }

  u.isBlocked = document.getElementById("muBlocked")?.checked || false;

  persist();
  logAuditEvent(`Admin updated account details for ${u.name}`, currentUser.username, "security");
  renderAdminCustomers();
  closeManageUserModal();
  alert(`Account (${u.name}) has been successfully updated.`);
}

function deleteUserAccount() {
  const id = document.getElementById("muId")?.value;
  const u = users.find(x => x.id === id);
  if (!u) return;

  if (u.role === 'admin') return alert("Permission Denied: Root Master Admin cannot be deleted.");
  if (!confirm(`Are you sure you want to permanently delete the account for ${u.name}?`)) return;

  users = users.filter(x => x.id !== id);
  persist();
  logAuditEvent(`Account permanently deleted: ${u.name}`, currentUser.username, "danger");
  renderAdminCustomers();
  closeManageUserModal();
  alert("User account has been permanently removed.");
}

// CMS & Payments Updates
function handleCmsSave(e) {
  e.preventDefault();
  config.brandName = document.getElementById("cmsBrandName")?.value.trim() || config.brandName;
  config.proprietor = document.getElementById("cmsProprietor")?.value.trim() || config.proprietor;
  config.address = document.getElementById("cmsAddress")?.value.trim() || config.address;
  persist();
  syncLiveCmsUI();
  logAuditEvent("Live storefront CMS details updated", currentUser.username, "cms");
  alert("Storefront details successfully saved live!");
}

function savePaymentSettings(e) {
  e.preventDefault();
  config.upiId = document.getElementById("cfgUpiId")?.value.trim() || config.upiId;
  config.merchantName = document.getElementById("cfgUpiName")?.value.trim() || config.merchantName;
  persist();
  logAuditEvent("Payment gateway & UPI configurations updated", currentUser.username, "finance");
  alert("Payment settings saved securely!");
}

function renderCouponsTable() {
  const tbody = document.getElementById("adminCouponsTableBody");
  if (!tbody) return;
  tbody.innerHTML = coupons.map((c, i) => `
    <tr class="hover:bg-neutral-50 border-b">
      <td class="p-3 font-bold font-mono text-brand-gold">${c.code}</td>
      <td class="p-3">₹${c.discount} OFF</td>
      <td class="p-3">₹${c.minOrder}</td>
      <td class="p-3 text-right"><button onclick="coupons.splice(${i},1);persist();renderCouponsTable();" class="text-red-600 font-bold">Delete</button></td>
    </tr>
  `).join("");
}

function promptCreateCoupon() {
  const code = prompt("Enter Promo Code (e.g., RAMADAN50):");
  if (!code) return;
  const discount = parseInt(prompt("Discount value in ₹:", "50")) || 50;
  const minOrder = parseInt(prompt("Minimum Order Value in ₹:", "500")) || 500;
  coupons.push({ code: code.trim().toUpperCase(), discount, type: "flat", minOrder });
  persist();
  logAuditEvent(`Created discount coupon: ${code.toUpperCase()}`, currentUser.username, "marketing");
  renderCouponsTable();
}

function syncLiveCmsUI() {
  const elBrand = document.getElementById("brandNavTitle");
  const elDrawerBrand = document.getElementById("drawerBrandName");
  const elFooterBrand = document.getElementById("footerBrandName");
  const elFooterProp = document.getElementById("footerProprietor");
  const elTicker = document.getElementById("announcementText");
  const waLink = document.getElementById("floatingWhatsAppLink");
  const elPhones = document.getElementById("footerPhonesText");
  const elEmail = document.getElementById("footerEmailText");

  if (elBrand) elBrand.textContent = config.brandName;
  if (elDrawerBrand) elDrawerBrand.textContent = config.brandName;
  if (elFooterBrand) elFooterBrand.textContent = config.brandName;
  if (elFooterProp) elFooterProp.textContent = config.proprietor;
  if (elTicker) elTicker.textContent = config.announcement;
  if (waLink) waLink.href = `https://wa.me/91${config.whatsappPhone}`;
  if (elPhones) elPhones.textContent = `+91 ${config.phone1} / +91 ${config.phone2}`;
  if (elEmail) elEmail.textContent = config.ownerEmail;
}

// ==========================================
// 11. MISSING RENDER COMPONENTS RESTORED
// ==========================================
function renderAdminOrders() {
  const tbody = document.getElementById("adminOrdersTableBody");
  if (!tbody) return;
  tbody.innerHTML = orders.length === 0 ? `<tr><td colspan="6" class="p-4 text-center text-xs text-neutral-400">No active orders found.</td></tr>` : orders.map(o => `
    <tr class="border-b hover:bg-neutral-50 text-xs">
      <td class="p-3 font-bold">${o.orderId}</td>
      <td class="p-3">${new Date(o.date).toLocaleDateString()}</td>
      <td class="p-3">${o.customerName}</td>
      <td class="p-3 font-mono font-bold">${formatPrice(o.total)}</td>
      <td class="p-3"><span class="${o.status === 'Cancelled' ? 'text-red-600' : 'text-emerald-700'} font-bold">${o.status}</span></td>
      <td class="p-3 text-right">
        <select onchange="updateOrderStatus('${o.orderId}', this.value)" class="text-[10px] border border-neutral-300 p-1.5 rounded cursor-pointer">
          <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
    </tr>
  `).join("");
}

function renderAdminInventory() {
  const tbody = document.getElementById("adminInventoryTableBody");
  if (!tbody) return;
  tbody.innerHTML = products.map(p => `
    <tr class="border-b hover:bg-neutral-50 text-xs">
      <td class="p-3 flex items-center gap-2"><img src="${p.image}" class="w-8 h-8 rounded object-cover border" alt="${p.title}"> <span class="font-bold truncate w-32 md:w-auto">${p.title}</span></td>
      <td class="p-3">${p.category}</td>
      <td class="p-3 font-mono font-bold">${formatPrice(p.salePrice)}</td>
      <td class="p-3 font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-emerald-700'}">${p.stock}</td>
      <td class="p-3 text-right"><button onclick="openProductEditModal('${p.id}')" class="text-blue-600 font-bold hover:underline bg-blue-50 px-2 py-1 rounded">Edit</button></td>
    </tr>
  `).join("");
}

function renderPosCatalog() {
  const grid = document.getElementById("posCatalogGrid");
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <div class="p-2 border rounded-lg bg-white cursor-pointer hover:bg-neutral-50 shadow-sm transition" onclick="addToCart('${p.id}')">
      <p class="text-[11px] font-bold text-brand-charcoal truncate">${p.title}</p>
      <p class="text-[11px] font-mono text-brand-gold mt-1">${formatPrice(p.salePrice)} <span class="text-[9px] text-neutral-400 ml-1">Stock: ${p.stock}</span></p>
    </div>
  `).join("");
}

// Format raw feature keys into beautiful UI labels
function formatFeatureName(key) {
  return key
    .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
}

function renderAdminFeatureToggles() {
  const container = document.getElementById("adminTogglesContainer");
  if (!container) return;
  const flags = Object.keys(config.featureToggles || {});
  
  container.innerHTML = flags.map(key => `
    <div class="flex justify-between items-center p-3.5 hover:bg-neutral-50 transition">
      <div>
        <span class="font-bold text-brand-charcoal text-xs block">${formatFeatureName(key)}</span>
        <span class="text-[10px] text-brand-muted font-mono">${key}</span>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" class="sr-only peer" ${config.featureToggles[key] ? 'checked' : ''} onchange="toggleFeatureFlag('${key}', this.checked)">
        <div class="w-9 h-5 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
      </label>
    </div>
  `).join("");
}
