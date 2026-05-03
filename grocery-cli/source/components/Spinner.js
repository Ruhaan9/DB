// source/components/Spinner.js
import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

const FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];

export default function Spinner({ color = 'cyan' }) {
	const [frame, setFrame] = useState(0);
	useEffect(() => {
		const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80);
		return () => clearInterval(t);
	}, []);
	return <Text color={color}>{FRAMES[frame]} </Text>;
}