// source/screens/AnalyticsScreen.js
import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {
	getOrdersFull,
	getBestSellers,
	getInactiveUsers,
	getGenderSales,
	getTopSeller,
	getMonthlyRevenue,
	getRFM,
	getRevenueByGender,
	getTopPerGender,
} from '../api.js';

const REPORTS = [
	{label: 'Q11 — All orders (name, age, gender, total)', key: 'orders_full'},
	{label: 'Q12/13 — Best-selling products by gender', key: 'best_sellers'},
	{label: 'Q14 — Inactive customers (no orders)', key: 'inactive'},
	{label: 'Q16 — All products: male vs female purchases', key: 'gender_sales'},
	{label: 'Q18 — #1 best-selling product breakdown', key: 'top_seller'},
	{label: 'Q20 — Monthly revenue with MoM % change', key: 'monthly_revenue'},
	{label: 'Q21 — RFM customer segmentation', key: 'rfm'},
	{label: 'Q22 — Revenue & avg order value by gender', key: 'revenue_gender'},
	{label: 'Q24 — Top product per gender', key: 'top_per_gender'},
];

function DataTable({rows, columns}) {
	if (!rows || rows.length === 0) {
		return <Text dimColor>No data returned.</Text>;
	}

	return (
		<Box flexDirection="column">
			{/* Header */}
			<Box>
				{columns.map((col) => (
					<Box key={col.key} width={col.width || 18}>
						<Text bold color="cyan">
							{String(col.label).slice(0, (col.width || 18) - 1)}
						</Text>
					</Box>
				))}
			</Box>
			<Text dimColor>{'─'.repeat(columns.reduce((s, c) => s + (c.width || 18), 0))}</Text>
			{/* Rows */}
			{rows.slice(0, 20).map((row, i) => (
				<Box key={i}>
					{columns.map((col) => {
						const val = row[col.key];
						const display =
							val == null
								? '—'
								: typeof val === 'number'
								? col.decimal
									? val.toFixed(2)
									: String(val)
								: String(val);
						return (
							<Box key={col.key} width={col.width || 18}>
								<Text>{display.slice(0, (col.width || 18) - 1)}</Text>
							</Box>
						);
					})}
				</Box>
			))}
			{rows.length > 20 && (
				<Text dimColor>...and {rows.length - 20} more rows</Text>
			)}
		</Box>
	);
}

export default function AnalyticsScreen() {
	const [view, setView] = useState('menu'); // 'menu' | report key
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useInput((input, key) => {
		if (key.escape) {
			setView('menu');
			setData(null);
			setError('');
		}
	});

	const runReport = async (key) => {
		setLoading(true);
		setError('');
		setData(null);
		setView(key);
		try {
			let res;
			if (key === 'orders_full') res = await getOrdersFull();
			else if (key === 'best_sellers') res = await getBestSellers(1);
			else if (key === 'inactive') res = await getInactiveUsers();
			else if (key === 'gender_sales') res = await getGenderSales();
			else if (key === 'top_seller') res = await getTopSeller();
			else if (key === 'monthly_revenue') res = await getMonthlyRevenue();
			else if (key === 'rfm') res = await getRFM();
			else if (key === 'revenue_gender') res = await getRevenueByGender();
			else if (key === 'top_per_gender') res = await getTopPerGender();
			setData(Array.isArray(res.data) ? res.data : [res.data]);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to load report.');
		} finally {
			setLoading(false);
		}
	};

	const columnMap = {
		orders_full: [
			{key: 'OrderID', label: 'Order ID', width: 10},
			{key: 'Username', label: 'Customer', width: 18},
			{key: 'Age', label: 'Age', width: 6},
			{key: 'Gender', label: 'Gender', width: 10},
			{key: 'OrderDate', label: 'Date', width: 14},
			{key: 'TotalAmount', label: 'Total (PKR)', width: 14, decimal: true},
		],
		best_sellers: [
			{key: 'ProductName', label: 'Product', width: 22},
			{key: 'Gender', label: 'Gender', width: 10},
			{key: 'TotalSold', label: 'Units Sold', width: 12},
		],
		inactive: [
			{key: 'Username', label: 'Username', width: 18},
			{key: 'Email', label: 'Email', width: 26},
			{key: 'Age', label: 'Age', width: 6},
			{key: 'Gender', label: 'Gender', width: 10},
		],
		gender_sales: [
			{key: 'ProductName', label: 'Product', width: 22},
			{key: 'Price', label: 'Price', width: 10, decimal: true},
			{key: 'MalePurchases', label: 'Male', width: 8},
			{key: 'FemalePurchases', label: 'Female', width: 8},
		],
		top_seller: [
			{key: 'ProductName', label: 'Product', width: 22},
			{key: 'TotalUnitsSold', label: 'Total Units', width: 13},
			{key: 'MaleUnits', label: 'Male', width: 8},
			{key: 'FemaleUnits', label: 'Female', width: 8},
			{key: 'AvgBuyerAge', label: 'Avg Age', width: 9},
		],
		monthly_revenue: [
			{key: 'Month', label: 'Month', width: 12},
			{key: 'Gender', label: 'Gender', width: 10},
			{key: 'Revenue', label: 'Revenue', width: 12, decimal: true},
			{key: 'PrevMonthRevenue', label: 'Prev Month', width: 13, decimal: true},
			{key: 'GrowthPct', label: 'Growth %', width: 10, decimal: true},
		],
		rfm: [
			{key: 'Username', label: 'Customer', width: 16},
			{key: 'Gender', label: 'Gender', width: 8},
			{key: 'AgeBracket', label: 'Age', width: 8},
			{key: 'Recency', label: 'Recency', width: 9},
			{key: 'Frequency', label: 'Freq', width: 6},
			{key: 'Monetary', label: 'Spend', width: 10, decimal: true},
			{key: 'Segment', label: 'Segment', width: 12},
		],
		revenue_gender: [
			{key: 'Gender', label: 'Gender', width: 10},
			{key: 'TotalOrders', label: 'Orders', width: 8},
			{key: 'AvgOrderValue', label: 'Avg Order', width: 12, decimal: true},
			{key: 'TotalRevenue', label: 'Total Rev', width: 14, decimal: true},
			{key: 'AvgAge', label: 'Avg Age', width: 9},
		],
		top_per_gender: [
			{key: 'Gender', label: 'Gender', width: 10},
			{key: 'ProductName', label: 'Top Product', width: 24},
			{key: 'TotalUnits', label: 'Units Sold', width: 12},
		],
	};

	// ── Menu ──────────────────────────────────────────────────────────────────
	if (view === 'menu') {
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="green">
					Analytics Reports
				</Text>
				<Text dimColor>Select a report to run:</Text>
				<Box marginTop={1}>
					<SelectInput
						items={REPORTS.map((r) => ({label: r.label, value: r.key}))}
						onSelect={(item) => runReport(item.value)}
					/>
				</Box>
			</Box>
		);
	}

	// ── Report View ───────────────────────────────────────────────────────────
	const report = REPORTS.find((r) => r.key === view);
	const columns = columnMap[view] || [];

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				{report?.label}
			</Text>

			{loading && <Text color="cyan">Running query...</Text>}
			{error && <Text color="red">✗ {error}</Text>}

			{data && !loading && (
				<Box marginTop={1}>
					<DataTable rows={data} columns={columns} />
				</Box>
			)}

			<Text dimColor marginTop={1}>
				ESC to go back
			</Text>
		</Box>
	);
}