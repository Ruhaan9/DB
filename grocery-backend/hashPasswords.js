// grocery-backend/hashPasswords.js
// Run this ONCE to bcrypt-hash all plain-text passwords in the DB
// Usage: node hashPasswords.js

const bcrypt = require('bcrypt');
require('dotenv').config();
const { poolPromise, sql } = require('./db');

async function hashAllPasswords() {
    console.log('Connecting to database...');
    const pool = await poolPromise;

    // Fetch all users with their current plain-text passwords
    const result = await pool.request().query('SELECT UserID, Username, Password FROM [User]');
    const users = result.recordset;

    console.log(`Found ${users.length} users. Hashing passwords...\n`);

    for (const user of users) {
        // Skip already-hashed passwords (bcrypt hashes start with $2b$)
        if (user.Password.startsWith('$2b$')) {
            console.log(`  SKIP  ${user.Username} — already hashed`);
            continue;
        }

        const hashed = await bcrypt.hash(user.Password, 10);

        await pool.request()
            .input('UserID',   sql.Int,     user.UserID)
            .input('Password', sql.VarChar, hashed)
            .query('UPDATE [User] SET Password = @Password WHERE UserID = @UserID');

        console.log(`  OK    UserID ${user.UserID} (${user.Username})`);
    }

    console.log('\nDone! All passwords are now hashed.');
    console.log('You can now log in with the original plain-text passwords via the CLI.');
    process.exit(0);
}

hashAllPasswords().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});