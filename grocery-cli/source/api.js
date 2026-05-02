// source/api.js
import axios from 'axios';

const api = axios.create({
	baseURL: 'http://localhost:3000/api',
	withCredentials: true,
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// ── Locations ─────────────────────────────────────────────────────────────────
export const getLocation = (zipCode) => api.get(`/locations/${zipCode}`);
export const createLocation = (data) => api.post('/locations', data);

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = () => api.get('/categories');

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (params) => api.get('/products', {params});
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const updatePrice = (id, price) => api.patch(`/products/${id}/price`, {price});
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ── Orders ────────────────────────────────────────────────────────────────────
export const getOrders = () => api.get('/orders');
export const getOrder = (id) => api.get(`/orders/${id}`);
export const placeOrder = (items) => api.post('/orders', {items});
export const cancelOrder = (id) => api.delete(`/orders/${id}`);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () => api.get('/users');

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getOrdersFull = () => api.get('/analytics/orders/full');
export const getBestSellers = (minUnits = 10) => api.get('/analytics/products/best-sellers', {params: {minUnits}});
export const getInactiveUsers = () => api.get('/analytics/users/inactive');
export const getGenderSales = () => api.get('/analytics/products/gender-sales');
export const getTopSeller = () => api.get('/analytics/products/top-seller');
export const getMonthlyRevenue = () => api.get('/analytics/revenue/monthly');
export const getRFM = () => api.get('/analytics/users/rfm');
export const getRevenueByGender = () => api.get('/analytics/revenue/by-gender');
export const getTopPerGender = () => api.get('/analytics/products/top-per-gender');