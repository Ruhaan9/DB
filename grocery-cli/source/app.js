// source/app.js
import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import LoginScreen from './screens/LoginScreen.js';
import ProductsScreen from './screens/ProductsScreen.js';
import OrdersScreen from './screens/OrdersScreen.js';
import AnalyticsScreen from './screens/AnalyticsScreen.js';

const TABS = [
	{key: 'products', label: '1 Products'},
	{key: 'orders', label: '2 Orders'},
	{key: 'analytics', label: '3 Analytics'},
];

export default function App() {
	const [user, setUser] = useState(null);
	const [activeTab, setActiveTab] = useState('products');

	useInput((input) => {
		if (!user) return;
		if (input === '1') setActiveTab('products');
		if (input === '2') setActiveTab('orders');
		if (input === '3') setActiveTab('analytics');
	});

	// ── Not logged in ─────────────────────────────────────────────────────────
	if (!user) {
		return <LoginScreen onLogin={setUser} />;
	}

	// ── Main shell ────────────────────────────────────────────────────────────
	return (
		<Box flexDirection="column">
			{/* Top bar */}
			<Box borderStyle="single" borderColor="green" paddingX={1}>
				<Text bold color="green">
					🛒 Grocery Store
				</Text>
				<Text> — </Text>
				<Text color="cyan">{user.username}</Text>
				<Text>  </Text>
				{TABS.map((tab) => (
					<Box key={tab.key} marginRight={2}>
						<Text
							bold={activeTab === tab.key}
							color={activeTab === tab.key ? 'yellow' : 'white'}
							underline={activeTab === tab.key}
						>
							[{tab.label}]
						</Text>
					</Box>
				))}
				<Text dimColor>  Q to quit</Text>
			</Box>

			{/* Screen */}
			<Box flexGrow={1}>
				{activeTab === 'products' && <ProductsScreen />}
				{activeTab === 'orders' && <OrdersScreen />}
				{activeTab === 'analytics' && <AnalyticsScreen />}
			</Box>
		</Box>
	);
}