// source/screens/AnalyticsScreen.js
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput   from 'ink-text-input';
import { setTyping } from '../typingContext.js';
import {
	getOrdersFull, getCostByGender, getBestSellers, getInactiveUsers,
	getAboveAvgPrice, getGenderSales, getTopSeller, getBoughtTogether,
	getMonthlyRevenue, getRFM, getRevenueByGender, getSpendingPatterns,
	getTopPerGender, getAllWithBuyers, getFullOuter,
	getFemaleUnderPrice,
} from '../api.js';

// ── Report catalogue ──────────────────────────────────────────────────────────
// adminOnly: true means customers won't see it in the menu
const REPORTS = [
	{ label: '◆  Products bought by Female under price',  key: 'female_price',   adminOnly: false, hasParam: true,  paramLabel: 'Max Price (PKR)', paramDefault: '500'  },
	{ label: '◆  All orders (name, age, gender, total)',  key: 'orders_full',    adminOnly: true  },
	{ label: '◆  Order cost by gender',                   key: 'cost_gender',    adminOnly: true  },
	{ label: '◆  Best-selling products by gender',        key: 'best_sellers',   adminOnly: false, hasParam: true,  paramLabel: 'Min Units Sold',  paramDefault: '1'    },
	{ label: '◆  Inactive customers (no orders)',         key: 'inactive',       adminOnly: true  },
	{ label: '◆  Products above average price',           key: 'above_avg',      adminOnly: false },
	{ label: '◆  Products: male vs female purchases',     key: 'gender_sales',   adminOnly: false },
	{ label: '◆  Top-selling product breakdown',      key: 'top_seller',     adminOnly: false },
	{ label: '◆  Products bought together (market basket)',key:'bought_together', adminOnly: true,  hasParam: true,  paramLabel: 'Min Co-purchases', paramDefault: '2'   },
	{ label: '◆  Monthly revenue with MoM % change',     key: 'monthly_revenue',adminOnly: true  },
	{ label: '◆  RFM customer segmentation',             key: 'rfm',            adminOnly: true  },
	{ label: '◆  Revenue & avg order value by gender',   key: 'revenue_gender', adminOnly: true  },
	{ label: '◆  Spending patterns by age & gender',     key: 'spending',       adminOnly: true  },
	{ label: '◆  Top product per gender',                key: 'top_per_gender', adminOnly: false },
	{ label: '◆  All products with buyer demographics',  key: 'all_buyers',     adminOnly: true  },
	{ label: '◆  Full outer: all products + all orders', key: 'full_outer',     adminOnly: true  },
];

