// grocery-backend/analytics.js
// All read-only analytics / reporting routes (queries 7, 11–28)

const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('./db');

function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    next();
}

// ── Q7  Products under a price bought by Female customers ────────────────────
router.get('/products/female-under-price', async (req, res) => {
    const maxPrice = parseFloat(req.query.maxPrice) || 500;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MaxPrice', sql.Decimal(10, 2), maxPrice)
            .query(`
                SELECT DISTINCT p.ProductID, p.ProductName, p.Price
                FROM Product p
                JOIN OrderDetail od ON p.ProductID = od.ProductID
                JOIN [Order] o      ON od.OrderID  = o.OrderID
                JOIN [User] u       ON o.UserID    = u.UserID
                WHERE p.Price < @MaxPrice
                  AND u.Gender = 'Female'
                ORDER BY p.Price ASC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q11  All orders with customer name, dynamic age, gender, total ───────────
router.get('/orders/full', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                o.OrderID,
                u.Username,
                DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                u.Gender,
                o.OrderDate,
                ISNULL(
                    (SELECT SUM(Quantity * UnitPrice)
                     FROM OrderDetail
                     WHERE OrderID = o.OrderID), 0
                ) AS TotalAmount
            FROM [Order] o
            JOIN [User] u ON o.UserID = u.UserID
            ORDER BY o.OrderDate DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q12  Total cost per order with buyer gender ──────────────────────────────
router.get('/orders/cost-by-gender', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                od.OrderID,
                u.Gender,
                SUM(od.Quantity * od.UnitPrice) AS TotalOrderPrice
            FROM OrderDetail od
            JOIN [Order] o ON od.OrderID = o.OrderID
            JOIN [User] u  ON o.UserID   = u.UserID
            GROUP BY od.OrderID, u.Gender
            ORDER BY TotalOrderPrice DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q13  Best-selling products (>10 units) by gender ────────────────────────
router.get('/products/best-sellers', async (req, res) => {
    const minUnits = parseInt(req.query.minUnits) || 10;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MinUnits', sql.Int, minUnits)
            .query(`
                SELECT
                    p.ProductName,
                    u.Gender,
                    SUM(od.Quantity) AS TotalSold
                FROM OrderDetail od
                JOIN Product p ON od.ProductID = p.ProductID
                JOIN [Order] o ON od.OrderID   = o.OrderID
                JOIN [User] u  ON o.UserID     = u.UserID
                GROUP BY p.ProductID, p.ProductName, u.Gender
                HAVING SUM(od.Quantity) > @MinUnits
                ORDER BY TotalSold DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q14  Customers who never placed an order ─────────────────────────────────
router.get('/users/inactive', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                u.Username,
                u.Email,
                DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                u.Gender
            FROM [User] u
            LEFT JOIN [Order] o ON u.UserID = o.UserID
            WHERE o.OrderID IS NULL
            ORDER BY u.Username
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q15  Products above avg price + top age bracket ─────────────────────────
router.get('/products/above-avg-price', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT p.ProductName, p.Price,
                CONCAT(
                    FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10) * 10, '-',
                    FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10) * 10 + 9
                ) AS TopAgeBracket
            FROM Product p
            JOIN OrderDetail od ON p.ProductID = od.ProductID
            JOIN [Order] o      ON od.OrderID  = o.OrderID
            JOIN [User] u       ON o.UserID    = u.UserID
            WHERE p.Price > (SELECT AVG(Price) FROM Product)
            GROUP BY p.ProductID, p.ProductName, p.Price,
                     FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10)
            ORDER BY p.Price DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q16  All products sorted by price, units sold per gender ─────────────────
router.get('/products/gender-sales', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                p.ProductID, p.ProductName, p.Price,
                SUM(CASE WHEN u.Gender = 'Male'   THEN od.Quantity ELSE 0 END) AS MalePurchases,
                SUM(CASE WHEN u.Gender = 'Female' THEN od.Quantity ELSE 0 END) AS FemalePurchases
            FROM Product p
            LEFT JOIN OrderDetail od ON p.ProductID = od.ProductID
            LEFT JOIN [Order] o      ON od.OrderID  = o.OrderID
            LEFT JOIN [User] u       ON o.UserID    = u.UserID
            GROUP BY p.ProductID, p.ProductName, p.Price
            ORDER BY p.Price DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q17  Stock check + buyer profile for a specific product ──────────────────
router.get('/products/:id/stock-profile', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductID', sql.Int, req.params.id)
            .query(`
                SELECT
                    p.ProductName,
                    p.StockQuantity,
                    CASE WHEN p.StockQuantity > 0 THEN 'In Stock' ELSE 'Out of Stock' END AS Availability,
                    COUNT(DISTINCT o.UserID) AS UniqueBuyers,
                    AVG(DATEDIFF(YEAR, u.DateOfBirth, GETDATE())) AS AvgBuyerAge
                FROM Product p
                LEFT JOIN OrderDetail od ON p.ProductID = od.ProductID
                LEFT JOIN [Order] o      ON od.OrderID  = o.OrderID
                LEFT JOIN [User] u       ON o.UserID    = u.UserID
                WHERE p.ProductID = @ProductID
                GROUP BY p.ProductID, p.ProductName, p.StockQuantity
            `);
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Product not found.' });
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q18  Top-selling product with buyer breakdown ────────────────────────────
router.get('/products/top-seller', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TOP 1
                p.ProductName,
                SUM(od.Quantity) AS TotalUnitsSold,
                SUM(CASE WHEN u.Gender = 'Male'   THEN od.Quantity ELSE 0 END) AS MaleUnits,
                SUM(CASE WHEN u.Gender = 'Female' THEN od.Quantity ELSE 0 END) AS FemaleUnits,
                ROUND(AVG(CAST(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS FLOAT)), 1) AS AvgBuyerAge
            FROM OrderDetail od
            JOIN Product p ON od.ProductID = p.ProductID
            JOIN [Order] o ON od.OrderID   = o.OrderID
            JOIN [User] u  ON o.UserID     = u.UserID
            GROUP BY p.ProductID, p.ProductName
            ORDER BY TotalUnitsSold DESC
        `);
        res.json(result.recordset[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q19  Product pairs bought together (market basket) ───────────────────────
router.get('/products/bought-together', async (req, res) => {
    const minCount = parseInt(req.query.minCount) || 3;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('MinCount', sql.Int, minCount)
            .query(`
                SELECT
                    pa.ProductName AS ProductA,
                    pb.ProductName AS ProductB,
                    COUNT(*) AS TimesBoughtTogether,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(DISTINCT OrderID) FROM OrderDetail), 2) AS SupportPct,
                    MAX(u.Gender) AS MostCommonGender
                FROM OrderDetail a
                JOIN OrderDetail b  ON  a.OrderID   = b.OrderID
                                    AND a.ProductID < b.ProductID
                JOIN Product pa     ON a.ProductID  = pa.ProductID
                JOIN Product pb     ON b.ProductID  = pb.ProductID
                JOIN [Order] o      ON a.OrderID    = o.OrderID
                JOIN [User] u       ON o.UserID     = u.UserID
                GROUP BY pa.ProductName, pb.ProductName
                HAVING COUNT(*) >= @MinCount
                ORDER BY TimesBoughtTogether DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q20  Monthly revenue with MoM % change by gender ────────────────────────
router.get('/revenue/monthly', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            WITH MonthlyGenderRevenue AS (
                SELECT
                    FORMAT(o.OrderDate, 'yyyy-MM') AS Month,
                    u.Gender,
                    SUM(od.Quantity * od.UnitPrice) AS Revenue
                FROM [Order] o
                JOIN OrderDetail od ON o.OrderID = od.OrderID
                JOIN [User] u       ON o.UserID  = u.UserID
                GROUP BY FORMAT(o.OrderDate, 'yyyy-MM'), u.Gender
            )
            SELECT
                Month, Gender, Revenue,
                LAG(Revenue) OVER (PARTITION BY Gender ORDER BY Month) AS PrevMonthRevenue,
                ROUND(
                    (Revenue - LAG(Revenue) OVER (PARTITION BY Gender ORDER BY Month)) * 100.0
                    / NULLIF(LAG(Revenue) OVER (PARTITION BY Gender ORDER BY Month), 0),
                2) AS GrowthPct
            FROM MonthlyGenderRevenue
            ORDER BY Month, Gender
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q21  RFM customer segmentation ──────────────────────────────────────────
router.get('/users/rfm', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            WITH RFM AS (
                SELECT
                    u.UserID, u.Username, u.Gender,
                    CONCAT(
                        FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10) * 10, '-',
                        FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10) * 10 + 9
                    ) AS AgeBracket,
                    DATEDIFF(DAY, MAX(o.OrderDate), GETDATE()) AS Recency,
                    COUNT(DISTINCT o.OrderID)                  AS Frequency,
                    SUM(od.Quantity * od.UnitPrice)            AS Monetary
                FROM [User] u
                JOIN [Order] o      ON u.UserID  = o.UserID
                JOIN OrderDetail od ON o.OrderID = od.OrderID
                GROUP BY u.UserID, u.Username, u.Gender,
                         FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10)
            ),
            Scored AS (
                SELECT *,
                    NTILE(5) OVER (ORDER BY Recency   ASC)  AS R_Score,
                    NTILE(5) OVER (ORDER BY Frequency DESC) AS F_Score,
                    NTILE(5) OVER (ORDER BY Monetary  DESC) AS M_Score
                FROM RFM
            )
            SELECT
                UserID, Username, Gender, AgeBracket,
                Recency, Frequency, Monetary,
                R_Score, F_Score, M_Score,
                CASE
                    WHEN R_Score = 5 AND F_Score = 5 AND M_Score = 5 THEN 'Champion'
                    WHEN R_Score <= 2                                 THEN 'At Risk'
                    WHEN F_Score >= 4 AND M_Score >= 4                THEN 'Loyal'
                    ELSE                                              'Potential'
                END AS Segment
            FROM Scored
            ORDER BY M_Score DESC, F_Score DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q22  Avg order value + revenue by gender ─────────────────────────────────
router.get('/revenue/by-gender', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            WITH OrderTotals AS (
                SELECT o.OrderID, o.UserID, SUM(od.Quantity * od.UnitPrice) AS OrderTotal
                FROM [Order] o
                JOIN OrderDetail od ON o.OrderID = od.OrderID
                GROUP BY o.OrderID, o.UserID
            )
            SELECT
                u.Gender,
                COUNT(DISTINCT ot.OrderID)   AS TotalOrders,
                ROUND(AVG(ot.OrderTotal), 2) AS AvgOrderValue,
                ROUND(SUM(ot.OrderTotal), 2) AS TotalRevenue,
                ROUND(AVG(CAST(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS FLOAT)), 1) AS AvgAge
            FROM [User] u
            JOIN OrderTotals ot ON u.UserID = ot.UserID
            GROUP BY u.Gender
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q23  Spending patterns + favourite product by age bracket & gender ────────
router.get('/users/spending-patterns', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            WITH OrderTotals AS (
                SELECT o.OrderID, o.UserID, SUM(od.Quantity * od.UnitPrice) AS TotalAmount
                FROM [Order] o
                JOIN OrderDetail od ON o.OrderID = od.OrderID
                GROUP BY o.OrderID, o.UserID
            )
            SELECT
                CONCAT(
                    FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10) * 10, '-',
                    FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10) * 10 + 9
                ) AS AgeBracket,
                u.Gender,
                COUNT(DISTINCT ot.OrderID)    AS Orders,
                ROUND(AVG(ot.TotalAmount), 2) AS AvgSpend,
                p.ProductName                 AS FavouriteProduct
            FROM [User] u
            JOIN OrderTotals ot ON u.UserID     = ot.UserID
            JOIN OrderDetail od ON ot.OrderID   = od.OrderID
            JOIN Product p      ON od.ProductID = p.ProductID
            WHERE od.Quantity = (
                SELECT MAX(od2.Quantity)
                FROM [Order] o2
                JOIN OrderDetail od2 ON o2.OrderID = od2.OrderID
                WHERE o2.UserID = u.UserID
            )
            GROUP BY FLOOR(DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) / 10),
                     u.Gender, p.ProductID, p.ProductName
            ORDER BY AgeBracket, u.Gender
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q24  Top product per gender by units sold ────────────────────────────────
router.get('/products/top-per-gender', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            WITH RankedProducts AS (
                SELECT
                    u.Gender,
                    p.ProductName,
                    SUM(od.Quantity) AS TotalUnits,
                    RANK() OVER (
                        PARTITION BY u.Gender
                        ORDER BY SUM(od.Quantity) DESC
                    ) AS Rnk
                FROM [User] u
                JOIN [Order] o      ON u.UserID     = o.UserID
                JOIN OrderDetail od ON o.OrderID    = od.OrderID
                JOIN Product p      ON od.ProductID = p.ProductID
                GROUP BY u.Gender, p.ProductID, p.ProductName
            )
            SELECT Gender, ProductName, TotalUnits
            FROM RankedProducts
            WHERE Rnk = 1
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q25  Users who bought BOTH product A and B (INTERSECT) ───────────────────
router.get('/users/bought-both', async (req, res) => {
    const { productA = 5, productB = 6 } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductA', sql.Int, productA)
            .input('ProductB', sql.Int, productB)
            .query(`
                SELECT u.UserID, u.Username,
                       DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                       u.Gender
                FROM [User] u
                WHERE u.UserID IN (
                    SELECT o.UserID FROM [Order] o
                    JOIN OrderDetail od ON o.OrderID = od.OrderID
                    WHERE od.ProductID = @ProductA
                    INTERSECT
                    SELECT o.UserID FROM [Order] o
                    JOIN OrderDetail od ON o.OrderID = od.OrderID
                    WHERE od.ProductID = @ProductB
                )
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q26  Users who bought A but NOT B (EXCEPT) ───────────────────────────────
router.get('/users/bought-not', async (req, res) => {
    const { productA = 5, productB = 6 } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('ProductA', sql.Int, productA)
            .input('ProductB', sql.Int, productB)
            .query(`
                SELECT u.UserID, u.Username,
                       DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                       u.Gender
                FROM [User] u
                WHERE u.UserID IN (
                    SELECT o.UserID FROM [Order] o
                    JOIN OrderDetail od ON o.OrderID = od.OrderID
                    WHERE od.ProductID = @ProductA
                    EXCEPT
                    SELECT o.UserID FROM [Order] o
                    JOIN OrderDetail od ON o.OrderID = od.OrderID
                    WHERE od.ProductID = @ProductB
                )
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q27  Every product even if never ordered, with buyer demographics (RIGHT JOIN)
router.get('/products/all-with-buyers', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                p.ProductName, p.Price,
                o.OrderID,
                u.Username,
                DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                u.Gender
            FROM OrderDetail od
            RIGHT JOIN Product p ON od.ProductID = p.ProductID
            LEFT  JOIN [Order] o ON od.OrderID   = o.OrderID
            LEFT  JOIN [User] u  ON o.UserID     = u.UserID
            ORDER BY p.ProductName
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ── Q28  Full outer join — all products + all order details ──────────────────
router.get('/products/full-outer', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT
                p.ProductName, p.Price,
                od.OrderID, od.Quantity, od.UnitPrice,
                u.Username,
                DATEDIFF(YEAR, u.DateOfBirth, GETDATE()) AS Age,
                u.Gender
            FROM Product p
            FULL OUTER JOIN OrderDetail od ON p.ProductID  = od.ProductID
            LEFT JOIN [Order] o            ON od.OrderID   = o.OrderID
            LEFT JOIN [User] u             ON o.UserID     = u.UserID
            ORDER BY p.ProductName
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;