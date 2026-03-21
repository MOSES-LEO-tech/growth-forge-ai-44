"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../src/config/database");
function migrate() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting schools migration...');
        try {
            // Create schools table
            yield database_1.pool.query(`
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
            yield database_1.pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
        `);
            console.log('✓ Added school_id to users');
            // Add school_id to events
            yield database_1.pool.query(`
            ALTER TABLE events ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);
        `);
            console.log('✓ Added school_id to events');
            // Add foreign key constraint for schools.created_by
            yield database_1.pool.query(`
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
        }
        catch (error) {
            console.error('❌ Migration failed:', error);
        }
        finally {
            yield database_1.pool.end();
        }
    });
}
migrate();
