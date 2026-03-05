require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const EventEmitter = require('events');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// ✅ CONCEPT 5: Custom Event Emitter
// ============================================================
class StoreEmitter extends EventEmitter { }
const storeEvents = new StoreEmitter();

storeEvents.on('newListener', (eventName, listener) => {
    if (eventName !== 'newListener') {
        console.log(`[System Audit] 🔔 New listener registered for event: "${eventName}"`);
    }
});

storeEvents.once('productAdded', (product) => {
    console.log(`🎉 [One-Time Alert] First product added this session: "${product.name}" — Welcome aboard!`);
});

storeEvents.on('productAdded', (product) => {
    console.log(`[Log] ✅ Product added → Name: "${product.name}", Category: "${product.category}", Stock: ${product.stock}`);
});

storeEvents.on('productDeleted', (id) => {
    console.log(`[Log] 🗑️  Product deleted → ID: ${id} removed from inventory`);
});

// ============================================================
// ✅ MYSQL DATABASE CONNECTION
// ============================================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'smartcartdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('✅ Connected to MySQL Database (smartcartdb)');
        connection.release();
    }
});

// ============================================================
// HTTP ROUTES
// ============================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'App.html'));
});

// ================= DB STATUS ROUTE =================
app.get('/api/status', (req, res) => {
    db.query('SELECT 1', (err) => {
        if (err) {
            return res.status(500).json({ status: 'offline', message: err.message });
        }
        res.status(200).json({ status: 'online' });
    });
});

// ================= AUTHENTICATION =================
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(sql, [name, email, password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email already registered' });
            }
            console.error('Registration error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(201).json({ message: 'Registration successful! Proceed to Login ✅' });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
    }
    const sql = 'SELECT id, name, email FROM users WHERE email = ? AND password = ?';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials ❌' });
        }
        res.status(200).json({ message: 'Login successful ✅', user: results[0] });
    });
});

// ================= PRODUCTS =================
app.get('/products', (req, res) => {
    const sql = 'SELECT * FROM products ORDER BY id DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Products fetch error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.status(200).json(results);
    });
});

app.post('/add-product', (req, res) => {
    const { name, category, price, stock, rating } = req.body;
    if (!name || !category || price == null || stock == null) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    const sql = 'INSERT INTO products (name, category, price, stock, rating) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, category, price, stock, rating || 4.0], (err, result) => {
        if (err) {
            console.error('Add product error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        // Emit event for analytics
        const newProduct = { id: result.insertId, name, category, price, stock };
        storeEvents.emit('productAdded', newProduct);

        res.status(201).json({ message: 'Product added successfully' });
    });
});

app.delete('/delete-product', (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ message: 'Product ID required' });

    const sql = 'DELETE FROM products WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Delete product error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Emit event for analytics
        storeEvents.emit('productDeleted', id);

        res.status(200).json({ message: 'Product deleted successfully' });
    });
});

// ================= EVENT DIAGNOSTICS =================
app.get('/api/system/events', (req, res) => {
    const addedListeners = storeEvents.listeners('productAdded');
    const deletedListeners = storeEvents.listeners('productDeleted');

    const report = {
        title: 'SmartCart Event System Diagnostic',
        events: {
            productAdded: {
                listenerCount: storeEvents.listenerCount('productAdded'),
                listeners: addedListeners.map((fn, i) => ({
                    index: i + 1,
                    name: fn.name || `anonymous_${i + 1}`,
                    source: fn.toString().slice(0, 120) + '...'
                }))
            },
            productDeleted: {
                listenerCount: storeEvents.listenerCount('productDeleted'),
                listeners: deletedListeners.map((fn, i) => ({
                    index: i + 1,
                    name: fn.name || `anonymous_${i + 1}`,
                    source: fn.toString().slice(0, 120) + '...'
                }))
            }
        }
    };
    res.status(200).json(report);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ SmartCart server running at http://localhost:${PORT}`);
    console.log(`📊 Event diagnostics available at http://localhost:${PORT}/api/system/events`);
});
