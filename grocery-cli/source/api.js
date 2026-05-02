// source/api.js
import axios from 'axios';

const api = axios.create({
	baseURL: 'http://localhost:3000/api',
	withCredentials: true,
});

// ── Cookie jar (Node.js doesn't persist cookies like a browser) ───────────────
let _cookieJar = '';

// After every response, grab any Set-Cookie headers and store them
api.interceptors.response.use((response) => {
	const raw = response.headers['set-cookie'];
	if (raw) {
		// Keep only the cookie name=value part, strip attributes (Path, HttpOnly…)
		_cookieJar = raw
			.map((c) => c.split(';')[0])
			.join('; ');
	}
	return response;
}, (error) => {
	return Promise.reject(error);
});

// Before every request, inject the stored cookies
api.interceptors.request.use((config) => {
	if (_cookieJar) {
		config.headers['Cookie'] = _cookieJar;
	}
	return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const register    = (data) => api.post('/auth/register', data);
export const login       = (data) => api.post('/auth/login', data);
export const logout      = ()     => api.post('/auth/logout');
export const getMe       = ()     => api.get('/auth/me');

// ── Locations ─────────────────────────────────────────────────────────────────
export const getLocation    = (zipCode) => api.get(`/locations/${zipCode}`);
export const createLocation = (data)    => api.post('/locations', data);

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories  = ()          => api.get('/categories');
export const createCategory = (data)      => api.post('/categories', data);
export const updateCategory = (id, data)  => api.put(`/categories/${id}`, data);
export const deleteCategory = (id)        => api.delete(`/categories/${id}`);

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts   = (params)     => api.get('/products', { params });
export const getProduct    = (id)         => api.get(`/products/${id}`);
export const createProduct = (data)       => api.post('/products', data);
export const updateProduct = (id, data)   => api.put(`/products/${id}`, data);
export const updatePrice   = (id, price)  => api.patch(`/products/${id}/price`, { price });
export const deleteProduct = (id)         => api.delete(`/products/${id}`);

// ── Orders ────────────────────────────────────────────────────────────────────
export const getOrders   = ()      => api.get('/orders');
export const getOrder    = (id)    => api.get(`/orders/${id}`);
export const placeOrder  = (items) => api.post('/orders', { items });
export const cancelOrder = (id)    => api.delete(`/orders/${id}`);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers   = ()          => api.get('/users');
export const getUser    = (id)        => api.get(`/users/${id}`);
export const updateUser = (id, data)  => api.put(`/users/${id}`, data);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getOrdersFull       = ()              => api.get('/analytics/orders/full');
export const getCostByGender     = ()              => api.get('/analytics/orders/cost-by-gender');
export const getBestSellers      = (minUnits = 10) => api.get('/analytics/products/best-sellers', { params: { minUnits } });
export const getInactiveUsers    = ()              => api.get('/analytics/users/inactive');
export const getAboveAvgPrice    = ()              => api.get('/analytics/products/above-avg-price');
export const getGenderSales      = ()              => api.get('/analytics/products/gender-sales');
export const getStockProfile     = (id)            => api.get(`/analytics/products/${id}/stock-profile`);
export const getTopSeller        = ()              => api.get('/analytics/products/top-seller');
export const getBoughtTogether   = (minCount = 3)  => api.get('/analytics/products/bought-together', { params: { minCount } });
export const getMonthlyRevenue   = ()              => api.get('/analytics/revenue/monthly');
export const getRFM              = ()              => api.get('/analytics/users/rfm');
export const getRevenueByGender  = ()              => api.get('/analytics/revenue/by-gender');
export const getSpendingPatterns = ()              => api.get('/analytics/users/spending-patterns');
export const getTopPerGender     = ()              => api.get('/analytics/products/top-per-gender');
export const getBoughtBoth       = (a, b)          => api.get('/analytics/users/bought-both', { params: { productA: a, productB: b } });
export const getBoughtNot        = (a, b)          => api.get('/analytics/users/bought-not',  { params: { productA: a, productB: b } });
export const getAllWithBuyers     = ()              => api.get('/analytics/products/all-with-buyers');
export const getFullOuter        = ()              => api.get('/analytics/products/full-outer');
export const getFemaleUnderPrice = (maxPrice = 500)=> api.get('/analytics/products/female-under-price', { params: { maxPrice } });