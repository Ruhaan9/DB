// grocery-backend/index.js
// Main Express server — all CRUD routes + analytics mounted here

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { poolPromise, sql } = require('./db');
const analyticsRouter = require('./analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────
// Allow both browser localhost origins and the CLI (no Origin header)
app.use(cors({
    origin: (origin, cb) => cb(null, true),   // mirror any origin (dev only)
    credentials: true,
}));
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'grocery-db-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }
    })
);

// ─────────────────────────────────────────────
//  AUTH GUARD
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    next();
}

// ─────────────────────────────────────────────
//  MOUNT ANALYTICS ROUTER (after session middleware)
// ─────────────────────────────────────────────
app.use('/api/analytics', analyticsRouter);

// ─────────────────────────────────────────────
//  AUTH  (Q1 — register is "add a new user")
// ─────────────────────────────────────────────

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, streetAddress, zipCode, dateOfBirth, gender } = req.body;
    if (!username || !email || !password || !streetAddress || !zipCode || !dateOfBirth) {
        return res.status(400).json({ error: 'All required fields must be provided.' });
    }
    try {
        const pool = await poolPromise;

        const existing = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT UserID FROM [User] WHERE Email = @Email');
        if (existing.recordset.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const locCheck = await pool.request()
            .input('ZipCode', sql.VarChar, zipCode)
            .query('SELECT ZipCode FROM Location WHERE ZipCode = @ZipCode');
        if (locCheck.recordset.length === 0) {
            return res.status(400).json({ error: 'ZipCode not found. Add it via POST /api/locations first.' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const result = await pool.request()
            .input('Username',      sql.VarChar,       username)
            .input('Email',         sql.VarChar,       email)
            .input('Password',      sql.VarChar,       hashed)
            .input('StreetAddress', sql.VarChar,       streetAddress)
            .input('ZipCode',       sql.VarChar,       zipCode)
            .input('DateOfBirth',   sql.Date,          dateOfBirth)
            .input('Gender',        sql.VarChar,       gender || null)
            .query(`
                INSERT INTO [User] (Username, Email, Password, StreetAddress, ZipCode, DateOfBirth, Gender)
                OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email
                VALUES (@Username, @Email, @Password, @StreetAddress, @ZipCode, @DateOfBirth, @Gender)
            `);

        const user = result.recordset[0];
        req.session.userId   = user.UserID;
        req.session.username = user.Username;
        res.status(201).json({ message: 'Registered successfully.', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('Email', sql.VarChar, email)
            .query('SELECT UserID, Username, Email, Password FROM [User] WHERE Email = @Email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const user = result.recordset[0];
        const match = await bcrypt.compare(password, user.Password);
        if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

        req.session.userId   = user.UserID;
        req.session.username = user.Username;
        res.json({ message: 'Login successful.', user: { userId: user.UserID, username: user.Username, email: user.Email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed.' });
        res.json({ message: 'Logged out.' });
    });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ userId: req.session.userId, username: req.session.username });
});

// ─────────────────────────────────────────────
//  LOCATIONS  (prerequisite for user creation)
// ─────────────────────────────────────────────

// GET /api/locations/:zipCode
app.get('/api/locations/:zipCode', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ZipCode', sql.VarChar, req.params.zipCode)
            .query('SELECT * FROM Location WHERE ZipCode = @ZipCode');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'ZipCode not found.' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/locations
app.post('/api/locations', requireAuth, async (req, res) => {
    const { zipCode, city, state } = req.body;
    if (!zipCode || !city || !state) return res.status(400).json({ error: 'zipCode, city, state required.' });
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ZipCode', sql.VarChar, zipCode)
            .input('City',    sql.VarChar, city)
            .input('State',   sql.VarChar, state)
            .query('INSERT INTO Location (ZipCode, City, State) VALUES (@ZipCode, @City, @State)');
        res.status(201).json({ zipCode, city, state });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
//  CATEGORIES
// ─────────────────────────────────────────────

// GET /api/categories
app.get('/api/categories', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Category ORDER BY CategoryName');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/categories/:id
app.get('/api/categories/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CategoryID', sql.Int, req.params.id)
            .query('SELECT * FROM Category WHERE CategoryID = @CategoryID');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/categories
app.post('/api/categories', requireAuth, async (req, res) => {
    const { categoryName } = req.body;
    if (!categoryName) return res.status(400).json({ error: 'categoryName required.' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CategoryName', sql.VarChar, categoryName)
            .query('INSERT INTO Category (CategoryName) OUTPUT INSERTED.* VALUES (@CategoryName)');
        res.status(201).json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/categories/:id
app.put('/api/categories/:id', requireAuth, async (req, res) => {
    const { categoryName } = req.body;
    if (!categoryName) return res.status(400).json({ error: 'categoryName required.' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('CategoryID',   sql.Int,     req.params.id)
            .input('CategoryName', sql.VarChar, categoryName)
            .query(`UPDATE Category SET CategoryName=@CategoryName OUTPUT INSERTED.* WHERE CategoryID=@CategoryID`);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/categories/:id
app.delete('/api/categories/:id', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('CategoryID', sql.Int, req.params.id)
            .query('DELETE FROM Category WHERE CategoryID = @CategoryID');
        res.json({ message: 'Category deleted.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────
//  PRODUCTS  (Q2, Q3, Q4, Q5, Q6, Q8)
// ─────────────────────────────────────────────

// GET /api/products?search=&category=
// Covers Q5 (all), Q6 (search by name), Q8 (with category join always included)
app.get('/api/products', async (req, res) => {
    const { category, search } = req.query;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        let query = `
            SELECT p.*, c.CategoryName
            FROM Product p
            JOIN Category c ON p.CategoryID = c.CategoryID
            WHERE 1=1
        `;
        if (category) {
            query += ' AND p.CategoryID = @CategoryID';
            request.input('CategoryID', sql.Int, category);
        }
        if (search) {
            query += ' AND p.ProductName LIKE @Search';
            request.input('Search', sql.VarChar, `%${search}%`);
        }
        query += ' ORDER BY p.ProductName';
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductID', sql.Int, req.params.id)
            .query(`
                SELECT p.*, c.CategoryName
                FROM Product p
                JOIN Category c ON p.CategoryID = c.CategoryID
                WHERE p.ProductID = @ProductID
            `);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Product not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/products  — Q2
app.post('/api/products', requireAuth, async (req, res) => {
    const { productName, categoryID, price, stockQuantity } = req.body;
    if (!productName || !categoryID || price == null || stockQuantity == null) {
        return res.status(400).json({ error: 'productName, categoryID, price, stockQuantity required.' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductName',    sql.VarChar,       productName)
            .input('CategoryID',     sql.Int,           categoryID)
            .input('Price',          sql.Decimal(10,2), price)
            .input('StockQuantity',  sql.Int,           stockQuantity)
            .query(`
                INSERT INTO Product (ProductName, CategoryID, Price, StockQuantity)
                OUTPUT INSERTED.*
                VALUES (@ProductName, @CategoryID, @Price, @StockQuantity)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/products/:id  — Q3 (price update + full update)
app.put('/api/products/:id', requireAuth, async (req, res) => {
    const { productName, categoryID, price, stockQuantity } = req.body;
    if (!productName || !categoryID || price == null || stockQuantity == null) {
        return res.status(400).json({ error: 'productName, categoryID, price, stockQuantity required.' });
    }
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductID',      sql.Int,           req.params.id)
            .input('ProductName',    sql.VarChar,       productName)
            .input('CategoryID',     sql.Int,           categoryID)
            .input('Price',          sql.Decimal(10,2), price)
            .input('StockQuantity',  sql.Int,           stockQuantity)
            .query(`
                UPDATE Product
                SET ProductName=@ProductName, CategoryID=@CategoryID,
                    Price=@Price, StockQuantity=@StockQuantity
                OUTPUT INSERTED.*
                WHERE ProductID = @ProductID
            `);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Product not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/products/:id/price  — Q3 (price-only convenience route)
app.patch('/api/products/:id/price', requireAuth, async (req, res) => {
    const { price } = req.body;
    if (price == null) return res.status(400).json({ error: 'price required.' });
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductID', sql.Int,           req.params.id)
            .input('Price',     sql.Decimal(10,2), price)
            .query('UPDATE Product SET Price=@Price OUTPUT INSERTED.* WHERE ProductID=@ProductID');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Product not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/products/:id  — Q4
app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('ProductID', sql.Int, req.params.id)
            .query('DELETE FROM Product WHERE ProductID = @ProductID');
        res.json({ message: 'Product deleted.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────

// GET /api/users
app.get('/api/users', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT u.UserID, u.Username, u.Email, u.StreetAddress,
                   u.ZipCode, l.City, l.State,
                   u.DateOfBirth,
                   DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                   u.Gender
            FROM [User] u
            JOIN Location l ON u.ZipCode = l.ZipCode
            ORDER BY u.Username
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/:id
app.get('/api/users/:id', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, req.params.id)
            .query(`
                SELECT u.UserID, u.Username, u.Email, u.StreetAddress,
                       u.ZipCode, l.City, l.State,
                       u.DateOfBirth,
                       DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                       u.Gender
                FROM [User] u
                JOIN Location l ON u.ZipCode = l.ZipCode
                WHERE u.UserID = @UserID
            `);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/users/:id
app.put('/api/users/:id', requireAuth, async (req, res) => {
    const { username, streetAddress, zipCode, dateOfBirth, gender } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID',        sql.Int,     req.params.id)
            .input('Username',      sql.VarChar, username)
            .input('StreetAddress', sql.VarChar, streetAddress)
            .input('ZipCode',       sql.VarChar, zipCode)
            .input('DateOfBirth',   sql.Date,    dateOfBirth)
            .input('Gender',        sql.VarChar, gender || null)
            .query(`
                UPDATE [User]
                SET Username=@Username, StreetAddress=@StreetAddress,
                    ZipCode=@ZipCode, DateOfBirth=@DateOfBirth, Gender=@Gender
                OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email,
                       INSERTED.StreetAddress, INSERTED.ZipCode,
                       INSERTED.DateOfBirth, INSERTED.Gender
                WHERE UserID = @UserID
            `);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'User not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────
//  ORDERS  (Q9, Q10, Q11)
// ─────────────────────────────────────────────

// GET /api/orders  — current user's orders with computed total (Q11 simplified)
app.get('/api/orders', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, req.session.userId)
            .query(`
                SELECT
                    o.OrderID, o.OrderDate,
                    u.Username,
                    DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                    u.Gender,
                    ISNULL(SUM(od.Quantity * od.UnitPrice), 0) AS TotalAmount,
                    COUNT(od.OrderDetailID) AS ItemCount
                FROM [Order] o
                JOIN [User] u ON o.UserID = u.UserID
                LEFT JOIN OrderDetail od ON o.OrderID = od.OrderID
                WHERE o.UserID = @UserID
                GROUP BY o.OrderID, o.OrderDate, u.Username, u.DateOfBirth, u.Gender
                ORDER BY o.OrderDate DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/:id  — single order with all line items
app.get('/api/orders/:id', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const orderResult = await pool.request()
            .input('OrderID', sql.Int, req.params.id)
            .input('UserID',  sql.Int, req.session.userId)
            .query(`
                SELECT o.OrderID, o.OrderDate, o.UserID, u.Username, u.Email,
                       DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age, u.Gender
                FROM [Order] o
                JOIN [User] u ON o.UserID = u.UserID
                WHERE o.OrderID = @OrderID AND o.UserID = @UserID
            `);
        if (orderResult.recordset.length === 0) return res.status(404).json({ error: 'Order not found.' });

        const itemsResult = await pool.request()
            .input('OrderID', sql.Int, req.params.id)
            .query(`
                SELECT od.OrderDetailID, od.ProductID, p.ProductName,
                       od.Quantity, od.UnitPrice,
                       od.Quantity * od.UnitPrice AS LineTotal
                FROM OrderDetail od
                JOIN Product p ON od.ProductID = p.ProductID
                WHERE od.OrderID = @OrderID
            `);

        const order = orderResult.recordset[0];
        order.items = itemsResult.recordset;
        order.totalAmount = order.items.reduce((s, i) => s + i.LineTotal, 0);
        res.json(order);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders  — Q9 + Q10 combined: place order with items in one transaction
// Body: { items: [{ productId, quantity }] }
app.post('/api/orders', requireAuth, async (req, res) => {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items array required.' });
    }
    try {
        const pool = await poolPromise;
        const tx = new sql.Transaction(pool);
        await tx.begin();
        try {
            // Q9 — create order header
            const orderResult = await tx.request()
                .input('UserID', sql.Int, req.session.userId)
                .query(`
                    INSERT INTO [Order] (UserID)
                    OUTPUT INSERTED.OrderID, INSERTED.OrderDate
                    VALUES (@UserID)
                `);
            const { OrderID, OrderDate } = orderResult.recordset[0];
            const insertedItems = [];

            for (const item of items) {
                const { productId, quantity } = item;
                if (!productId || !quantity || quantity <= 0) {
                    throw new Error(`Invalid item — productId:${productId}, quantity:${quantity}`);
                }
                // Check stock
                const prod = await tx.request()
                    .input('ProductID', sql.Int, productId)
                    .query('SELECT Price, StockQuantity, ProductName FROM Product WHERE ProductID = @ProductID');
                if (prod.recordset.length === 0) throw new Error(`Product ${productId} not found.`);
                const { Price, StockQuantity, ProductName } = prod.recordset[0];
                if (StockQuantity < quantity) {
                    throw new Error(`Insufficient stock for "${ProductName}". Available: ${StockQuantity}`);
                }

                // Q10 — insert line item (UnitPrice snapshotted at order time)
                const detail = await tx.request()
                    .input('OrderID',   sql.Int,           OrderID)
                    .input('ProductID', sql.Int,           productId)
                    .input('Quantity',  sql.Int,           quantity)
                    .input('UnitPrice', sql.Decimal(10,2), Price)
                    .query(`
                        INSERT INTO OrderDetail (OrderID, ProductID, Quantity, UnitPrice)
                        OUTPUT INSERTED.*
                        VALUES (@OrderID, @ProductID, @Quantity, @UnitPrice)
                    `);

                // Decrement stock
                await tx.request()
                    .input('ProductID', sql.Int, productId)
                    .input('Quantity',  sql.Int, quantity)
                    .query('UPDATE Product SET StockQuantity = StockQuantity - @Quantity WHERE ProductID = @ProductID');

                insertedItems.push(detail.recordset[0]);
            }

            await tx.commit();
            res.status(201).json({
                message: 'Order placed.',
                order: {
                    orderId: OrderID,
                    orderDate: OrderDate,
                    userId: req.session.userId,
                    items: insertedItems,
                    totalAmount: insertedItems.reduce((s, i) => s + i.Quantity * i.UnitPrice, 0)
                }
            });
        } catch (inner) {
            await tx.rollback();
            throw inner;
        }
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/orders/:id  — cancel order + restore stock
app.delete('/api/orders/:id', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const tx = new sql.Transaction(pool);
        await tx.begin();
        try {
            const check = await tx.request()
                .input('OrderID', sql.Int, req.params.id)
                .input('UserID',  sql.Int, req.session.userId)
                .query('SELECT OrderID FROM [Order] WHERE OrderID=@OrderID AND UserID=@UserID');
            if (check.recordset.length === 0) {
                await tx.rollback();
                return res.status(404).json({ error: 'Order not found.' });
            }

            const items = await tx.request()
                .input('OrderID', sql.Int, req.params.id)
                .query('SELECT ProductID, Quantity FROM OrderDetail WHERE OrderID = @OrderID');

            for (const item of items.recordset) {
                await tx.request()
                    .input('ProductID', sql.Int, item.ProductID)
                    .input('Quantity',  sql.Int, item.Quantity)
                    .query('UPDATE Product SET StockQuantity = StockQuantity + @Quantity WHERE ProductID = @ProductID');
            }

            await tx.request()
                .input('OrderID', sql.Int, req.params.id)
                .query('DELETE FROM [Order] WHERE OrderID = @OrderID');

            await tx.commit();
            res.json({ message: 'Order cancelled and stock restored.' });
        } catch (inner) {
            await tx.rollback();
            throw inner;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────
//  HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request().query('SELECT 1');
        res.json({ status: 'ok', db: 'connected', loggedIn: !!req.session?.userId });
    } catch {
        res.status(500).json({ status: 'error', db: 'disconnected' });
    }
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🛒  Grocery API running on http://localhost:${PORT}\n`);
    console.log('  AUTH');
    console.log('    POST   /api/auth/register');
    console.log('    POST   /api/auth/login');
    console.log('    POST   /api/auth/logout');
    console.log('    GET    /api/auth/me');
    console.log('  CRUD');
    console.log('    GET/POST         /api/products?search=&category=');
    console.log('    GET/PUT/DELETE   /api/products/:id');
    console.log('    PATCH            /api/products/:id/price');
    console.log('    GET/POST         /api/categories');
    console.log('    GET/POST         /api/orders');
    console.log('    GET/DELETE       /api/orders/:id');
    console.log('    GET/PUT          /api/users/:id');
    console.log('    GET/POST         /api/locations');
    console.log('  ANALYTICS');
    console.log('    GET  /api/analytics/products/female-under-price?maxPrice=500');
    console.log('    GET  /api/analytics/orders/full');
    console.log('    GET  /api/analytics/orders/cost-by-gender');
    console.log('    GET  /api/analytics/products/best-sellers?minUnits=10');
    console.log('    GET  /api/analytics/users/inactive');
    console.log('    GET  /api/analytics/products/above-avg-price');
    console.log('    GET  /api/analytics/products/gender-sales');
    console.log('    GET  /api/analytics/products/:id/stock-profile');
    console.log('    GET  /api/analytics/products/top-seller');
    console.log('    GET  /api/analytics/products/bought-together?minCount=3');
    console.log('    GET  /api/analytics/revenue/monthly');
    console.log('    GET  /api/analytics/users/rfm');
    console.log('    GET  /api/analytics/revenue/by-gender');
    console.log('    GET  /api/analytics/users/spending-patterns');
    console.log('    GET  /api/analytics/products/top-per-gender');
    console.log('    GET  /api/analytics/users/bought-both?productA=5&productB=6');
    console.log('    GET  /api/analytics/users/bought-not?productA=5&productB=6');
    console.log('    GET  /api/analytics/products/all-with-buyers');
    console.log('    GET  /api/analytics/products/full-outer');
});