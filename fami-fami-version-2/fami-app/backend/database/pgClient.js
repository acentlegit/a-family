const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'family_portal',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10 seconds
});

// Test connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Helper function to check if PostgreSQL is available
const isPostgreSQLAvailable = async () => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
};

// Helper function to execute queries with retry logic
const query = async (text, params, retries = 2) => {
  const start = Date.now();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 100) { // Only log slow queries
        console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
      }
      return res;
    } catch (error) {
      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || 
          error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout')) {
        if (attempt < retries) {
          console.log(`⚠️ PostgreSQL connection attempt ${attempt + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
        console.error('❌ PostgreSQL connection error after retries:', error.message);
        const pgError = new Error('PostgreSQL database is not available. Please ensure PostgreSQL is running and configured.');
        pgError.code = 'PG_UNAVAILABLE';
        pgError.originalError = error;
        throw pgError;
      }
      
      // For database doesn't exist error (specific PostgreSQL error code)
      if (error.code === '3D000') {
        console.error('❌ Database does not exist:', error.message);
        const dbError = new Error('Database does not exist. Please create the database: CREATE DATABASE family_portal;');
        dbError.code = 'PG_DATABASE_NOT_FOUND';
        dbError.originalError = error;
        throw dbError;
      }
      
      // Check for "relation does not exist" vs "database does not exist" - these are different!
      if (error.code === '42P01' && error.message?.includes('does not exist')) {
        // This is a table/relation error, not a database error - let it through as a normal error
        console.error('❌ Table/relation does not exist:', error.message);
        throw error;
      }
      
      // For authentication errors
      if (error.code === '28P01' || error.message?.includes('password authentication failed')) {
        console.error('❌ PostgreSQL authentication failed');
        const authError = new Error('PostgreSQL authentication failed. Please check your credentials in .env file.');
        authError.code = 'PG_AUTH_FAILED';
        authError.originalError = error;
        throw authError;
      }
      
      console.error('Query error:', error);
      throw error;
    }
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set a timeout to prevent hanging queries
  const timeout = setTimeout(() => {
    console.error('Query timeout - releasing client');
    client.release();
  }, 30000);
  
  client.query = (...args) => {
    clearTimeout(timeout);
    return query(...args);
  };
  
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };
  
  return client;
};

module.exports = {
  pool,
  query,
  getClient,
  isPostgreSQLAvailable,
};
