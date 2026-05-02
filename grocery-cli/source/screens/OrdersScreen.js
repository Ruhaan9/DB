// source/screens/OrdersScreen.js
// Customer: review cart → place order, view past orders, cancel order
// Admin:    view all orders (via analytics/orders/full), cancel any order
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput   from 'ink-text-input';
import { setTyping } from '../typingContext.js';
import { getOrders, getOrder, placeOrder, cancelOrder } from '../api.js';

const MODES = {
	LIST:           'list',
	DETAIL:         'detail',
	CART_REVIEW:    'cart_review',
	CONFIRM_ORDER:  'confirm_order',
	CONFIRM_CANCEL: 'confirm_cancel',
};

export default function OrdersScreen({ user, cart, setCart }) {
	const isAdmin = user?.role === 'admin';

	const [mode, setMode]               = useState(MODES.LIST);
	const [orders, setOrders]           = useState([]);
	const [orderDetail, setOrderDetail] = useState(null);
	const [loading, setLoading]         = useState(true);
	const [error, setError]             = useState('');
	const [success, setSuccess]         = useState('');

	// For editing cart quantities before placing
	const [editIdx, setEditIdx]   = useState(0);
	const [editQty, setEditQty]   = useState('');
	const [editMode, setEditMode] = useState(false);

	useEffect(() => { fetchOrders(); }, []);

	const fetchOrders = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await getOrders();
			setOrders(res.data);
		} catch (err) {
			const status = err.response?.status;
			if (status === 401) {
				setError('Session expired — please restart and log in again.');
			} else {
				setError(err.response?.data?.error || 'Failed to load orders.');
			}
		} finally {
			setLoading(false);
		}
	};

	const fetchOrderDetail = async (orderId) => {
		setLoading(true);
		try {
			const res = await getOrder(orderId);
			setOrderDetail(res.data);
			setMode(MODES.DETAIL);
		} catch {
			setError('Failed to load order details.');
		} finally {
			setLoading(false);
		}
	};

	const handlePlaceOrder = async () => {
		if (!cart || cart.length === 0) {
			setError('Your cart is empty. Add products from the Products tab first.');
			setMode(MODES.LIST);
			return;
		}
		setLoading(true);
		try {
			const items = cart.map((c) => ({ productId: c.productId, quantity: c.quantity }));
			await placeOrder(items);
			setCart([]);
			setSuccess(`Order placed! ${items.length} item(s) submitted.`);
			await fetchOrders();
			setMode(MODES.LIST);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to place order.');
			setMode(MODES.LIST);
		} finally {
			setLoading(false);
		}
	};

	const handleCancel = async () => {
		if (!orderDetail) return;
		setLoading(true);
		try {
			await cancelOrder(orderDetail.OrderID);
			setSuccess('Order cancelled and stock restored.');
			await fetchOrders();
			setMode(MODES.LIST);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to cancel order.');
			setMode(MODES.LIST);
		} finally {
			setLoading(false);
		}
	};

	useInput((input, key) => {
		if (key.escape) {
			if (mode === MODES.DETAIL || mode === MODES.CART_REVIEW ||
				mode === MODES.CONFIRM_ORDER || mode === MODES.CONFIRM_CANCEL) {
				setMode(MODES.LIST);
				setError('');
				setSuccess('');
				setEditMode(false);
			}
			return;
		}

		if (mode === MODES.LIST) {
			// Open cart review
			if ((input === 'c' || input === 'C') && !isAdmin) {
				setMode(MODES.CART_REVIEW);
				setEditMode(false);
			}
		}

		if (mode === MODES.DETAIL) {
			if (input === 'x' || input === 'X') setMode(MODES.CONFIRM_CANCEL);
		}

		if (mode === MODES.CONFIRM_CANCEL) {
			if (input === 'y' || input === 'Y') handleCancel();
			if (input === 'n' || input === 'N') setMode(MODES.DETAIL);
		}
	});

	// ── CART REVIEW ───────────────────────────────────────────────────────────
	if (mode === MODES.CART_REVIEW) {
		if (!cart || cart.length === 0) {
			return (
				<Box flexDirection="column" padding={1}>
					<Text bold color="cyan">Your Cart</Text>
					<Text dimColor>Cart is empty. Go to Products and add items first.</Text>
					<Text dimColor marginTop={1}>ESC to go back</Text>
				</Box>
			);
		}

		const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

		// Editing a cart item quantity
		if (editMode) {
			const item = cart[editIdx];
			return (
				<Box flexDirection="column" padding={1}>
					<Text bold color="cyan">Edit Quantity — {item.productName}</Text>
					<Text>Current quantity: <Text color="yellow">{item.quantity}</Text>  (0 = remove)</Text>
					<Box marginTop={1}>
						<Text color="yellow">New quantity: </Text>
						<TextInput
							value={editQty}
							onChange={setEditQty}
							onSubmit={() => {
								const qty = Number(editQty);
								if (isNaN(qty) || qty < 0) { setEditMode(false); return; }
								if (qty === 0) {
									setCart((prev) => prev.filter((_, i) => i !== editIdx));
								} else {
									setCart((prev) => prev.map((c, i) => i === editIdx ? { ...c, quantity: qty } : c));
								}
								setEditMode(false);
								setEditQty('');
							}}
						/>
					</Box>
					<Text dimColor>ENTER to confirm • ESC to cancel</Text>
				</Box>
			);
		}

		const cartItems = cart.map((c, i) => ({
			label: `${c.productName.padEnd(26)}  ×${c.quantity}  PKR ${(c.price * c.quantity).toFixed(2)}`,
			value: i,
		}));
		const actions = [
			{ label: `✓ Place Order  (Total: PKR ${total.toFixed(2)})`, value: '__place__' },
			{ label: '✎ Edit an item quantity',                         value: '__edit__'  },
			{ label: '✗ Clear entire cart',                             value: '__clear__' },
		];

		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Your Cart  ({cart.length} items)</Text>

				<Box marginTop={1} flexDirection="column">
					{cart.map((c, i) => (
						<Text key={i}>
							<Text color="yellow">{String(i + 1).padStart(2)}. </Text>
							<Text>{c.productName.padEnd(26)}</Text>
							<Text>  ×{c.quantity}  </Text>
							<Text color="green">PKR {(c.price * c.quantity).toFixed(2)}</Text>
						</Text>
					))}
				</Box>

				<Box marginTop={1}>
					<Text bold>Total: </Text>
					<Text bold color="green">PKR {total.toFixed(2)}</Text>
				</Box>

				<Box marginTop={1}>
					<SelectInput
						items={actions}
						onSelect={(item) => {
							if (item.value === '__place__') {
								handlePlaceOrder();
							} else if (item.value === '__edit__') {
								// Pick which item to edit
								setEditIdx(0);
								setEditQty(String(cart[0].quantity));
								setEditMode(true);
							} else if (item.value === '__clear__') {
								setCart([]);
								setMode(MODES.LIST);
							}
						}}
					/>
				</Box>
				<Text dimColor>ESC to go back</Text>
			</Box>
		);
	}

	// ── ORDER DETAIL ──────────────────────────────────────────────────────────
	if (mode === MODES.DETAIL && orderDetail) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Order #{orderDetail.OrderID}</Text>
				<Text>Date    : {new Date(orderDetail.OrderDate).toLocaleDateString()}</Text>
				<Text>Customer: {orderDetail.Username}   Age: {orderDetail.Age}   Gender: {orderDetail.Gender}</Text>

				<Box marginTop={1} flexDirection="column">
					<Text bold underline>Items:</Text>
					{orderDetail.items?.map((item) => (
						<Text key={item.OrderDetailID}>
							{'  '}{item.ProductName.padEnd(26)} × {item.Quantity}  @ PKR {item.UnitPrice}  = PKR {item.LineTotal}
						</Text>
					))}
				</Box>

				<Box marginTop={1}>
					<Text bold>Total: </Text>
					<Text color="green">PKR {orderDetail.totalAmount?.toFixed(2)}</Text>
				</Box>

				<Box marginTop={1}>
					<Text dimColor>X = cancel this order • ESC = back</Text>
				</Box>
			</Box>
		);
	}

	// ── CONFIRM CANCEL ────────────────────────────────────────────────────────
	if (mode === MODES.CONFIRM_CANCEL) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="red">Cancel Order #{orderDetail?.OrderID}?</Text>
				<Text dimColor>Stock will be restored automatically.</Text>
				<Box marginTop={1}>
					<Text color="red" bold>Y</Text>
					<Text> = Yes, cancel    </Text>
					<Text color="green" bold>N</Text>
					<Text> = No, keep it</Text>
				</Box>
			</Box>
		);
	}

	// ── ORDERS LIST ───────────────────────────────────────────────────────────
	const cartTotal = cart?.reduce((s, c) => s + c.price * c.quantity, 0) || 0;

	const orderItems = orders.map((o) => ({
		label: `#${String(o.OrderID).padEnd(5)} ${new Date(o.OrderDate).toLocaleDateString().padEnd(12)} ${o.Username.padEnd(16)} PKR ${String(Number(o.TotalAmount).toFixed(2)).padStart(9)}  (${o.ItemCount} items)`,
		value: o,
	}));

	return (
		<Box flexDirection="column" padding={1}>
			<Box>
				<Text bold color="green">My Orders</Text>
				{!isAdmin && cart && cart.length > 0 && (
					<Text color="yellow">   🛒 Cart: {cart.reduce((s,c)=>s+c.quantity,0)} items ({cart.length} products)  PKR {cartTotal.toFixed(2)}  — press C to review</Text>
				)}
			</Box>

			{error   && <Text color="red"   marginTop={0}>✗ {error}</Text>}
			{success && <Text color="green" marginTop={0}>✓ {success}</Text>}

			{loading ? (
				<Text color="cyan">Loading…</Text>
			) : orders.length === 0 ? (
				<Text dimColor>No orders yet.</Text>
			) : (
				<SelectInput
					items={orderItems}
					onSelect={(item) => fetchOrderDetail(item.value.OrderID)}
				/>
			)}

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>ENTER = view order details</Text>
				{!isAdmin && <Text dimColor>C = view/place cart</Text>}
			</Box>
		</Box>
	);
}