'use strict';

const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: '20.27.221.222',
    user: 'xiangzuguanjia',
    password: 'xiangzuguanjia',
    database: 'xiangzuguanjia',
    connectTimeout: 5000,
  };

  console.log(`Connecting to ${config.host}:3306...`);

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connection successful!');
    await connection.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    if (err.code === 'ETIMEDOUT') {
      console.error('Tip: Check if the 3306 port is open on the remote firewall.');
    }
  }
}

testConnection();
