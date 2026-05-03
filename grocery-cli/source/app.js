// source/app.js
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { isTyping } from './typingContext.js';
import LoginScreen     from './screens/LoginScreen.js';
import ProductsScreen  from './screens/ProductsScreen.js';
import OrdersScreen    from './screens/OrdersScreen.js';
import AnalyticsScreen from './screens/AnalyticsScreen.js';

const TABS = ['products', 'orders', 'analytics'];
const TAB_LABELS = { products: 'Products', orders: 'Orders', analytics: 'Analytics' };

export default function App() {
	const [user, setUser]           = useState(null);
	const [tabIdx, setTabIdx]       = useState(0);
	const [cart, setCart]           = useState([]);

	const activeTab = TABS[tabIdx];

	useInput((_input, key) => {
		if (!user) return;
		if (isTyping()) return;
		// ← / → to cycle tabs — no conflict with SelectInput (up/down) or TextInput
		if (key.leftArrow)  setTabIdx((i) => (i - 1 + TABS.length) % TABS.length);
		if (key.rightArrow) setTabIdx((i) => (i + 1) % TABS.length);
		if (_input === 'q' || _input === 'Q') process.exit(0);
	});

	if (!user) {
		return <LoginScreen onLogin={(u) => { setUser(u); setCart([]); }} />;
	}

	const isAdmin   = user.role === 'admin';
	const accent    = isAdmin ? 'red' : 'green';
	const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
	const cartValue = cart.reduce((s, c) => s + c.price * c.quantity, 0);

	return (
		<Box flexDirection="column">

			{/* ══ HEADER — single bordered bar ════════════════════════════════ */}
			<Box borderStyle="double" borderColor={accent} paddingX={2} paddingY={0} marginX={1} marginTop={1}>

				{/* Brand */}
				<Text bold color={accent}>🛒 GROCERY</Text>

				{/* Separator */}
				<Text color={accent}>  ║  </Text>

				{/* Role + user */}
				<Text bold color={isAdmin ? 'red' : 'cyan'}>
					{isAdmin ? '⚙ ' : ''}
				</Text>
				<Text bold color="cyan">{user.username}</Text>
				<Text dimColor>  {isAdmin ? '[admin]' : '[customer]'}</Text>

				{/* Separator */}
				<Text color={accent}>  ║  </Text>

				{/* Tabs */}
				<Text dimColor>← </Text>
				{TABS.map((tab, i) => {
					const active = tabIdx === i;
					return (
						<Box key={tab} marginX={1}>
							{active ? (
								<Text bold color={accent}>[ {TAB_LABELS[tab].toUpperCase()} ]</Text>
							) : (
								<Text dimColor>  {TAB_LABELS[tab]}  </Text>
							)}
						</Box>
					);
				})}
				<Text dimColor> →</Text>

				{/* Separator */}
				<Text color={accent}>  ║  </Text>

				{/* Cart (customers only) */}
				{!isAdmin && (
					cartCount > 0
						? <Text bold color="yellow">🛒 {cartCount} · PKR {cartValue.toFixed(0)}</Text>
						: <Text dimColor>cart empty</Text>
				)}
				{isAdmin && <Text dimColor>full access</Text>}

				{/* Quit */}
				<Text color={accent}>  ║  </Text>
				<Text dimColor>Q quit</Text>

			</Box>

			{/* ══ SCREEN ═══════════════════════════════════════════════════════ */}
			<Box flexGrow={1} flexDirection="column" paddingX={2} marginX={1}>
				{activeTab === 'products'  && <ProductsScreen  user={user} cart={cart} setCart={setCart} />}
				{activeTab === 'orders'    && <OrdersScreen    user={user} cart={cart} setCart={setCart} />}
				{activeTab === 'analytics' && <AnalyticsScreen user={user} />}
			</Box>

		</Box>
	);
}