// ── Column definitions for DataTable ─────────────────────────────────────────
const COLUMNS = {
	female_price:    [
		{ key: 'ProductID',   label: 'ID',      width: 6  },
		{ key: 'ProductName', label: 'Product',  width: 28 },
		{ key: 'Price',       label: 'Price',    width: 10, decimal: true },
	],
	orders_full: [
		{ key: 'OrderID',     label: 'Order',    width: 8  },
		{ key: 'Username',    label: 'Customer', width: 18 },
		{ key: 'Age',         label: 'Age',      width: 5  },
		{ key: 'Gender',      label: 'Gender',   width: 8  },
		{ key: 'OrderDate',   label: 'Date',     width: 13, isDate: true },
		{ key: 'TotalAmount', label: 'Total',    width: 12, decimal: true },
	],
	cost_gender: [
		{ key: 'OrderID',         label: 'Order',  width: 8  },
		{ key: 'Gender',          label: 'Gender', width: 10 },
		{ key: 'TotalOrderPrice', label: 'Total',  width: 14, decimal: true },
	],
	best_sellers: [
		{ key: 'ProductName', label: 'Product',    width: 26 },
		{ key: 'Gender',      label: 'Gender',     width: 10 },
		{ key: 'TotalSold',   label: 'Units Sold', width: 12 },
	],
	inactive: [
		{ key: 'Username', label: 'Username', width: 18 },
		{ key: 'Email',    label: 'Email',    width: 28 },
		{ key: 'Age',      label: 'Age',      width: 5  },
		{ key: 'Gender',   label: 'Gender',   width: 10 },
	],
	above_avg: [
		{ key: 'ProductName',  label: 'Product',      width: 26 },
		{ key: 'Price',        label: 'Price',        width: 10, decimal: true },
		{ key: 'TopAgeBracket',label: 'Top Age Group',width: 14 },
	],
	gender_sales: [
		{ key: 'ProductName',     label: 'Product', width: 24 },
		{ key: 'Price',           label: 'Price',   width: 10, decimal: true },
		{ key: 'MalePurchases',   label: 'Male',    width: 8  },
		{ key: 'FemalePurchases', label: 'Female',  width: 8  },
	],
	top_seller: [
		{ key: 'ProductName',    label: 'Product',     width: 24 },
		{ key: 'TotalUnitsSold', label: 'Total Units', width: 13 },
		{ key: 'MaleUnits',      label: 'Male',        width: 8  },
		{ key: 'FemaleUnits',    label: 'Female',      width: 8  },
		{ key: 'AvgBuyerAge',    label: 'Avg Age',     width: 9, decimal: true },
	],
	bought_together: [
		{ key: 'ProductA',           label: 'Product A',   width: 22 },
		{ key: 'ProductB',           label: 'Product B',   width: 22 },
		{ key: 'TimesBoughtTogether',label: 'Together',    width: 10 },
		{ key: 'SupportPct',         label: 'Support%',    width: 10, decimal: true },
	],
	monthly_revenue: [
		{ key: 'Month',            label: 'Month',   width: 10 },
		{ key: 'Gender',           label: 'Gender',  width: 9  },
		{ key: 'Revenue',          label: 'Revenue', width: 12, decimal: true },
		{ key: 'PrevMonthRevenue', label: 'Prev Mo', width: 12, decimal: true },
		{ key: 'GrowthPct',        label: 'Growth%', width: 10, decimal: true },
	],
	rfm: [
		{ key: 'Username',   label: 'Customer',  width: 16 },
		{ key: 'Gender',     label: 'Gender',    width: 8  },
		{ key: 'AgeBracket', label: 'Age',       width: 8  },
		{ key: 'Recency',    label: 'Recency',   width: 9  },
		{ key: 'Frequency',  label: 'Freq',      width: 6  },
		{ key: 'Monetary',   label: 'Spend',     width: 10, decimal: true },
		{ key: 'Segment',    label: 'Segment',   width: 12 },
	],
	revenue_gender: [
		{ key: 'Gender',        label: 'Gender',    width: 10 },
		{ key: 'TotalOrders',   label: 'Orders',    width: 8  },
		{ key: 'AvgOrderValue', label: 'Avg Order', width: 12, decimal: true },
		{ key: 'TotalRevenue',  label: 'Total Rev', width: 14, decimal: true },
		{ key: 'AvgAge',        label: 'Avg Age',   width: 9, decimal: true },
	],
	spending: [
		{ key: 'AgeBracket',       label: 'Age Group', width: 10 },
		{ key: 'Gender',           label: 'Gender',    width: 8  },
		{ key: 'Orders',           label: 'Orders',    width: 8  },
		{ key: 'AvgSpend',         label: 'Avg Spend', width: 12, decimal: true },
		{ key: 'FavouriteProduct', label: 'Fav Product',width: 20 },
	],
	top_per_gender: [
		{ key: 'Gender',      label: 'Gender',     width: 10 },
		{ key: 'ProductName', label: 'Top Product',width: 26 },
		{ key: 'TotalUnits',  label: 'Units Sold', width: 12 },
	],
	all_buyers: [
		{ key: 'ProductName', label: 'Product',  width: 22 },
		{ key: 'Price',       label: 'Price',    width: 8, decimal: true },
		{ key: 'OrderID',     label: 'Order',    width: 8  },
		{ key: 'Username',    label: 'Customer', width: 16 },
		{ key: 'Gender',      label: 'Gender',   width: 8  },
	],
	full_outer: [
		{ key: 'ProductName', label: 'Product',  width: 22 },
		{ key: 'Price',       label: 'Price',    width: 8, decimal: true },
		{ key: 'OrderID',     label: 'Order',    width: 8  },
		{ key: 'Quantity',    label: 'Qty',      width: 5  },
		{ key: 'Username',    label: 'Customer', width: 16 },
	],
};

// ── DataTable with pagination ─────────────────────────────────────────────────
const PAGE_SIZE = 15;

