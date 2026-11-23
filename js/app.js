"use strict";

const appRoot = document.getElementById("appRoot");
const globalLoader = document.getElementById("globalLoader");
const cartBadge = document.getElementById("cartBadge");
const wishlistBadge = document.getElementById("wishlistBadge");
const navUserName = document.getElementById("navUserName");

const state = {
  token: localStorage.getItem("freshcart_token") || "",
  user: JSON.parse(localStorage.getItem("freshcart_user") || "null"),
  wishlistIds: new Set(),
  cartCount: 0,
  cartId: null,
};

function showLoader(show) {
  globalLoader.classList.toggle("d-none", !show);
}

function toast(icon, title) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });
}

function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function getUserId() {
  const payload = decodeJwtPayload(state.token);
  return payload?.id || null;
}

function syncAuthUI() {
  const isLoggedIn = Boolean(state.token);
  document.querySelectorAll(".auth-only").forEach((el) => el.classList.toggle("d-none", !isLoggedIn));
  document.querySelectorAll(".guest-only").forEach((el) => el.classList.toggle("d-none", isLoggedIn));
  if (navUserName && state.user?.name) {
    navUserName.textContent = state.user.name.split(" ")[0];
  }
}

async function refreshCounters() {
  if (!state.token) {
    state.cartCount = 0;
    state.wishlistIds.clear();
    cartBadge.textContent = "0";
    wishlistBadge.textContent = "0";
    return;
  }
  try {
    const [cartRes, wishRes] = await Promise.allSettled([API.getCart(), API.getWishlist()]);
    if (cartRes.status === "fulfilled") {
      state.cartCount = cartRes.value.numOfCartItems || 0;
      state.cartId = cartRes.value.cartId || cartRes.value.data?._id || null;
      cartBadge.textContent = String(state.cartCount);
    }
    if (wishRes.status === "fulfilled") {
      const items = wishRes.value.data || [];
      state.wishlistIds = new Set(items.map((p) => p._id || p.id));
      wishlistBadge.textContent = String(state.wishlistIds.size);
    }
  } catch {
    // ignore background badge errors
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function productCardHTML(p) {
  const id = p._id || p.id;
  const inWish = state.wishlistIds.has(id);
  const priceHtml = p.priceAfterDiscount
    ? `<span class="fw-bold text-dark">${p.priceAfterDiscount} EGP</span> <small class="text-decoration-line-through text-muted">${p.price}</small>`
    : `<span class="fw-bold text-dark">${p.price} EGP</span>`;

  return `
    <div class="col-12 col-sm-6 col-md-4 col-lg-3">
      <div class="product-card">
        <button
          type="button"
          class="wishlist-heart-btn ${inWish ? "active" : ""}"
          data-wishlist-toggle="${id}"
          title="Toggle Wishlist"
        >
          <i class="fa-${inWish ? "solid" : "regular"} fa-heart"></i>
        </button>

        <a href="#/product/${id}" class="text-decoration-none text-dark">
          <img src="${escapeHtml(p.imageCover)}" alt="${escapeHtml(p.title)}" class="product-img" loading="lazy" />
          <div class="small text-fresh fw-semibold mb-1">${escapeHtml(p.category?.name || "")}</div>
          <h6 class="fw-bold text-truncate mb-2" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h6>
        </a>

        <div class="d-flex justify-content-between align-items-center mt-auto mb-3 small">
          <div>${priceHtml}</div>
          <div>
            <i class="fa-solid fa-star rating-star"></i>
            <span>${p.ratingsAverage ?? 0}</span>
          </div>
        </div>

        <button type="button" class="btn btn-fresh btn-sm w-100 btn-add-cart" data-add-cart="${id}">
          <i class="fa-solid fa-plus me-1"></i> Add to Cart
        </button>
      </div>
    </div>
  `;
}

// ================= PAGE RENDERERS =================

async function renderHome() {
  showLoader(true);
  try {
    const [catRes, prodRes] = await Promise.all([API.getCategories(), API.getProducts("limit=12")]);
    const categories = catRes.data || [];
    const products = prodRes.data || [];

    appRoot.innerHTML = `
      <div class="container">
        <!-- Hero Grid -->
        <div class="row g-3 mb-5">
          <div class="col-lg-8">
            <div id="heroCarousel" class="carousel slide" data-bs-ride="carousel">
              <div class="carousel-inner rounded-4 overflow-hidden">
                <div class="carousel-item active">
                  <div class="hero-slide-box">
                    <span class="badge bg-warning text-dark align-self-start mb-3">Fresh Deals</span>
                    <h1 class="fw-bold mb-2">Fresh Groceries &amp; Daily Essentials</h1>
                    <p class="mb-4 opacity-75">Delivered straight to your door with fast shipping and best prices.</p>
                    <div><a href="#/products" class="btn btn-light fw-bold text-fresh px-4">Shop Now</a></div>
                  </div>
                </div>
                <div class="carousel-item">
                  <div class="hero-slide-box hero-slide-2">
                    <span class="badge bg-light text-dark align-self-start mb-3">Top Brands</span>
                    <h1 class="fw-bold mb-2">Explore Fashion &amp; Electronics</h1>
                    <p class="mb-4 opacity-75">Curated collections from verified global brands.</p>
                    <div><a href="#/brands" class="btn btn-light fw-bold text-dark px-4">Browse Brands</a></div>
                  </div>
                </div>
                <div class="carousel-item">
                  <div class="hero-slide-box hero-slide-3">
                    <span class="badge bg-success align-self-start mb-3">Weekend Offer</span>
                    <h1 class="fw-bold mb-2">Up to 30% Off Selected Categories</h1>
                    <p class="mb-4 opacity-75">Cash on delivery or secure online checkout available.</p>
                    <div><a href="#/categories" class="btn btn-light fw-bold text-fresh px-4">View Categories</a></div>
                  </div>
                </div>
              </div>
              <button class="carousel-control-prev" type="button" data-bs-target="#heroCarousel" data-bs-slide="prev">
                <span class="carousel-control-prev-icon"></span>
              </button>
              <button class="carousel-control-next" type="button" data-bs-target="#heroCarousel" data-bs-slide="next">
                <span class="carousel-control-next-icon"></span>
              </button>
            </div>
          </div>
          <div class="col-lg-4 d-flex flex-column gap-3">
            <div class="side-promo-card">
              <span class="text-fresh fw-bold small mb-1">NEW ARRIVALS</span>
              <h5 class="fw-bold mb-1">Smart Electronics</h5>
              <a href="#/products" class="text-decoration-none text-fresh fw-semibold small">Explore <i class="fa-solid fa-arrow-right ms-1"></i></a>
            </div>
            <div class="side-promo-card">
              <span class="text-fresh fw-bold small mb-1">TRENDING</span>
              <h5 class="fw-bold mb-1">Men &amp; Women Fashion</h5>
              <a href="#/categories" class="text-decoration-none text-fresh fw-semibold small">Shop Categories <i class="fa-solid fa-arrow-right ms-1"></i></a>
            </div>
          </div>
        </div>

        <!-- Shop Popular Categories -->
        <section class="mb-5">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="fw-bold mb-0">Shop Popular Categories</h4>
            <a href="#/categories" class="text-fresh text-decoration-none fw-semibold small">View All</a>
          </div>
          <div class="category-strip">
            ${categories
              .map(
                (c) => `
              <a href="#/category/${c._id}" class="category-mini-card">
                <img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}" loading="lazy" />
                <div class="p-2 text-center fw-semibold small text-truncate">${escapeHtml(c.name)}</div>
              </a>
            `
              )
              .join("")}
          </div>
        </section>

        <!-- Featured Products -->
        <section>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="fw-bold mb-0">Featured Products</h4>
            <a href="#/products" class="text-fresh text-decoration-none fw-semibold small">All Products</a>
          </div>
          <div class="row g-3">
            ${products.map(productCardHTML).join("")}
          </div>
        </section>
      </div>
    `;
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderProducts() {
  showLoader(true);
  try {
    const [prodRes, catRes, brandRes] = await Promise.all([
      API.getProducts("limit=40"),
      API.getCategories(),
      API.getBrands(),
    ]);
    const allProducts = prodRes.data || [];
    const categories = catRes.data || [];
    const brands = brandRes.data || [];

    appRoot.innerHTML = `
      <div class="container">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <h3 class="fw-bold mb-0">All Products</h3>
          <div class="d-flex flex-wrap gap-2">
            <input type="search" id="productSearchInput" class="form-control" style="width:240px" placeholder="Search products..." />
            <select id="filterCategory" class="form-select" style="width:170px">
              <option value="">All Categories</option>
              ${categories.map((c) => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join("")}
            </select>
            <select id="filterBrand" class="form-select" style="width:160px">
              <option value="">All Brands</option>
              ${brands.map((b) => `<option value="${b._id}">${escapeHtml(b.name)}</option>`).join("")}
            </select>
            <select id="sortProducts" class="form-select" style="width:170px">
              <option value="">Sort: Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
        <div id="productsGrid" class="row g-3">
          ${allProducts.map(productCardHTML).join("")}
        </div>
      </div>
    `;

    const grid = document.getElementById("productsGrid");
    const searchEl = document.getElementById("productSearchInput");
    const catEl = document.getElementById("filterCategory");
    const brandEl = document.getElementById("filterBrand");
    const sortEl = document.getElementById("sortProducts");

    function applyProductFilters() {
      const q = searchEl.value.trim().toLowerCase();
      const cat = catEl.value;
      const brand = brandEl.value;
      const sort = sortEl.value;

      let list = allProducts.filter((p) => {
        const matchQ = !q || p.title.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
        const matchC = !cat || p.category?._id === cat;
        const matchB = !brand || p.brand?._id === brand;
        return matchQ && matchC && matchB;
      });

      if (sort === "price-asc") list.sort((a, b) => (a.priceAfterDiscount || a.price) - (b.priceAfterDiscount || b.price));
      if (sort === "price-desc") list.sort((a, b) => (b.priceAfterDiscount || b.price) - (a.priceAfterDiscount || a.price));
      if (sort === "rating") list.sort((a, b) => (b.ratingsAverage || 0) - (a.ratingsAverage || 0));

      grid.innerHTML = list.length
        ? list.map(productCardHTML).join("")
        : `<div class="col-12 text-center py-5 text-muted">No products match your filters.</div>`;
    }

    [searchEl, catEl, brandEl, sortEl].forEach((el) => el.addEventListener("input", applyProductFilters));
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderProductDetails(id) {
  showLoader(true);
  try {
    const res = await API.getProductById(id);
    const p = res.data;
    const images = [p.imageCover, ...(p.images || [])].filter((v, i, a) => v && a.indexOf(v) === i);
    const inWish = state.wishlistIds.has(p._id || p.id);

    appRoot.innerHTML = `
      <div class="container">
        <a href="#/products" class="btn btn-sm btn-outline-secondary mb-3"><i class="fa-solid fa-arrow-left me-1"></i> Back to Products</a>
        <div class="row g-4 align-items-center bg-white border rounded-4 p-4">
          <div class="col-md-5 text-center">
            <img id="mainDetailImg" src="${escapeHtml(p.imageCover)}" alt="${escapeHtml(p.title)}" class="img-fluid rounded-3 mb-3" style="max-height:380px; object-fit:contain;" />
            <div class="d-flex justify-content-center gap-2 flex-wrap">
              ${images
                .map(
                  (img, idx) =>
                    `<img src="${escapeHtml(img)}" class="detail-thumb ${idx === 0 ? "active" : ""}" data-thumb="${escapeHtml(img)}" alt="thumb" />`
                )
                .join("")}
            </div>
          </div>
          <div class="col-md-7">
            <div class="d-flex gap-2 mb-2">
              <a href="#/category/${p.category?._id}" class="badge bg-light-surface text-fresh text-decoration-none">${escapeHtml(p.category?.name || "")}</a>
              ${p.brand ? `<a href="#/brand/${p.brand._id}" class="badge bg-light-surface text-dark text-decoration-none">${escapeHtml(p.brand.name)}</a>` : ""}
            </div>
            <h2 class="fw-bold mb-3">${escapeHtml(p.title)}</h2>
            <p class="text-muted mb-4">${escapeHtml(p.description)}</p>
            <div class="d-flex align-items-center justify-content-between mb-4">
              <div class="fs-4 fw-bold text-fresh">${p.priceAfterDiscount || p.price} EGP
                ${p.priceAfterDiscount ? `<small class="fs-6 text-muted text-decoration-line-through ms-2">${p.price} EGP</small>` : ""}
              </div>
              <div>
                <i class="fa-solid fa-star rating-star"></i>
                <strong>${p.ratingsAverage}</strong>
                <span class="text-muted small">(${p.ratingsQuantity} reviews &bull; ${p.sold || 0} sold)</span>
              </div>
            </div>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-fresh flex-grow-1 py-2" data-add-cart="${p._id}">
                <i class="fa-solid fa-cart-plus me-1"></i> Add to Cart
              </button>
              <button type="button" class="btn btn-outline-danger px-3" data-wishlist-toggle="${p._id}">
                <i class="fa-${inWish ? "solid" : "regular"} fa-heart"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll(".detail-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        document.getElementById("mainDetailImg").src = thumb.dataset.thumb;
        document.querySelectorAll(".detail-thumb").forEach((t) => t.classList.remove("active"));
        thumb.classList.add("active");
      });
    });
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderCategories() {
  showLoader(true);
  try {
    const res = await API.getCategories();
    const cats = res.data || [];
    appRoot.innerHTML = `
      <div class="container">
        <h3 class="fw-bold mb-4">All Categories</h3>
        <div class="row g-4">
          ${cats
            .map(
              (c) => `
            <div class="col-6 col-md-4 col-lg-3">
              <a href="#/category/${c._id}" class="entity-card">
                <img src="${escapeHtml(c.image)}" alt="${escapeHtml(c.name)}" />
                <div class="p-3 text-center fw-bold text-fresh">${escapeHtml(c.name)}</div>
              </a>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderCategoryDetails(id) {
  showLoader(true);
  try {
    const [catRes, subRes, prodRes] = await Promise.all([
      API.getCategoryById(id),
      API.getSubCategoriesOnCategory(id),
      API.getProducts(`category[in]=${id}`),
    ]);
    const cat = catRes.data;
    const subs = subRes.data || [];
    const products = prodRes.data || [];

    appRoot.innerHTML = `
      <div class="container">
        <a href="#/categories" class="btn btn-sm btn-outline-secondary mb-3"><i class="fa-solid fa-arrow-left me-1"></i> All Categories</a>
        <div class="bg-light-surface rounded-4 p-4 mb-4 d-flex align-items-center gap-4 flex-wrap">
          <img src="${escapeHtml(cat.image)}" alt="${escapeHtml(cat.name)}" class="rounded-3" style="width:110px;height:110px;object-fit:cover;" />
          <div>
            <h2 class="fw-bold text-fresh mb-2">${escapeHtml(cat.name)}</h2>
            <div class="d-flex flex-wrap gap-2">
              ${subs.length ? subs.map((s) => `<span class="badge bg-white text-dark border">${escapeHtml(s.name)}</span>`).join("") : `<span class="text-muted small">No subcategories</span>`}
            </div>
          </div>
        </div>
        <h4 class="fw-bold mb-3">Products in ${escapeHtml(cat.name)}</h4>
        <div class="row g-3">
          ${products.length ? products.map(productCardHTML).join("") : `<div class="col-12 text-muted">No products found in this category.</div>`}
        </div>
      </div>
    `;
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderBrands() {
  showLoader(true);
  try {
    const res = await API.getBrands();
    const brands = res.data || [];
    appRoot.innerHTML = `
      <div class="container">
        <h3 class="fw-bold mb-4 text-fresh text-center">All Brands</h3>
        <div class="row g-4">
          ${brands
            .map(
              (b) => `
            <div class="col-6 col-md-4 col-lg-3">
              <a href="#/brand/${b._id}" class="entity-card brand-card">
                <img src="${escapeHtml(b.image)}" alt="${escapeHtml(b.name)}" />
                <div class="p-3 text-center fw-bold">${escapeHtml(b.name)}</div>
              </a>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderBrandDetails(id) {
  showLoader(true);
  try {
    const [brandRes, prodRes] = await Promise.all([API.getBrandById(id), API.getProducts(`brand=${id}`)]);
    const brand = brandRes.data;
    const products = prodRes.data || [];

    appRoot.innerHTML = `
      <div class="container">
        <a href="#/brands" class="btn btn-sm btn-outline-secondary mb-3"><i class="fa-solid fa-arrow-left me-1"></i> All Brands</a>
        <div class="bg-light-surface rounded-4 p-4 mb-4 d-flex align-items-center gap-4">
          <img src="${escapeHtml(brand.image)}" alt="${escapeHtml(brand.name)}" class="rounded-3 bg-white p-2" style="width:120px;height:90px;object-fit:contain;" />
          <h2 class="fw-bold mb-0">${escapeHtml(brand.name)}</h2>
        </div>
        <h4 class="fw-bold mb-3">Products by ${escapeHtml(brand.name)}</h4>
        <div class="row g-3">
          ${products.length ? products.map(productCardHTML).join("") : `<div class="col-12 text-muted">No products available for this brand.</div>`}
        </div>
      </div>
    `;
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderCart() {
  if (!state.token) {
    window.location.hash = "#/login";
    return;
  }
  showLoader(true);
  try {
    const res = await API.getCart();
    const cart = res.data;
    const products = cart?.products || [];
    state.cartId = res.cartId || cart?._id || null;
    state.cartCount = res.numOfCartItems || 0;
    cartBadge.textContent = String(state.cartCount);

    appRoot.innerHTML = `
      <div class="container">
        <div class="bg-light-surface rounded-4 p-4">
          <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
            <div>
              <h3 class="fw-bold mb-1">Shop Cart</h3>
              <p class="mb-0 text-fresh fw-semibold">Total Cart Price: ${cart?.totalCartPrice || 0} EGP</p>
            </div>
            <div class="d-flex gap-2">
              ${products.length ? `<button id="clearCartBtn" class="btn btn-outline-danger btn-sm">Clear Cart</button>` : ""}
              ${products.length ? `<a href="#/checkout" class="btn btn-fresh">Checkout <i class="fa-solid fa-credit-card ms-1"></i></a>` : ""}
            </div>
          </div>

          ${
            products.length === 0
              ? `<div class="text-center py-5 text-muted">Your cart is empty. <a href="#/products" class="text-fresh fw-bold">Browse Products</a></div>`
              : products
                  .map(
                    (item) => `
              <div class="row align-items-center border-bottom py-3 bg-white rounded-3 mb-2 px-2 g-2">
                <div class="col-md-2 text-center">
                  <img src="${escapeHtml(item.product.imageCover)}" alt="${escapeHtml(item.product.title)}" style="height:80px;object-fit:contain;" />
                </div>
                <div class="col-md-6">
                  <h6 class="fw-bold mb-1">${escapeHtml(item.product.title)}</h6>
                  <div class="text-fresh fw-semibold small mb-2">Price: ${item.price} EGP</div>
                  <button type="button" class="btn btn-sm text-danger p-0" data-remove-cart="${item.product._id}">
                    <i class="fa-solid fa-trash me-1"></i> Remove
                  </button>
                </div>
                <div class="col-md-4 d-flex align-items-center justify-content-md-end gap-2">
                  <button type="button" class="btn btn-outline-fresh btn-sm" data-qty-id="${item.product._id}" data-qty-next="${item.count - 1}">-</button>
                  <span class="fw-bold px-2">${item.count}</span>
                  <button type="button" class="btn btn-outline-fresh btn-sm" data-qty-id="${item.product._id}" data-qty-next="${item.count + 1}">+</button>
                </div>
              </div>
            `
                  )
                  .join("")
          }
        </div>
      </div>
    `;

    document.getElementById("clearCartBtn")?.addEventListener("click", async () => {
      showLoader(true);
      try {
        await API.clearCart();
        toast("success", "Cart cleared");
        await refreshCounters();
        renderCart();
      } catch (err) {
        toast("error", err.message);
      } finally {
        showLoader(false);
      }
    });
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="bg-light-surface rounded-4 p-4 text-center py-5"><h5>Your cart is empty.</h5><a href="#/products" class="btn btn-fresh mt-3">Shop Now</a></div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderWishlist() {
  if (!state.token) {
    window.location.hash = "#/login";
    return;
  }
  showLoader(true);
  try {
    const res = await API.getWishlist();
    const items = res.data || [];
    state.wishlistIds = new Set(items.map((p) => p._id || p.id));
    wishlistBadge.textContent = String(state.wishlistIds.size);

    appRoot.innerHTML = `
      <div class="container">
        <div class="bg-light-surface rounded-4 p-4">
          <h3 class="fw-bold mb-4">My Wishlist</h3>
          ${
            items.length === 0
              ? `<div class="text-center py-5 text-muted">Your wishlist is empty.</div>`
              : items
                  .map(
                    (p) => `
              <div class="row align-items-center bg-white rounded-3 p-3 mb-2 g-2 border">
                <div class="col-md-2 text-center">
                  <img src="${escapeHtml(p.imageCover)}" alt="${escapeHtml(p.title)}" style="height:80px;object-fit:contain;" />
                </div>
                <div class="col-md-6">
                  <h6 class="fw-bold mb-1">${escapeHtml(p.title)}</h6>
                  <div class="text-fresh fw-semibold mb-2">${p.price} EGP</div>
                  <button type="button" class="btn btn-sm text-danger p-0" data-wishlist-remove="${p._id}">
                    <i class="fa-solid fa-trash me-1"></i> Remove
                  </button>
                </div>
                <div class="col-md-4 text-md-end">
                  <button type="button" class="btn btn-fresh btn-sm" data-add-cart="${p._id}">
                    <i class="fa-solid fa-cart-plus me-1"></i> Add to Cart
                  </button>
                </div>
              </div>
            `
                  )
                  .join("")
          }
        </div>
      </div>
    `;
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderCheckout() {
  if (!state.token) {
    window.location.hash = "#/login";
    return;
  }
  showLoader(true);
  try {
    const [cartRes, addrRes] = await Promise.all([API.getCart(), API.getAddresses()]);
    const cartId = cartRes.cartId || cartRes.data?._id;
    const addresses = addrRes.data || [];

    appRoot.innerHTML = `
      <div class="container" style="max-width:680px;">
        <div class="bg-light-surface rounded-4 p-4">
          <h3 class="fw-bold mb-3">Shipping &amp; Payment</h3>
          ${
            addresses.length
              ? `<div class="mb-3">
                  <label class="form-label fw-semibold small">Use Saved Address</label>
                  <select id="savedAddrSelect" class="form-select">
                    <option value="">-- Enter manually --</option>
                    ${addresses.map((a) => `<option value='${JSON.stringify(a)}'>${escapeHtml(a.name)} - ${escapeHtml(a.city)}</option>`).join("")}
                  </select>
                </div>`
              : ""
          }
          <form id="checkoutForm">
            <div class="mb-3">
              <label class="form-label fw-semibold">Details</label>
              <input type="text" id="shipDetails" class="form-control" placeholder="Street, building, apartment..." required />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold">Phone</label>
              <input type="tel" id="shipPhone" class="form-control" placeholder="01012345678" required />
            </div>
            <div class="mb-4">
              <label class="form-label fw-semibold">City</label>
              <input type="text" id="shipCity" class="form-control" placeholder="Cairo" required />
            </div>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" id="payCashBtn" class="btn btn-fresh flex-grow-1">
                <i class="fa-solid fa-money-bill-wave me-1"></i> Pay Cash on Delivery
              </button>
              <button type="button" id="payOnlineBtn" class="btn btn-dark flex-grow-1">
                <i class="fa-solid fa-credit-card me-1"></i> Pay Online (Card)
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById("savedAddrSelect")?.addEventListener("change", (e) => {
      if (!e.target.value) return;
      const addr = JSON.parse(e.target.value);
      document.getElementById("shipDetails").value = addr.details || "";
      document.getElementById("shipPhone").value = addr.phone || "";
      document.getElementById("shipCity").value = addr.city || "";
    });

    function getShippingPayload() {
      const details = document.getElementById("shipDetails").value.trim();
      const phone = document.getElementById("shipPhone").value.trim();
      const city = document.getElementById("shipCity").value.trim();
      if (!details || !phone || !city) {
        throw new Error("Please fill in details, phone, and city.");
      }
      return { details, phone, city };
    }

    document.getElementById("payCashBtn").addEventListener("click", async () => {
      try {
        const shippingAddress = getShippingPayload();
        showLoader(true);
        await API.createCashOrder(cartId, shippingAddress);
        toast("success", "Cash order placed successfully!");
        await refreshCounters();
        window.location.hash = "#/allorders";
      } catch (err) {
        toast("error", err.message);
      } finally {
        showLoader(false);
      }
    });

    document.getElementById("payOnlineBtn").addEventListener("click", async () => {
      try {
        const shippingAddress = getShippingPayload();
        showLoader(true);
        const redirectBase = window.location.origin + window.location.pathname;
        const res = await API.createCheckoutSession(cartId, shippingAddress, redirectBase);
        if (res.session?.url) {
          window.location.href = res.session.url;
        }
      } catch (err) {
        toast("error", err.message);
      } finally {
        showLoader(false);
      }
    });
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-warning">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

async function renderOrders() {
  if (!state.token) {
    window.location.hash = "#/login";
    return;
  }
  const userId = getUserId();
  showLoader(true);
  try {
    const orders = await API.getUserOrders(userId);
    const list = Array.isArray(orders) ? orders : orders.data || [];

    appRoot.innerHTML = `
      <div class="container">
        <h3 class="fw-bold mb-4">My Orders</h3>
        ${
          list.length === 0
            ? `<div class="alert alert-info">You haven't placed any orders yet.</div>`
            : list
                .map(
                  (order) => `
            <div class="card mb-3 border rounded-4 p-3">
              <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <div>
                  <span class="fw-bold">Order #${order.id || order._id}</span>
                  <span class="text-muted small ms-2">${new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="d-flex gap-2">
                  <span class="badge bg-info text-dark text-uppercase">${escapeHtml(order.paymentMethodType)}</span>
                  <span class="badge ${order.isPaid ? "bg-success" : "bg-secondary"}">${order.isPaid ? "Paid" : "Unpaid"}</span>
                  <span class="badge ${order.isDelivered ? "bg-success" : "bg-warning text-dark"}">${order.isDelivered ? "Delivered" : "Processing"}</span>
                </div>
              </div>
              <div class="row g-2 mb-2">
                ${(order.cartItems || [])
                  .map(
                    (ci) => `
                  <div class="col-md-4 d-flex align-items-center gap-2 border rounded-3 p-2">
                    <img src="${escapeHtml(ci.product?.imageCover)}" style="width:48px;height:48px;object-fit:contain;" alt="item" />
                    <div class="small min-w-0">
                      <div class="fw-semibold text-truncate">${escapeHtml(ci.product?.title)}</div>
                      <div class="text-muted">Qty: ${ci.count} &bull; ${ci.price} EGP</div>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
              <div class="fw-bold text-fresh text-end">Total: ${order.totalOrderPrice} EGP</div>
            </div>
          `
                )
                .join("")
        }
      </div>
    `;
  } catch (err) {
    appRoot.innerHTML = `<div class="container"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  } finally {
    showLoader(false);
  }
}

// ================= AUTH & PROFILE PAGES =================

function renderLogin() {
  appRoot.innerHTML = `
    <div class="container" style="max-width:520px;">
      <div class="bg-light-surface rounded-4 p-4">
        <h3 class="fw-bold mb-3">Login Now</h3>
        <form id="loginForm">
          <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <input type="email" id="loginEmail" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Password</label>
            <input type="password" id="loginPassword" class="form-control" required />
          </div>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <a href="#/forgot-password" class="text-fresh small text-decoration-none fw-semibold">Forgot Password?</a>
            <a href="#/register" class="text-muted small text-decoration-none">Create account</a>
          </div>
          <button type="submit" class="btn btn-fresh w-100">Login</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
      const res = await API.signin({
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value,
      });
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem("freshcart_token", res.token);
      localStorage.setItem("freshcart_user", JSON.stringify(res.user));
      syncAuthUI();
      await refreshCounters();
      toast("success", `Welcome back, ${res.user?.name || ""}!`);
      window.location.hash = "#/home";
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });
}

function renderRegister() {
  appRoot.innerHTML = `
    <div class="container" style="max-width:540px;">
      <div class="bg-light-surface rounded-4 p-4">
        <h3 class="fw-bold mb-3">Register Now</h3>
        <form id="registerForm">
          <div class="mb-3">
            <label class="form-label fw-semibold">Name</label>
            <input type="text" id="regName" class="form-control" minlength="3" required />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Email</label>
            <input type="email" id="regEmail" class="form-control" required />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Password</label>
            <input type="password" id="regPass" class="form-control" minlength="6" required />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">rePassword</label>
            <input type="password" id="regRePass" class="form-control" minlength="6" required />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Phone</label>
            <input type="tel" id="regPhone" class="form-control" pattern="^01[0125][0-9]{8}$" placeholder="01012345678" required />
          </div>
          <button type="submit" class="btn btn-fresh w-100">Register</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("regPass").value;
    const rePassword = document.getElementById("regRePass").value;
    if (password !== rePassword) {
      toast("error", "Passwords do not match!");
      return;
    }
    showLoader(true);
    try {
      const res = await API.signup({
        name: document.getElementById("regName").value.trim(),
        email: document.getElementById("regEmail").value.trim(),
        password,
        rePassword,
        phone: document.getElementById("regPhone").value.trim(),
      });
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem("freshcart_token", res.token);
      localStorage.setItem("freshcart_user", JSON.stringify(res.user));
      syncAuthUI();
      await refreshCounters();
      toast("success", "Account created successfully!");
      window.location.hash = "#/home";
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });
}

function renderForgotPassword() {
  appRoot.innerHTML = `
    <div class="container" style="max-width:520px;">
      <div class="bg-light-surface rounded-4 p-4">
        <h3 class="fw-bold mb-3">Forgot Password</h3>

        <!-- Step 1: Send Reset Code -->
        <form id="forgotEmailForm" class="mb-4">
          <label class="form-label fw-semibold">Step 1: Enter your email</label>
          <div class="input-group">
            <input type="email" id="forgotEmail" class="form-control" placeholder="name@example.com" required />
            <button type="submit" class="btn btn-fresh">Send Code</button>
          </div>
        </form>

        <!-- Step 2: Verify Reset Code -->
        <form id="verifyCodeForm" class="mb-4">
          <label class="form-label fw-semibold">Step 2: Verify reset code</label>
          <div class="input-group">
            <input type="text" id="resetCodeInput" class="form-control" placeholder="6-digit code" required />
            <button type="submit" class="btn btn-outline-fresh">Verify</button>
          </div>
        </form>

        <!-- Step 3: Reset Password -->
        <form id="resetPassForm">
          <label class="form-label fw-semibold">Step 3: Set new password</label>
          <input type="password" id="newResetPassword" class="form-control mb-2" placeholder="New password" minlength="6" required />
          <button type="submit" class="btn btn-fresh w-100">Reset Password</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("forgotEmailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
      await API.forgotPassword(document.getElementById("forgotEmail").value.trim());
      toast("success", "Reset code sent to your email!");
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });

  document.getElementById("verifyCodeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
      await API.verifyResetCode(document.getElementById("resetCodeInput").value.trim());
      toast("success", "Code verified! Enter your new password below.");
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });

  document.getElementById("resetPassForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
      const email = document.getElementById("forgotEmail").value.trim();
      const newPassword = document.getElementById("newResetPassword").value;
      await API.resetPassword(email, newPassword);
      toast("success", "Password reset successfully! Please login.");
      window.location.hash = "#/login";
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });
}

async function renderProfile() {
  if (!state.token) {
    window.location.hash = "#/login";
    return;
  }
  showLoader(true);
  let addresses = [];
  try {
    const res = await API.getAddresses();
    addresses = res.data || [];
  } catch {
    addresses = [];
  } finally {
    showLoader(false);
  }

  appRoot.innerHTML = `
    <div class="container">
      <div class="row g-4">
        <!-- Change Password -->
        <div class="col-lg-6">
          <div class="bg-light-surface rounded-4 p-4 h-100">
            <h4 class="fw-bold mb-3">Change Password</h4>
            <form id="changePasswordForm">
              <div class="mb-3">
                <label class="form-label fw-semibold">Current Password</label>
                <input type="password" id="currPass" class="form-control" required />
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">New Password</label>
                <input type="password" id="newPass" class="form-control" minlength="6" required />
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Confirm New Password</label>
                <input type="password" id="reNewPass" class="form-control" minlength="6" required />
              </div>
              <button type="submit" class="btn btn-fresh">Update Password</button>
            </form>
          </div>
        </div>

        <!-- Update Profile & Saved Addresses -->
        <div class="col-lg-6">
          <div class="bg-light-surface rounded-4 p-4 mb-4">
            <h4 class="fw-bold mb-3">Update Profile</h4>
            <form id="updateProfileForm">
              <div class="mb-2">
                <label class="form-label fw-semibold">Name</label>
                <input type="text" id="profName" class="form-control" value="${escapeHtml(state.user?.name || "")}" required />
              </div>
              <div class="mb-2">
                <label class="form-label fw-semibold">Email</label>
                <input type="email" id="profEmail" class="form-control" value="${escapeHtml(state.user?.email || "")}" required />
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold">Phone</label>
                <input type="tel" id="profPhone" class="form-control" placeholder="01012345678" required />
              </div>
              <button type="submit" class="btn btn-outline-fresh">Save Changes</button>
            </form>
          </div>

          <div class="bg-light-surface rounded-4 p-4">
            <h5 class="fw-bold mb-3">Saved Addresses</h5>
            ${addresses
              .map(
                (a) => `
              <div class="d-flex justify-content-between align-items-center bg-white p-2 rounded-3 mb-2 border">
                <div class="small"><strong>${escapeHtml(a.name)}</strong> — ${escapeHtml(a.details)}, ${escapeHtml(a.city)}</div>
                <button type="button" class="btn btn-sm text-danger" data-del-addr="${a._id}"><i class="fa-solid fa-trash"></i></button>
              </div>
            `
              )
              .join("")}
            <form id="addAddressForm" class="row g-2 mt-2">
              <div class="col-6"><input type="text" id="addrName" class="form-control form-control-sm" placeholder="Label (Home)" required /></div>
              <div class="col-6"><input type="text" id="addrCity" class="form-control form-control-sm" placeholder="City" required /></div>
              <div class="col-6"><input type="text" id="addrDetails" class="form-control form-control-sm" placeholder="Details" required /></div>
              <div class="col-6"><input type="tel" id="addrPhone" class="form-control form-control-sm" placeholder="Phone" required /></div>
              <div class="col-12"><button type="submit" class="btn btn-fresh btn-sm w-100">Add Address</button></div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("changePasswordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = document.getElementById("newPass").value;
    const rePassword = document.getElementById("reNewPass").value;
    if (password !== rePassword) {
      toast("error", "New passwords do not match!");
      return;
    }
    showLoader(true);
    try {
      const res = await API.changeMyPassword({
        currentPassword: document.getElementById("currPass").value,
        password,
        rePassword,
      });
      if (res.token) {
        state.token = res.token;
        localStorage.setItem("freshcart_token", res.token);
      }
      toast("success", "Password updated successfully!");
      e.target.reset();
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });

  document.getElementById("updateProfileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
      const res = await API.updateMe({
        name: document.getElementById("profName").value.trim(),
        email: document.getElementById("profEmail").value.trim(),
        phone: document.getElementById("profPhone").value.trim(),
      });
      if (res.user) {
        state.user = res.user;
        localStorage.setItem("freshcart_user", JSON.stringify(res.user));
        syncAuthUI();
      }
      toast("success", "Profile updated!");
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });

  document.getElementById("addAddressForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoader(true);
    try {
      await API.addAddress({
        name: document.getElementById("addrName").value.trim(),
        city: document.getElementById("addrCity").value.trim(),
        details: document.getElementById("addrDetails").value.trim(),
        phone: document.getElementById("addrPhone").value.trim(),
      });
      toast("success", "Address added!");
      renderProfile();
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  });
}

// ================= GLOBAL DELEGATED EVENTS =================

document.addEventListener("click", async (e) => {
  const addCartBtn = e.target.closest("[data-add-cart]");
  if (addCartBtn) {
    if (!state.token) {
      toast("info", "Please login first");
      window.location.hash = "#/login";
      return;
    }
    showLoader(true);
    try {
      const res = await API.addToCart(addCartBtn.dataset.addCart);
      state.cartCount = res.numOfCartItems || state.cartCount + 1;
      cartBadge.textContent = String(state.cartCount);
      toast("success", res.message || "Added to cart!");
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
    return;
  }

  const wishToggleBtn = e.target.closest("[data-wishlist-toggle]");
  if (wishToggleBtn) {
    if (!state.token) {
      toast("info", "Please login first");
      window.location.hash = "#/login";
      return;
    }
    const id = wishToggleBtn.dataset.wishlistToggle;
    const isActive = state.wishlistIds.has(id);
    showLoader(true);
    try {
      if (isActive) {
        await API.removeFromWishlist(id);
        state.wishlistIds.delete(id);
        wishToggleBtn.classList.remove("active");
        wishToggleBtn.innerHTML = `<i class="fa-regular fa-heart"></i>`;
        toast("success", "Removed from wishlist");
      } else {
        await API.addToWishlist(id);
        state.wishlistIds.add(id);
        wishToggleBtn.classList.add("active");
        wishToggleBtn.innerHTML = `<i class="fa-solid fa-heart"></i>`;
        toast("success", "Added to wishlist!");
      }
      wishlistBadge.textContent = String(state.wishlistIds.size);
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
    return;
  }

  const wishRemoveBtn = e.target.closest("[data-wishlist-remove]");
  if (wishRemoveBtn) {
    showLoader(true);
    try {
      await API.removeFromWishlist(wishRemoveBtn.dataset.wishlistRemove);
      toast("success", "Removed from wishlist");
      renderWishlist();
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
    return;
  }

  const removeCartBtn = e.target.closest("[data-remove-cart]");
  if (removeCartBtn) {
    showLoader(true);
    try {
      await API.removeCartItem(removeCartBtn.dataset.removeCart);
      toast("success", "Item removed");
      renderCart();
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
    return;
  }

  const qtyBtn = e.target.closest("[data-qty-id]");
  if (qtyBtn) {
    const nextQty = Number(qtyBtn.dataset.qtyNext);
    const id = qtyBtn.dataset.qtyId;
    showLoader(true);
    try {
      if (nextQty <= 0) await API.removeCartItem(id);
      else await API.updateCartQty(id, nextQty);
      renderCart();
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
    return;
  }

  const delAddrBtn = e.target.closest("[data-del-addr]");
  if (delAddrBtn) {
    showLoader(true);
    try {
      await API.removeAddress(delAddrBtn.dataset.delAddr);
      toast("success", "Address removed");
      renderProfile();
    } catch (err) {
      toast("error", err.message);
    } finally {
      showLoader(false);
    }
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  state.token = "";
  state.user = null;
  localStorage.removeItem("freshcart_token");
  localStorage.removeItem("freshcart_user");
  syncAuthUI();
  refreshCounters();
  toast("success", "Signed out");
  window.location.hash = "#/login";
});

document.getElementById("footerAppForm").addEventListener("submit", (e) => {
  e.preventDefault();
  toast("success", "App link sent to your email!");
  e.target.reset();
});

// ================= HASH ROUTER =================

function router() {
  const hash = window.location.hash || "#/home";
  const parts = hash.replace(/^#\/?/, "").split("/");
  const route = parts[0] || "home";
  const param = parts[1] || "";

  document.querySelectorAll(".nav-link[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === route);
  });

  window.scrollTo({ top: 0, behavior: "instant" });

  switch (route) {
    case "home":
      renderHome();
      break;
    case "products":
      renderProducts();
      break;
    case "product":
      renderProductDetails(param);
      break;
    case "categories":
      renderCategories();
      break;
    case "category":
      renderCategoryDetails(param);
      break;
    case "brands":
      renderBrands();
      break;
    case "brand":
      renderBrandDetails(param);
      break;
    case "cart":
      renderCart();
      break;
    case "wishlist":
      renderWishlist();
      break;
    case "checkout":
      renderCheckout();
      break;
    case "allorders":
      renderOrders();
      break;
    case "login":
      renderLogin();
      break;
    case "register":
      renderRegister();
      break;
    case "forgot-password":
      renderForgotPassword();
      break;
    case "profile":
      renderProfile();
      break;
    default:
      renderHome();
  }
}

window.addEventListener("hashchange", router);

(async function init() {
  syncAuthUI();
  await refreshCounters();
  router();
})();
