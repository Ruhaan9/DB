#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import fs from 'fs';
import App from './app.js';


const logStream = fs.createWriteStream('/tmp/grocery-cli.log', { flags: 'a' });
process.stderr.write = (chunk, enc, cb) => {
	logStream.write(chunk, enc, cb);
	return true;
};

process.stdout.write('\x1b[?1049h\x1b[2J\x1b[H');

const restore = () => {
	process.stdout.write('\x1b[?1049l');
};
process.on('exit',    restore);
process.on('SIGINT',  () => { restore(); process.exit(0); });
process.on('SIGTERM', () => { restore(); process.exit(0); });

render(<App />);