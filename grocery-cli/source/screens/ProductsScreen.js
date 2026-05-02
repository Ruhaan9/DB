// source/screens/ProductsScreen.js
// Admin: full CRUD (add, edit price, delete)
// Customer: browse, search, add to in-memory cart
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput   from 'ink-text-input';
import SelectInput from 'ink-select-input';
import { setTyping } from '../typingContext.js';
import {
	getProducts, createProduct, updatePrice,
	deleteProduct, getCategories,
} from '../api.js';

const MODES = {
	LIST:    'list',
	SEARCH:  'search',
	ADD:     'add',
	PRICE:   'price',
	DELETE:  'delete',
	DETAIL:  'detail',
};

export default function ProductsScreen({ user, cart, setCart }) {
	const isAdmin = user?.role === 'admin';

	const [mode, setMode]                   = useState(MODES.LIST);
	const [products, setProducts]           = useState([]);
	const [categories, setCategories]       = useState([]);
	const [loading, setLoading]             = useState(true);
	const [error, setError]                 = useState('');
	const [success, setSuccess]             = useState('');
	const [searchTerm, setSearchTerm]       = useState('');
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [newPrice, setNewPrice]           = useState('');
	const [qtyInput, setQtyInput]           = useState('1');
	const [page, setPage]                   = useState(0);

	const PAGE_SIZE = 12;

	// Add product wizard
	const [addFields, setAddFields] = useState({ productName: '', categoryID: '', price: '', stockQuantity: '' });
	const [addStep, setAddStep]     = useState(0);

	useEffect(() => {
		fetchProducts();
		fetchCategories();
	}, []);

	const fetchProducts = async (search = '') => {
		setLoading(true);
		setError('');
		setPage(0);
		try {
			const res = await getProducts(search ? { search } : {});
			setProducts(res.data);
		} catch {
			setError('Failed to load products.');
		} finally {
			setLoading(false);
		}
	};

	const fetchCategories = async () => {
		try {
			const res = await getCategories();
			setCategories(res.data);
		} catch {}
	};

	const goList = () => {
		setMode(MODES.LIST);
		setError('');
		setSuccess('');
		setNewPrice('');
		setQtyInput('1');
	};

	useInput((input, key) => {
		if (key.escape) {
			if (mode !== MODES.LIST) { goList(); return; }
			setError(''); setSuccess('');
			return;
		}

		if (mode === MODES.LIST) {
			if (input === 's' || input === 'S') { setSearchTerm(''); setMode(MODES.SEARCH); }
			if (isAdmin && (input === 'a' || input === 'A')) {
				setAddStep(0);
				setAddFields({ productName: '', categoryID: '', price: '', stockQuantity: '' });
				setMode(MODES.ADD);
			}
			const maxPage = Math.ceil(products.length / PAGE_SIZE) - 1;
			if ((input === 'n' || input === 'N') && page < maxPage) setPage((p) => p + 1);
			if ((input === 'p' || input === 'P') && page > 0)       setPage((p) => p - 1);
		}
	});

	// ── SEARCH ────────────────────────────────────────────────────────────────
	if (mode === MODES.SEARCH) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Search Products</Text>
				<Box marginTop={1}>
					<Text color="yellow">Name: </Text>
					<TextInput
						value={searchTerm}
						onChange={(v) => { setTyping(true); setSearchTerm(v); }}
						onSubmit={async () => {
							setTyping(false);
							await fetchProducts(searchTerm);
							setMode(MODES.LIST);
						}}
					/>
				</Box>
				<Text dimColor>ENTER to search • ESC to cancel</Text>
			</Box>
		);
	}

	// ── ADD PRODUCT (admin only) ───────────────────────────────────────────────
	if (mode === MODES.ADD && isAdmin) {
		const addFieldDefs = [
			{ key: 'productName',   label: 'Product Name' },
			{ key: 'categoryID',    label: `Category ID  (${categories.map((c) => `${c.CategoryID}=${c.CategoryName}`).join(' | ')})` },
			{ key: 'price',         label: 'Price (PKR)' },
			{ key: 'stockQuantity', label: 'Stock Quantity' },
		];

		const handleAddSubmit = async () => {
			if (addStep < addFieldDefs.length - 1) {
				setAddStep((s) => s + 1);
				return;
			}
			setLoading(true);
			try {
				await createProduct({
					productName:   addFields.productName,
					categoryID:    Number(addFields.categoryID),
					price:         Number(addFields.price),
					stockQuantity: Number(addFields.stockQuantity),
				});
				setSuccess(`✓ "${addFields.productName}" added.`);
				await fetchProducts();
				goList();
			} catch (err) {
				setError(err.response?.data?.error || 'Failed to add product.');
				goList();
			} finally {
				setLoading(false);
			}
		};

		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Add New Product</Text>
				{addFieldDefs.map((def, i) => {
					if (i > addStep) return null;
					const done = i < addStep;
					return (
						<Box key={def.key} marginTop={1}>
							<Text color="yellow">{def.label}: </Text>
							{done ? (
								<Text color="green">{addFields[def.key]}</Text>
							) : (
								<TextInput
									value={addFields[def.key]}
									onChange={(val) => { setTyping(true); setAddFields((f) => ({ ...f, [def.key]: val })); }}
									onSubmit={() => { setTyping(false); handleAddSubmit(); }}
								/>
							)}
						</Box>
					);
				})}
				<Text dimColor marginTop={1}>ENTER = next field • ESC = cancel</Text>
			</Box>
		);
	}

	// ── UPDATE PRICE (admin only) ─────────────────────────────────────────────
	if (mode === MODES.PRICE && selectedProduct && isAdmin) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">Update Price — {selectedProduct.ProductName}</Text>
				<Text>Current: <Text color="yellow">PKR {selectedProduct.Price}</Text></Text>
				<Box marginTop={1}>
					<Text color="yellow">New Price: </Text>
					<TextInput
						value={newPrice}
						onChange={(v) => { setTyping(true); setNewPrice(v); }}
						onSubmit={async () => {
							setTyping(false);
							const p = Number(newPrice);
							if (!p || p < 0) { setError('Invalid price.'); return; }
							setLoading(true);
							try {
								await updatePrice(selectedProduct.ProductID, p);
								setSuccess(`Price updated to PKR ${p}`);
								await fetchProducts();
							} catch (err) {
								setError(err.response?.data?.error || 'Failed.');
							} finally {
								setLoading(false);
								goList();
							}
						}}
					/>
				</Box>
				<Text dimColor>ENTER to confirm • ESC to cancel</Text>
			</Box>
		);
	}

	// ── DELETE CONFIRM (admin only) ───────────────────────────────────────────
	if (mode === MODES.DELETE && selectedProduct && isAdmin) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="red">Delete "{selectedProduct.ProductName}"?</Text>
				<Text dimColor>This cannot be undone.</Text>
				<Box marginTop={1}>
					<SelectInput
						items={[
							{ label: 'Yes, delete it', value: 'yes' },
							{ label: 'No, keep it',    value: 'no'  },
						]}
						onSelect={async (item) => {
							if (item.value === 'no') { goList(); return; }
							setLoading(true);
							try {
								await deleteProduct(selectedProduct.ProductID);
								setSuccess(`"${selectedProduct.ProductName}" deleted.`);
								setSelectedProduct(null);
								await fetchProducts();
							} catch (err) {
								setError(err.response?.data?.error || 'Failed to delete.');
							} finally {
								setLoading(false);
								goList();
							}
						}}
					/>
				</Box>
			</Box>
		);
	}

	// ── PRODUCT DETAIL / ADD TO CART (customer) ───────────────────────────────
	if (mode === MODES.DETAIL && selectedProduct) {
		const inCart     = cart?.find((c) => c.productId === selectedProduct.ProductID);
		const cartQty    = inCart?.quantity || 0;

		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">{selectedProduct.ProductName}</Text>
				<Text>Category : <Text color="white">{selectedProduct.CategoryName}</Text></Text>
				<Text>Price     : <Text color="green">PKR {selectedProduct.Price}</Text></Text>
				<Text>In Stock  : <Text color={selectedProduct.StockQuantity > 0 ? 'green' : 'red'}>{selectedProduct.StockQuantity}</Text></Text>
				{cartQty > 0 && <Text color="yellow">In your cart: {cartQty}</Text>}

				<Box marginTop={1} flexDirection="column">
					<Text color="yellow">Quantity to add: </Text>
					<TextInput
						value={qtyInput}
						onChange={(v) => { setTyping(true); setQtyInput(v); }}
						onSubmit={() => {
							setTyping(false);
							const qty = Number(qtyInput);
							if (!qty || qty <= 0) { setError('Enter a valid quantity.'); return; }
							if (qty > selectedProduct.StockQuantity) {
								setError(`Only ${selectedProduct.StockQuantity} in stock.`);
								return;
							}
							setCart((prev) => {
								const existing = prev.find((c) => c.productId === selectedProduct.ProductID);
								if (existing) {
									return prev.map((c) =>
										c.productId === selectedProduct.ProductID
											? { ...c, quantity: c.quantity + qty }
											: c,
									);
								}
								return [...prev, {
									productId:   selectedProduct.ProductID,
									productName: selectedProduct.ProductName,
									price:       selectedProduct.Price,
									quantity:    qty,
								}];
							});
							setSuccess(`Added ${qty}× ${selectedProduct.ProductName} to cart.`);
							setQtyInput('1');
							goList();
						}}
					/>
				</Box>
				<Text dimColor>ENTER = add to cart • ESC = back</Text>
			</Box>
		);
	}

	// ── PRODUCT LIST ──────────────────────────────────────────────────────────
	const totalPages  = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
	const safePage    = Math.min(page, totalPages - 1);
	const pageProducts = products.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

	const productItems = pageProducts.map((p) => {
		const inCart  = cart?.find((c) => c.productId === p.ProductID);
		const cartTag = inCart ? ` [cart:${inCart.quantity}]` : '';
		return {
			label: `${p.ProductName.padEnd(26)} PKR ${String(p.Price).padStart(7)}  stk:${String(p.StockQuantity).padStart(4)}  [${p.CategoryName}]${cartTag}`,
			value: p,
		};
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box>
				<Text bold color="green">
					Products{searchTerm ? `  — "${searchTerm}"` : ''}
				</Text>
				{cart && cart.length > 0 && (
					<Text color="yellow">   🛒 {cart.length} item(s) in cart  (go to Orders → C)</Text>
				)}
			</Box>

			{error   && <Text color="red"   marginTop={0}>✗ {error}</Text>}
			{success && <Text color="green" marginTop={0}>✓ {success}</Text>}

			{loading ? (
				<Text color="cyan">Loading…</Text>
			) : products.length === 0 ? (
				<Text dimColor>No products found.</Text>
			) : (
				<SelectInput
					items={productItems}
					onSelect={(item) => {
						setSelectedProduct(item.value);
						setError('');
						setSuccess('');
						if (isAdmin) {
							setMode(MODES.PRICE);
						} else {
							setQtyInput('1');
							setMode(MODES.DETAIL);
						}
					}}
				/>
			)}

			{/* Pagination footer */}
			{!loading && products.length > PAGE_SIZE && (
				<Box marginTop={0}>
					<Text dimColor>
						{'  '}Products {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, products.length)} of {products.length}
						{'   '}P = prev page  •  N = next page{'   '}(page {safePage + 1}/{totalPages})
					</Text>
				</Box>
			)}

			<Box marginTop={1} flexDirection="column">
				{isAdmin ? (
					<Text dimColor>ENTER = edit price • S = search • A = add • D = delete selected</Text>
				) : (
					<Text dimColor>ENTER = view / add to cart • S = search</Text>
				)}
			</Box>

			{/* Admin: delete hint */}
			{isAdmin && selectedProduct && mode === MODES.LIST && (
				<Box marginTop={0}>
					<Text dimColor>Selected: </Text>
					<Text color="cyan">{selectedProduct.ProductName}</Text>
					<Text dimColor>  — press </Text>
					<Text color="red">D</Text>
					<Text dimColor> to delete</Text>
				</Box>
			)}
		</Box>
	);
}