function DataTable({ rows, columns }) {
	const [page, setPage] = useState(0);

	useInput((input, key) => {
		const maxPage = Math.ceil(rows.length / PAGE_SIZE) - 1;
		if (key.rightArrow || input === 'n') setPage((p) => Math.min(p + 1, maxPage));
		if (key.leftArrow  || input === 'p') setPage((p) => Math.max(p - 1, 0));
	});

	if (!rows || rows.length === 0) {
		return <Text dimColor>No data returned.</Text>;
	}

	const totalPages = Math.ceil(rows.length / PAGE_SIZE);
	const pageRows   = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
	const totalWidth = columns.reduce((s, c) => s + (c.width || 18), 0);

	const fmtVal = (val, col) => {
		if (val == null) return '—';
		if (col.isDate)   return new Date(val).toLocaleDateString();
		if (col.decimal)  return typeof val === 'number' ? val.toFixed(2) : val;
		return String(val);
	};

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
			<Text dimColor>{'─'.repeat(Math.min(totalWidth, 100))}</Text>

			{/* Rows */}
			{pageRows.map((row, i) => (
				<Box key={i}>
					{columns.map((col) => {
						const display = fmtVal(row[col.key], col);
						return (
							<Box key={col.key} width={col.width || 18}>
								<Text>{String(display).slice(0, (col.width || 18) - 1)}</Text>
							</Box>
						);
					})}
				</Box>
			))}

			{/* Pagination */}
			<Box marginTop={1}>
				<Text dimColor>
					Rows {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}
					{totalPages > 1 ? `   ← P / N → for pages  (page ${page + 1}/${totalPages})` : ''}
				</Text>
			</Box>
		</Box>
	);
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AnalyticsScreen({ user }) {
	const isAdmin = user?.role === 'admin';

	const [view, setView]       = useState('menu');
	const [data, setData]       = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError]     = useState('');
	const [paramVal, setParamVal] = useState('');
	const [awaitParam, setAwaitParam] = useState(false); // waiting for param input
	const [pendingKey, setPendingKey] = useState('');

	useInput((input, key) => {
		if (key.escape) {
			if (awaitParam) { setAwaitParam(false); setPendingKey(''); return; }
			setView('menu');
			setData(null);
			setError('');
		}
	});

	const visibleReports = REPORTS.filter((r) => isAdmin || !r.adminOnly);

	const runReport = async (key, param) => {
		setLoading(true);
		setError('');
		setData(null);
		setView(key);
		try {
			let res;
			switch (key) {
				case 'female_price':    res = await getFemaleUnderPrice(Number(param) || 500); break;
				case 'orders_full':     res = await getOrdersFull();        break;
				case 'cost_gender':     res = await getCostByGender();      break;
				case 'best_sellers':    res = await getBestSellers(Number(param) || 1); break;
				case 'inactive':        res = await getInactiveUsers();     break;
				case 'above_avg':       res = await getAboveAvgPrice();     break;
				case 'gender_sales':    res = await getGenderSales();       break;
				case 'top_seller':      res = await getTopSeller();         break;
				case 'bought_together': res = await getBoughtTogether(Number(param) || 2); break;
				case 'monthly_revenue': res = await getMonthlyRevenue();    break;
				case 'rfm':             res = await getRFM();               break;
				case 'revenue_gender':  res = await getRevenueByGender();   break;
				case 'spending':        res = await getSpendingPatterns();  break;
				case 'top_per_gender':  res = await getTopPerGender();      break;
				case 'all_buyers':      res = await getAllWithBuyers();      break;
				case 'full_outer':      res = await getFullOuter();         break;
				default: throw new Error('Unknown report.');
			}
			const raw = res.data;
			setData(Array.isArray(raw) ? raw : raw ? [raw] : []);
		} catch (err) {
			setError(err.response?.data?.error || err.message || 'Failed to load report.');
		} finally {
			setLoading(false);
		}
	};

	const handleSelect = (item) => {
		const report = REPORTS.find((r) => r.key === item.value);
		if (!report) return;
		if (report.hasParam) {
			setPendingKey(report.key);
			setParamVal(report.paramDefault || '');
			setAwaitParam(true);
		} else {
			runReport(report.key);
		}
	};

	// ── Parameter input prompt ────────────────────────────────────────────────
	if (awaitParam) {
		const report = REPORTS.find((r) => r.key === pendingKey);
		return (
			<Box flexDirection="column" padding={1}>
				<Text bold color="cyan">{report?.label}</Text>
				<Box marginTop={1}>
					<Text color="yellow">{report?.paramLabel}: </Text>
					<TextInput
						value={paramVal}
						onChange={(v) => { setTyping(true); setParamVal(v); }}
						onSubmit={() => {
							setTyping(false);
							setAwaitParam(false);
							runReport(pendingKey, paramVal);
						}}
					/>
				</Box>
				<Text dimColor>ENTER to run • ESC to cancel</Text>
			</Box>
		);
	}

	// ── Menu ──────────────────────────────────────────────────────────────────
	if (view === 'menu') {
		return (
			<Box flexDirection="column" padding={1}>
				<Box marginBottom={1}>
					<Text bold color="green">Analytics Reports</Text>
					{!isAdmin && <Text dimColor>  (showing customer-accessible reports)</Text>}
				</Box>
				<SelectInput
					items={visibleReports.map((r) => ({
						label: r.label + (r.hasParam ? '  [parameterised]' : ''),
						value: r.key,
					}))}
					onSelect={handleSelect}
				/>
				<Text dimColor marginTop={1}>ENTER = run report • ESC = back</Text>
			</Box>
		);
	}

	// ── Report View ───────────────────────────────────────────────────────────
	const report  = REPORTS.find((r) => r.key === view);
	const columns = COLUMNS[view] || [];

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">{report?.label}</Text>
				{data && !loading && (
					<Text dimColor>   {data.length} row(s)</Text>
				)}
			</Box>

			{loading && <Text color="cyan">⟳  Running query…</Text>}
			{error   && <Text color="red" >✗  {error}</Text>}

			{data && !loading && (
				<DataTable rows={data} columns={columns} />
			)}

			<Text dimColor marginTop={1}>ESC = back to menu  •  ← P / N → = paginate</Text>
		</Box>
	);
}