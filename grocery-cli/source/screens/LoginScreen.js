// source/screens/LoginScreen.js
import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {login, register, createLocation} from '../api.js';

const FIELDS_LOGIN = ['email', 'password'];
const FIELDS_REGISTER = [
	'username',
	'email',
	'password',
	'streetAddress',
	'zipCode',
	'city',
	'state',
	'dateOfBirth',
	'gender',
];

export default function LoginScreen({onLogin}) {
	const [mode, setMode] = useState('login'); // 'login' | 'register'
	const [fieldIndex, setFieldIndex] = useState(0);
	const [values, setValues] = useState({});
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const fields = mode === 'login' ? FIELDS_LOGIN : FIELDS_REGISTER;
	const currentField = fields[fieldIndex];

	useInput((input, key) => {
		if (loading) return;
		if (key.tab) {
			setMode((m) => (m === 'login' ? 'register' : 'login'));
			setFieldIndex(0);
			setValues({});
			setError('');
		}
	});

	const handleSubmitField = async () => {
		if (fieldIndex < fields.length - 1) {
			setFieldIndex((i) => i + 1);
			return;
		}

		// Last field — submit
		setLoading(true);
		setError('');
		try {
			if (mode === 'login') {
				const res = await login({
					email: values.email,
					password: values.password,
				});
				onLogin(res.data.user);
			} else {
				// Create location first, ignore error if already exists
				try {
					await createLocation({
						zipCode: values.zipCode,
						city: values.city,
						state: values.state,
					});
				} catch {}

				const res = await register({
					username: values.username,
					email: values.email,
					password: values.password,
					streetAddress: values.streetAddress,
					zipCode: values.zipCode,
					dateOfBirth: values.dateOfBirth,
					gender: values.gender,
				});
				onLogin(res.data.user);
			}
		} catch (err) {
			setError(err.response?.data?.error || 'Something went wrong.');
			setFieldIndex(0);
			setValues({});
		} finally {
			setLoading(false);
		}
	};

	const label = {
		username: 'Username',
		email: 'Email',
		password: 'Password',
		streetAddress: 'Street Address',
		zipCode: 'Zip Code',
		city: 'City',
		state: 'State',
		dateOfBirth: 'Date of Birth (YYYY-MM-DD)',
		gender: 'Gender (Male/Female/Other)',
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="green">
				🛒 Grocery Store
			</Text>
			<Text dimColor>Press TAB to switch between Login / Register</Text>
			<Box marginTop={1}>
				<Text bold color={mode === 'login' ? 'cyan' : 'white'}>
					[LOGIN]
				</Text>
				<Text> / </Text>
				<Text bold color={mode === 'register' ? 'cyan' : 'white'}>
					[REGISTER]
				</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				{fields.map((field, i) => {
					if (i > fieldIndex) return null;
					const done = i < fieldIndex;
					return (
						<Box key={field}>
							<Text color="yellow">{label[field]}: </Text>
							{done ? (
								<Text color="green">
									{field === 'password'
										? '••••••••'
										: values[field]}
								</Text>
							) : (
								<TextInput
									value={values[field] || ''}
									onChange={(val) =>
										setValues((v) => ({...v, [field]: val}))
									}
									mask={field === 'password' ? '*' : undefined}
									onSubmit={handleSubmitField}
								/>
							)}
						</Box>
					);
				})}
			</Box>

			{loading && (
				<Text color="cyan" marginTop={1}>
					Connecting...
				</Text>
			)}
			{error && (
				<Text color="red" marginTop={1}>
					✗ {error}
				</Text>
			)}

			<Box marginTop={1}>
				<Text dimColor>ENTER to confirm each field • TAB to switch mode</Text>
			</Box>
		</Box>
	);
}