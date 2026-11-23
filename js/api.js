"use strict";

const BASE_URL = "https://ecommerce.routemisr.com";

function getToken() {
  return localStorage.getItem("freshcart_token") || "";
}

async function apiRequest(path, { method = "GET", body = null, auth = false } = {}) {
  const headers = {};
  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (!token) {
      throw new Error("Please login first to continue.");
    }
    headers["token"] = token;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.errors?.msg ||
      data?.message ||
      `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const API = {
  // 1. Authentication
  signup: (payload) => apiRequest("/api/v1/auth/signup", { method: "POST", body: payload }),
  signin: (payload) => apiRequest("/api/v1/auth/signin", { method: "POST", body: payload }),
  forgotPassword: (email) => apiRequest("/api/v1/auth/forgotPasswords", { method: "POST", body: { email } }),
  verifyResetCode: (resetCode) => apiRequest("/api/v1/auth/verifyResetCode", { method: "POST", body: { resetCode } }),
  resetPassword: (email, newPassword) => apiRequest("/api/v1/auth/resetPassword", { method: "PUT", body: { email, newPassword } }),
  changeMyPassword: (payload) => apiRequest("/api/v1/users/changeMyPassword", { method: "PUT", body: payload, auth: true }),
  updateMe: (payload) => apiRequest("/api/v1/users/updateMe/", { method: "PUT", body: payload, auth: true }),

  // 2. Products
  getProducts: (query = "") => apiRequest(`/api/v1/products${query ? `?${query}` : ""}`),
  getProductById: (id) => apiRequest(`/api/v1/products/${id}`),

  // 3. Categories & SubCategories
  getCategories: () => apiRequest("/api/v1/categories"),
  getCategoryById: (id) => apiRequest(`/api/v1/categories/${id}`),
  getSubCategoriesOnCategory: (categoryId) => apiRequest(`/api/v1/categories/${categoryId}/subcategories`),

  // 4. Brands
  getBrands: () => apiRequest("/api/v1/brands"),
  getBrandById: (id) => apiRequest(`/api/v1/brands/${id}`),

  // 5. Cart
  getCart: () => apiRequest("/api/v1/cart", { auth: true }),
  addToCart: (productId) => apiRequest("/api/v1/cart", { method: "POST", body: { productId }, auth: true }),
  updateCartQty: (productId, count) => apiRequest(`/api/v1/cart/${productId}`, { method: "PUT", body: { count: String(count) }, auth: true }),
  removeCartItem: (productId) => apiRequest(`/api/v1/cart/${productId}`, { method: "DELETE", auth: true }),
  clearCart: () => apiRequest("/api/v1/cart", { method: "DELETE", auth: true }),

  // 6. Wishlist
  getWishlist: () => apiRequest("/api/v1/wishlist", { auth: true }),
  addToWishlist: (productId) => apiRequest("/api/v1/wishlist", { method: "POST", body: { productId }, auth: true }),
  removeFromWishlist: (productId) => apiRequest(`/api/v1/wishlist/${productId}`, { method: "DELETE", auth: true }),

  // 7. Orders (Cash & Online Checkout Session)
  createCashOrder: (cartId, shippingAddress) => apiRequest(`/api/v1/orders/${cartId}`, { method: "POST", body: { shippingAddress }, auth: true }),
  createCheckoutSession: (cartId, shippingAddress, redirectUrl) =>
    apiRequest(`/api/v1/orders/checkout-session/${cartId}?url=${encodeURIComponent(redirectUrl)}`, {
      method: "POST",
      body: { shippingAddress },
      auth: true,
    }),
  getUserOrders: (userId) => apiRequest(`/api/v1/orders/user/${userId}`),

  // 8. Addresses
  getAddresses: () => apiRequest("/api/v1/addresses", { auth: true }),
  addAddress: (payload) => apiRequest("/api/v1/addresses", { method: "POST", body: payload, auth: true }),
  removeAddress: (addressId) => apiRequest(`/api/v1/addresses/${addressId}`, { method: "DELETE", auth: true }),
};
