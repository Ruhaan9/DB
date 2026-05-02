// source/screens/OrdersScreen.js
import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import {getOrders, getOrder, placeOrder, cancelOrder, getProducts} from '../api.js';

const MODES = {
	LIST: 'list',
	DETAIL: 'detail',
	PLACE: 'place',
	CONFIRM_CANCEL: 'confirm_cancel',
};

export default function OrdersScreen() {
	const [mode, setMode] = useState(MODES.LIST);
	const [orders, setOrders] = useState([]);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [orderDetail, setOrderDetail] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	// Place order state
	const [allProducts, setAllProducts] = useState([]);
	const [cart, setCart] = useState([]); // [{productId, quantity}]
	const [placeStep, setPlaceStep] = useState('select_product'); // 'select_product' | 'enter_qty'
	const [pendingProduct, setPendingProduct] = useState(null);
	const [qtyInput, setQtyInput] = useState('');

	useEffect(() => {
		fetchOrders();
	}, []);

	const fetchOrders = async () => {
		setLoading(true);
		setError('');
		try {
			const res = await getOrders();
			setOrders(res.data);
		} catch {
			setError('Failed to load orders.');
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

	const fetchAllProducts = async () => {
		try {
			const res = await getProducts();
			setAllProducts(res.data);
		} catch {}
	};

	const submitOrder = async () => {
		if (cart.length === 0) {
			setError('Cart is empty.');
			setMode(MODES.LIST);
			return;
		}

		setLoading(true);
		try {
			await placeOrder(cart);
			setSuccess(`Order placed with ${cart.length} item(s)!`);
			setCart([]);
			await fetchOrders();
			setMode(MODES.LIST);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to place order.');
			setMode(MODES.LIST);
		} finally {
			setLoading(false);
		}
	};

	useInput((input, key) => {
		if (mode === MODES.LIST) {
			if (input === 'n') {
				fetchAllProducts();
				setCart([]);
				setPlaceStep('select_product');
				setPendingProduct(null);
				setMode(MODES.PLACE);
			}

			if (key.escape) {
				setError('');
				setSuccess('');
			}
		}

		if (mode === MODES.DETAIL) {
			if (key.escape) setMode(MODES.LIST);
			if (input === 'x') setMode(MODES.CONFIRM_CANCEL);
		}

		if (mode === MODES.CONFIRM_CANCEL) {
			if (input === 'y') handleCancel();
			if (input === 'n' || key.escape) setMode(MODES.DETAIL);
		}

		if (mode === MODES.PLACE) {
			if (key.escape) {
				if (placeStep === 'enter_qty') {
					setPlaceStep('select_product');
					setPendingProduct(null);
					setQtyInput('');
				} else {
					setMode(MODES.LIST);
				}
			}
		}
	});

	const handleCancel = async () => {
		if (!orderDetail) return;
		setLoading(true);
		try {
			await cancelOrder(orderDetail.OrderID);
			setSuccess('Order cancelled and stock restored.');
			await fetchOrders();
			setMode(MODES.LIST);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to cancel.');
			setMode(MODES.LIST);
		} finally {
			setLoading(false);
		}
	};

	// ── Place Order ───────────────────────────────────────────────────────────
	if (mode === MODES.PLACE) {
		if (placeStep === 'enter_qty' && pendingProduct) {
			return (
				<Box flexDirection="column" padding={1}>
					<Text bold color="cyan">New Order — Add Item</Text>
					<Text>Product: <Text color="yellow">{pendingProduct.ProductName}</Text>  Price: {pendingProduct.Price}  Stock: {pendingProduct.StockQuantity}</Text>
					<Box marginTop={1}>
						<Text color="yellow">Quantity: </Text>
						<TextInput
							value={qtyInput}
							onChange={setQtyInput}
							onSubmit={() => {
								const qty = Number(qtyInput);
								if (!qty || qty <= 0) return;
								setCart((c) => [...c, {productId: pendingProduct.ProductID, quantity: qty}]);
								setQtyInput('');
								setPendingProduct(null);
								setPlaceStep('select_product');
							}}
						/>
					</Box>
					<Text dimColor>ENTER to add • ESC to go back</Text>
				</Box>
			);
		}

		// Product selector
		const remaining = allProducts.filter(
			(p) => !cart.find((c) => c.productId === p.ProductID),
		);
		const productItems = remaining.map((p) => ({
			label: `${p.ProductName.padEnd(25)} PKR ${p.Price}  (stock: ${p.StockQuantity})`,
			value: p,
		}));

		const confirmItem = {label: `✓ Place Order (${cart.length} item(s))`, value: '__confirm__'};
		const items = [...productItems, confirmItem];

		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">New Order</Text>

				{cart.length > 0 && (
					<Box flexDirection="column" marginBottom={1}>
						<Text color="green">Cart:</Text>
						{cart.map((c, i) => {
							const p = allProducts.find((x) => x.ProductID === c.productId);
							return (
								<Text key={i} color="green">
									  {p?.ProductName} × {c.quantity}
								</Text>
							);
						})}
					</Box>
				)}

				<Text dimColor>Select a product to add, or confirm:</Text>
				<SelectInput
					items={items}
					onSelect={(item) => {
						if (item.value === '__confirm__') {
							submitOrder();
						} else {
							setPendingProduct(item.value);
							setPlaceStep('enter_qty');
						}
					}}
				/>
				<Text dimColor>ESC to cancel</Text>
			</Box>
		);
	}

	// ── Order Detail ──────────────────────────────────────────────────────────
	if (mode === MODES.DETAIL && orderDetail) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Order #{orderDetail.OrderID}</Text>
				<Text>Date: {new Date(orderDetail.OrderDate).toLocaleDateString()}</Text>
				<Text>Customer: {orderDetail.Username}  Age: {orderDetail.Age}  Gender: {orderDetail.Gender}</Text>

				<Box marginTop={1} flexDirection="column">
					<Text bold>Items:</Text>
					{orderDetail.items.map((item) => (
						<Box key={item.OrderDetailID}>
							<Text>  {item.ProductName.padEnd(25)} × {item.Quantity}  @ PKR {item.UnitPrice}  = PKR {item.LineTotal}</Text>
						</Box>
					))}
				</Box>

				<Box marginTop={1}>
					<Text bold>Total: </Text>
					<Text color="green">PKR {orderDetail.totalAmount.toFixed(2)}</Text>
				</Box>

				<Box marginTop={1} flexDirection="column">
					<Text dimColor>X to cancel order • ESC to go back</Text>
				</Box>
			</Box>
		);
	}

	// ── Confirm Cancel ────────────────────────────────────────────────────────
	if (mode === MODES.CONFIRM_CANCEL) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="red">Cancel order #{orderDetail?.OrderID}?</Text>
				<Text>Stock will be restored.</Text>
				<Box marginTop={1}>
					<Text color="red">Y</Text>
					<Text> = Yes, cancel   </Text>
					<Text color="green">N</Text>
					<Text> = No, keep it</Text>
				</Box>
			</Box>
		);
	}

	// ── Orders List ───────────────────────────────────────────────────────────
	const orderItems = orders.map((o) => ({
		label: `#${String(o.OrderID).padEnd(5)} ${new Date(o.OrderDate).toLocaleDateString().padEnd(12)} ${o.Username.padEnd(15)} PKR ${String(o.TotalAmount).padStart(8)}  (${o.ItemCount} items)`,
		value: o,
	}));

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="green">My Orders</Text>

			{error && <Text color="red">✗ {error}</Text>}
			{success && <Text color="green">✓ {success}</Text>}

			{loading ? (
				<Text color="cyan">Loading...</Text>
			) : orders.length === 0 ? (
				<Text dimColor>No orders yet.</Text>
			) : (
				<SelectInput
					items={orderItems}
					onSelect={(item) => {
						setSelectedOrder(item.value);
						fetchOrderDetail(item.value.OrderID);
					}}
				/>
			)}

			<Text dimColor marginTop={1}>ENTER = view details • N = new order</Text>
		</Box>
	);
}