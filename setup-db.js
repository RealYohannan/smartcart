const mysql = require('mysql2');
require('dotenv').config();

// Connect without a database first to create it
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL for setup:', err.message);
        process.exit(1);
    }
    console.log('Connected to MySQL. Setting up database...');

    const createDbQuery = `CREATE DATABASE IF NOT EXISTS smartcartdb`;

    connection.query(createDbQuery, (err, result) => {
        if (err) {
            console.error('Error creating database:', err.message);
            connection.end();
            process.exit(1);
        }
        console.log('Database "smartcartdb" ensured.');

        // Now connect to the new database to create tables
        const dbConnection = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: 'smartcartdb'
        });

        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            );
        `;

        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(100) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                stock INT NOT NULL,
                added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rating DECIMAL(3, 1) DEFAULT 4.0
            );
        `;

        dbConnection.query(createUsersTable, (err, result) => {
            if (err) console.error('Error creating users table:', err.message);
            else console.log('Table "users" ensured.');

            dbConnection.query(createProductsTable, (err, result) => {
                if (err) console.error('Error creating products table:', err.message);
                else console.log('Table "products" ensured.');

                dbConnection.end();
                connection.end();
            });
        });
    });
});
