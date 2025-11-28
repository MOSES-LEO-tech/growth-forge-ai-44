import { pool } from '../src/config/database';

async function migrate() {
    console.log('Starting schools migration...');
    try {
        // Create schools table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS schools (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                education_system VARCHAR(100),
                description TEXT,
                logo_url VARCHAR(255),
                created_by INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
            );
        `);
        console.log('✓ Schools table created');

        // Add school_id to users
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
        `);
        console.log('✓ Added school_id to users');

        // Add school_id to events
        await pool.query(`
            ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
        `);
        console.log('✓ Added school_id to events');

        // Add foreign key constraint for schools.created_by
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'fk_schools_created_by'
                ) THEN
                    ALTER TABLE schools ADD CONSTRAINT fk_schools_created_by 
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
                END IF;
            END $$;
        `);
        console.log('✓ Added foreign key constraint for schools.created_by');

        console.log('\n✅ Schools migration successful');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
