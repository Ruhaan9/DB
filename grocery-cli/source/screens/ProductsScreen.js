// source/screens/ProductsScreen.js
import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import {
	getProducts,
	createProduct,
	updatePrice,
	deleteProduct,
	getCategories,
} from '../api.js';

const MODES = {
	LIST: 'list',
	SEARCH: 'search',
	ADD: 'add',
	PRICE: 'price',
	DELETE: 'delete',
};

export default function ProductsScreen() {
	const [mode, setMode] = useState(MODES.LIST);
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedProduct, setSelectedProduct] = useState(null);

	// Add product form fields
	const [addFields, setAddFields] = useState({
		productName: '',
		categoryID: '',
		price: '',
		stockQuantity: '',
	});
	const [addStep, setAddStep] = useState(0);

	// Price update
	const [newPrice, setNewPrice] = useState('');

	useEffect(() => {
		fetchProducts();
		fetchCategories();
	}, []);

	const fetchProducts = async (search = '') => {
		setLoading(true);
		setError('');
		try {
			const res = await getProducts(search ? {search} : {});
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

	useInput((input, key) => {
		if (mode === MODES.LIST) {
			if (input === 's') setMode(MODES.SEARCH);
			if (input === 'a') {
				setAddStep(0);
				setAddFields({
					productName: '',
					categoryID: '',
					price: '',
					stockQuantity: '',
				});
				setMode(MODES.ADD);
			}
			if (key.escape) {
				setError('');
				setSuccess('');
			}
		}

		if (
			mode === MODES.SEARCH ||
			mode === MODES.ADD ||
			mode === MODES.PRICE ||
			mode === MODES.DELETE
		) {
			if (key.escape) {
				setMode(MODES.LIST);
				setError('');
				setSuccess('');
			}
		}
	});

	// ── Search ────────────────────────────────────────────────────────────────
	if (mode === MODES.SEARCH) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">
					Search Products
				</Text>
				<Box marginTop={1}>
					<Text color="yellow">Name: </Text>
					<TextInput
						value={searchTerm}
						onChange={setSearchTerm}
						onSubmit={async () => {
							await fetchProducts(searchTerm);
							setMode(MODES.LIST);
						}}
					/>
				</Box>
				<Text dimColor>ENTER to search • ESC to cancel</Text>
			</Box>
		);
	}

	// ── Add Product ───────────────────────────────────────────────────────────
	if (mode === MODES.ADD) {
		const addFieldDefs = [
			{key: 'productName', label: 'Product Name'},
			{key: 'categoryID', label: `Category ID (${categories.map((c) => `${c.CategoryID}=${c.CategoryName}`).join(', ')})`},
			{key: 'price', label: 'Price'},
			{key: 'stockQuantity', label: 'Stock Quantity'},
		];
		const currentDef = addFieldDefs[addStep];

		const handleAddSubmit = async () => {
			if (addStep < addFieldDefs.length - 1) {
				setAddStep((s) => s + 1);
				return;
			}

			setLoading(true);
			try {
				await createProduct({
					productName: addFields.productName,
					categoryID: Number(addFields.categoryID),
					price: Number(addFields.price),
					stockQuantity: Number(addFields.stockQuantity),
				});
				setSuccess('Product added!');
				await fetchProducts();
				setMode(MODES.LIST);
			} catch (err) {
				setError(err.response?.data?.error || 'Failed to add product.');
				setMode(MODES.LIST);
			} finally {
				setLoading(false);
			}
		};

		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">
					Add New Product
				</Text>
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
									onChange={(val) =>
										setAddFields((f) => ({...f, [def.key]: val}))
									}
									onSubmit={handleAddSubmit}
								/>
							)}
						</Box>
					);
				})}
				<Text dimColor marginTop={1}>
					ENTER to confirm • ESC to cancel
				</Text>
			</Box>
		);
	}

	// ── Update Price ──────────────────────────────────────────────────────────
	if (mode === MODES.PRICE && selectedProduct) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">
					Update Price: {selectedProduct.ProductName}
				</Text>
				<Text>
					Current price:{' '}
					<Text color="yellow">{selectedProduct.Price}</Text>
				</Text>
				<Box marginTop={1}>
					<Text color="yellow">New Price: </Text>
					<TextInput
						value={newPrice}
						onChange={setNewPrice}
						onSubmit={async () => {
							setLoading(true);
							try {
								await updatePrice(selectedProduct.ProductID, Number(newPrice));
								setSuccess(`Price updated to ${newPrice}`);
								await fetchProducts();
							} catch (err) {
								setError(err.response?.data?.error || 'Failed.');
							} finally {
								setLoading(false);
								setMode(MODES.LIST);
								setNewPrice('');
							}
						}}
					/>
				</Box>
				<Text dimColor>ENTER to confirm • ESC to cancel</Text>
			</Box>
		);
	}

	// ── Product List with actions ─────────────────────────────────────────────
	const productItems = products.map((p) => ({
		label: `${p.ProductName.padEnd(25)} PKR ${String(p.Price).padStart(6)}  Stock: ${p.StockQuantity}  [${p.CategoryName}]`,
		value: p,
	}));

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="green">
				Products{searchTerm ? ` — search: "${searchTerm}"` : ''}
			</Text>

			{error && <Text color="red">✗ {error}</Text>}
			{success && <Text color="green">✓ {success}</Text>}

			{loading ? (
				<Text color="cyan">Loading...</Text>
			) : products.length === 0 ? (
				<Text dimColor>No products found.</Text>
			) : (
				<SelectInput
					items={productItems}
					onSelect={(item) => {
						setSelectedProduct(item.value);
						setNewPrice('');
						setMode(MODES.PRICE);
					}}
				/>
			)}

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>ENTER = update price • S = search • A = add product</Text>
				{selectedProduct && (
					<Box marginTop={1}>
						<Text>Selected: </Text>
						<Text color="cyan">{selectedProduct.ProductName}</Text>
						<Text> — D to delete</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
}