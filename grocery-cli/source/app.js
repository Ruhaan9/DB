// source/app.js
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { isTyping } from './typingContext.js';
import LoginScreen     from './screens/LoginScreen.js';
import ProductsScreen  from './screens/ProductsScreen.js';
import OrdersScreen    from './screens/OrdersScreen.js';
import AnalyticsScreen from './screens/AnalyticsScreen.js';

// ── Suppress stray stderr noise bleeding into the Ink UI ─────────────────────
const _write = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...args) => {
	const s = typeof chunk === 'string' ? chunk : chunk.toString();
	if (s.includes('node_modules/ink') || s.includes('at ink-box') || s.includes('at ink-')) return true;
	return _write(chunk, ...args);
};

const TABS = [
	{ key: 'products',  label: 'Products',  num: '1' },
	{ key: 'orders',    label: 'Orders',    num: '2' },
	{ key: 'analytics', label: 'Analytics', num: '3' },
];

function Divider({ color }) {
	return <Box><Text color={color}>{'━'.repeat(110)}</Text></Box>;
}

export default function App() {
	const [user, setUser]           = useState(null);
	const [activeTab, setActiveTab] = useState('products');
	const [cart, setCart]           = useState([]);

	useInput((input) => {
		if (!user) return;
		if (isTyping()) return;   // suppress while any TextInput is focused
		if (input === '1') setActiveTab('products');
		if (input === '2') setActiveTab('orders');
		if (input === '3') setActiveTab('analytics');
		if (input === 'q' || input === 'Q') process.exit(0);
	});

	if (!user) {
		return <LoginScreen onLogin={(u) => { setUser(u); setCart([]); }} />;
	}

	const isAdmin     = user.role === 'admin';
	const accent      = isAdmin ? 'red' : 'green';
	const cartCount   = cart.reduce((s, c) => s + c.quantity, 0);
	const cartValue   = cart.reduce((s, c) => s + c.price * c.quantity, 0);

	return (
		<Box flexDirection="column">

			{/* ── Row 1: brand / role / user / cart ── */}
			<Box paddingX={2} paddingTop={1} paddingBottom={0}>
				<Text bold color={accent}>🛒 GROCERY STORE</Text>
				<Text>   </Text>
				<Box borderStyle="round" borderColor={accent} paddingX={1} marginRight={3}>
					<Text bold color={accent}>{isAdmin ? '⚙  ADMIN' : '◉  CUSTOMER'}</Text>
				</Box>
				<Text dimColor>signed in as </Text>
				<Text bold color="cyan">{user.username}</Text>
				<Text>   </Text>
				{!isAdmin && (
					cartCount > 0
						? <Box borderStyle="round" borderColor="yellow" paddingX={1} marginRight={2}>
								<Text bold color="yellow">🛒  {cartCount} items  ·  PKR {cartValue.toFixed(2)}</Text>
							</Box>
						: <Box borderStyle="round" borderColor="gray" paddingX={1} marginRight={2}>
								<Text dimColor>cart empty</Text>
							</Box>
				)}
				<Box flexGrow={1} justifyContent="flex-end">
					<Text dimColor>Q = quit</Text>
				</Box>
			</Box>

			{/* ── Row 2: tab bar ── */}
			<Box paddingX={2} paddingTop={1} paddingBottom={0}>
				{TABS.map((tab) => {
					const active = activeTab === tab.key;
					return active ? (
						<Box key={tab.key} borderStyle="single" borderColor={accent} paddingX={2} marginRight={1}>
							<Text bold color={accent}>{tab.num}  {tab.label.toUpperCase()}</Text>
						</Box>
					) : (
						<Box key={tab.key} paddingX={3} marginRight={1}>
							<Text dimColor>{tab.num}  {tab.label}</Text>
						</Box>
					);
				})}
			</Box>

			{/* ── Divider ── */}
			<Box paddingX={0} marginTop={0}>
				<Divider color={accent} />
			</Box>

			{/* ── Screen content ── */}
			<Box flexGrow={1} flexDirection="column" paddingX={1}>
				{activeTab === 'products'  && <ProductsScreen  user={user} cart={cart} setCart={setCart} />}
				{activeTab === 'orders'    && <OrdersScreen    user={user} cart={cart} setCart={setCart} />}
				{activeTab === 'analytics' && <AnalyticsScreen user={user} />}
			</Box>

		</Box>
	);
}