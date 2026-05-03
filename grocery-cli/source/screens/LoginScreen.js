// source/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { setTyping } from '../typingContext.js';
import Spinner from '../components/Spinner.js';
import { login, register, createLocation } from '../api.js';

// ── The secret admin passphrase ───────────────────────────────────────────────
const ADMIN_SECRET = 'GROCERY_ADMIN_2024';

const FIELDS_LOGIN    = ['email', 'password'];
const FIELDS_REGISTER = [
	'username', 'email', 'password',
	'streetAddress', 'zipCode', 'city', 'state',
	'dateOfBirth', 'gender',
];

const FIELD_LABELS = {
	username:      'Username',
	email:         'Email',
	password:      'Password',
	streetAddress: 'Street Address',
	zipCode:       'Zip Code',
	city:          'City',
	state:         'State (e.g. TX)',
	dateOfBirth:   'Date of Birth (YYYY-MM-DD)',
	gender:        'Gender (Male / Female / Other)',
	adminSecret:   'Admin Secret Code (leave blank to skip)',
};

export default function LoginScreen({ onLogin }) {
	// Login screen is always in text-input mode
	useEffect(() => {
		setTyping(true);
		return () => setTyping(false);
	}, []);

	const [mode, setMode]           = useState('login');   // 'login' | 'register'
	const [fieldIndex, setFieldIndex] = useState(0);
	const [values, setValues]       = useState({});
	const [error, setError]         = useState('');
	const [loading, setLoading]     = useState(false);
	const [adminPrompt, setAdminPrompt] = useState(false); // after register: ask for secret
	const [adminInput, setAdminInput]   = useState('');
	const [pendingUser, setPendingUser] = useState(null);  // user waiting for admin check

	const fields       = mode === 'login' ? FIELDS_LOGIN : FIELDS_REGISTER;
	const currentField = fields[fieldIndex];

	useInput((input, key) => {
		if (loading) return;
		if (adminPrompt) return;
		if (key.tab) {
			setMode((m) => (m === 'login' ? 'register' : 'login'));
			setFieldIndex(0);
			setValues({});
			setError('');
		}
	});

	// ── Admin secret step (shown after successful register/login) ─────────────
	const handleAdminSubmit = () => {
		const role = adminInput.trim() === ADMIN_SECRET ? 'admin' : 'customer';
		onLogin({ ...pendingUser, role });
	};

	// ── Field-by-field submission ─────────────────────────────────────────────
	const handleSubmitField = async () => {
		if (fieldIndex < fields.length - 1) {
			setFieldIndex((i) => i + 1);
			return;
		}

		setLoading(true);
		setError('');
		try {
			let user;
			if (mode === 'login') {
				const res = await login({ email: values.email, password: values.password });
				user = res.data.user;
			} else {
				// Try to create location — ignore if already exists
				try {
					await createLocation({ zipCode: values.zipCode, city: values.city, state: values.state });
				} catch (locErr) {
					// Only re-throw if it's NOT a duplicate / already-exists error
					const msg = locErr.response?.data?.error || '';
					if (!msg.toLowerCase().includes('duplicate') && !msg.toLowerCase().includes('primary key')) {
						// Still try to continue — location might already exist legitimately
					}
				}

				const res = await register({
					username:      values.username,
					email:         values.email,
					password:      values.password,
					streetAddress: values.streetAddress,
					zipCode:       values.zipCode,
					dateOfBirth:   values.dateOfBirth,
					gender:        values.gender,
				});
				user = res.data.user;
			}

			// After successful auth, ask for admin secret
			setPendingUser(user);
			setAdminPrompt(true);
		} catch (err) {
			setError(err.response?.data?.error || 'Something went wrong.');
			setFieldIndex(0);
			setValues({});
		} finally {
			setLoading(false);
		}
	};

	// ── Admin secret prompt ───────────────────────────────────────────────────
	if (adminPrompt) {
		return (
			<Box flexDirection="column" padding={2}>
				<Text bold color="green">🛒 Grocery Store</Text>
				<Box marginTop={1} borderStyle="single" borderColor="yellow" padding={1}>
					<Box flexDirection="column">
						<Text bold color="yellow">Admin Access</Text>
						<Text dimColor>Enter the admin secret code to get admin privileges,</Text>
						<Text dimColor>or press ENTER to continue as a regular customer.</Text>
						<Box marginTop={1}>
							<Text color="cyan">Secret Code: </Text>
							<TextInput
								value={adminInput}
								onChange={setAdminInput}
								mask="*"
								onSubmit={handleAdminSubmit}
							/>
						</Box>
					</Box>
				</Box>
				<Text dimColor marginTop={1}>ENTER to continue</Text>
			</Box>
		);
	}

	// ── Normal login / register form ──────────────────────────────────────────
	return (
		<Box flexDirection="column" padding={2}>
			<Text bold color="green">🛒 Grocery Store</Text>
			<Text dimColor>TAB to switch between Login / Register</Text>

			<Box marginTop={1}>
				<Text bold color={mode === 'login'    ? 'cyan' : 'gray'}>[  LOGIN  ]</Text>
				<Text>  </Text>
				<Text bold color={mode === 'register' ? 'cyan' : 'gray'}>[ REGISTER ]</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				{fields.map((field, i) => {
					if (i > fieldIndex) return null;
					const done = i < fieldIndex;
					return (
						<Box key={field} marginTop={0}>
							<Text color="yellow">{FIELD_LABELS[field]}: </Text>
							{done ? (
								<Text color="green">
									{field === 'password' ? '••••••••' : values[field]}
								</Text>
							) : (
								<TextInput
									value={values[field] || ''}
									onChange={(val) => setValues((v) => ({ ...v, [field]: val }))}
									mask={field === 'password' ? '*' : undefined}
									onSubmit={handleSubmitField}
								/>
							)}
						</Box>
					);
				})}
			</Box>

			{loading && <Box marginTop={1}><Spinner /><Text color="cyan">Connecting…</Text></Box>}
			{error   && <Text color="red"  marginTop={1}>✗ {error}</Text>}

			<Text dimColor marginTop={1}>ENTER = confirm field • TAB = switch mode</Text>
		</Box>
	);
}