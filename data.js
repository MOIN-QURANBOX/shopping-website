/* ===============================================================
   MOIN QURAN BOX - MASTER SEED DATA & INITIAL CONFIGURATION
   =============================================================== */

window.MQB_DEFAULTS = {
  config: {
    brandName: "MOIN QURAN BOX",
    urduSubtitle: "معین قرآن باکس",
    proprietor: "Shaik Moin Uddin",
    address: "Madina Colony, Falaknuma, Hyderabad, Telangana 500053",
    phone1: "9390335673",
    phone2: "8142140905",
    whatsappPhone: "9390335673",
    ownerEmail: "moinquranbox@gmail.com",
    gst: "TEL-HYD-500053",
    announcement: "Holy Quran Direct Manufacturer • Free Packaging Across Hyderabad • COD & Instant UPI Available",
    heroHeadline: "Preserving The Divine Word With Sacred Grace",
    upiId: "9390335673@ybl",
    merchantName: "MOIN QURAN BOX",
    bankName: "State Bank of India",
    accountNum: "392810482910",
    ifsc: "SBIN0020145"
  },

  flags: {
    enableCod: true,
    enableReviews: true,
    enableInternational: true,
    enableRamadanMode: false
  },

  categories: [
    "All",
    "Bestsellers",
    "Essentials",
    "Tarjuma Qurans",
    "Hajj & Umrah",
    "Quran Boxes & Rehal",
    "Janamaz",
    "Namaz Caps & Tasbih"
  ],

  products: [
    {
      id: "prod-101",
      title: "Holy Quran – Urdu translation in ROMAN Script",
      category: "Tarjuma Qurans",
      sku: "MQB-QUR-01",
      stock: 35,
      salePrice: 999,
      oldPrice: 1599,
      wholesalePrice: 750,
      rating: 5.0,
      reviewsCount: 28,
      isBestseller: true,
      image: "https://images.unsplash.com/photo-1584286595398-a59f21d313f5?auto=format&fit=crop&w=600&q=80",
      desc: "Authentic Roman script transliteration with clear Urdu translation."
    },
    {
      id: "prod-102",
      title: "Royal Handcrafted Carved Velvet Wooden Quran Box",
      category: "Quran Boxes & Rehal",
      sku: "MQB-BOX-02",
      stock: 25,
      salePrice: 1299,
      oldPrice: 1899,
      wholesalePrice: 950,
      rating: 4.9,
      reviewsCount: 42,
      isBestseller: true,
      image: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=600&q=80",
      desc: "Premium velvet-lined wooden box with golden acrylic Islamic calligraphy."
    },
    {
      id: "prod-103",
      title: "Turkish Velvet Cushioned Janamaz (Prayer Mat)",
      category: "Janamaz",
      sku: "MQB-JAN-03",
      stock: 45,
      salePrice: 799,
      oldPrice: 1299,
      wholesalePrice: 580,
      rating: 4.8,
      reviewsCount: 35,
      isBestseller: true,
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80",
      desc: "Extra soft orthopedic memory-foam lined Turkish prayer carpet."
    },
    {
      id: "prod-104",
      title: "Sheesham Wood Folding Rehal Stand with Brass Inlay",
      category: "Quran Boxes & Rehal",
      sku: "MQB-REH-04",
      stock: 60,
      salePrice: 549,
      oldPrice: 899,
      wholesalePrice: 400,
      rating: 4.9,
      reviewsCount: 19,
      isBestseller: false,
      image: "https://images.unsplash.com/photo-1590076215667-873d31295988?auto=format&fit=crop&w=600&q=80",
      desc: "Ergonomic eye-level wooden Quran stand handcrafted by artisans."
    },
    {
      id: "prod-105",
      title: "Umrah & Hajj Pocket Dua Cards Set with Lanyard",
      category: "Hajj & Umrah",
      sku: "MQB-HAJ-05",
      stock: 80,
      salePrice: 449,
      oldPrice: 799,
      wholesalePrice: 300,
      rating: 5.0,
      reviewsCount: 24,
      isBestseller: true,
      image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=600&q=80",
      desc: "Water-resistant step-by-step Tawaf and Sa'i supplication cards."
    },
    {
      id: "prod-106",
      title: "99-Bead Crystal Tasbih & Embroidered Barkati Cap Combo",
      category: "Namaz Caps & Tasbih",
      sku: "MQB-TAS-06",
      stock: 100,
      salePrice: 299,
      oldPrice: 499,
      wholesalePrice: 180,
      rating: 4.7,
      reviewsCount: 31,
      isBestseller: false,
      image: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=600&q=80",
      desc: "Gift pack featuring a 99-bead crystal tasbih and premium prayer cap."
    }
  ],

  users: [
    {
      id: "usr-admin",
      username: "9290",
      password: "9290",
      pin: "9290",
      name: "Developer Admin",
      phone: "9290",
      email: "admin@moinquranbox.com",
      role: "admin",
      faceData: null
    },
    {
      id: "usr-owner",
      username: "owner",
      password: "1234",
      pin: "1234",
      name: "Shaik Moin Uddin",
      phone: "9390335673",
      email: "moinquranbox@gmail.com",
      role: "owner",
      faceData: null
    }
  ],

  orders: [
    {
      orderId: "MQB-2026-1082",
      customerName: "Shaik Naveed",
      customerPhone: "9390335673",
      customerEmail: "naveed@example.com",
      address: "Near Charminar, Old City, Hyderabad, 500002",
      total: 1299,
      date: "2026-10-27T10:30:00.000Z",
      status: "Dispatched",
      courierName: "DTDC Express",
      awb: "DTDC-HYD-849102",
      trackingUrl: "https://www.dtdc.in/tracking/shipment-tracking.asp",
      paymentMethod: "UPI",
      channel: "Online",
      items: [
        { id: "prod-102", title: "Royal Handcrafted Carved Velvet Wooden Quran Box", qty: 1, salePrice: 1299 }
      ]
    },
    {
      orderId: "MQB-2026-1085",
      customerName: "Mohammed Rizwan",
      customerPhone: "9876543210",
      customerEmail: "rizwan@gmail.com",
      address: "Tolichowki, Hyderabad, 500008",
      total: 999,
      date: "2026-10-27T14:15:00.000Z",
      status: "Processing",
      courierName: "Porter (Hyderabad Local)",
      awb: "PENDING-AWB",
      trackingUrl: "",
      paymentMethod: "COD",
      channel: "Online",
      items: [
        { id: "prod-101", title: "Holy Quran – Urdu translation in ROMAN Script", qty: 1, salePrice: 999 }
      ]
    }
  ],

  coupons: [
    { code: "RAMADAN50", type: "flat", value: 50, minOrder: 500, active: true },
    { code: "BARAKAH10", type: "percent", value: 10, minOrder: 999, active: true },
    { code: "HYDERABAD", type: "flat", value: 100, minOrder: 1200, active: true }
  ]
};
