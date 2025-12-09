import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Unexpected errors on idle clients should not crash the app
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit the process here, just log it
});

export { pool };
