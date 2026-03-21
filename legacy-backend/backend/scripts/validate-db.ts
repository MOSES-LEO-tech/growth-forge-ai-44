import { pool } from '../src/config/database';

async function validateDatabase() {
    console.log('🔍 Starting Database Validation...\n');

    let issuesFound = 0;

    try {
        // 1. Check for orphaned records
        console.log('1️⃣ Checking for orphaned records...');

        // Projects without valid owners
        const orphanedProjects = await pool.query(`
            SELECT COUNT(*) as count FROM projects 
            WHERE owner_id NOT IN (SELECT id FROM users)
        `);
        if (parseInt(orphanedProjects.rows[0].count) > 0) {
            console.log(`   ❌ Found ${orphanedProjects.rows[0].count} orphaned projects`);
            issuesFound++;
        } else {
            console.log('   ✅ No orphaned projects');
        }

        // Events without valid creators
        const orphanedEvents = await pool.query(`
            SELECT COUNT(*) as count FROM events 
            WHERE created_by NOT IN (SELECT id FROM users)
        `);
        if (parseInt(orphanedEvents.rows[0].count) > 0) {
            console.log(`   ❌ Found ${orphanedEvents.rows[0].count} orphaned events`);
            issuesFound++;
        } else {
            console.log('   ✅ No orphaned events');
        }

        // Media without valid events
        const orphanedMedia = await pool.query(`
            SELECT COUNT(*) as count FROM media_items 
            WHERE event_id NOT IN (SELECT id FROM events)
        `);
        if (parseInt(orphanedMedia.rows[0].count) > 0) {
            console.log(`   ❌ Found ${orphanedMedia.rows[0].count} orphaned media items`);
            issuesFound++;
        } else {
            console.log('   ✅ No orphaned media items');
        }

        // 2. Check soft delete consistency
        console.log('\n2️⃣ Checking soft delete consistency...');

        const deletedEventsWithMedia = await pool.query(`
            SELECT e.id, e.title, COUNT(m.id) as media_count
            FROM events e
            JOIN media_items m ON e.id = m.event_id AND m.deleted_at IS NULL
            WHERE e.deleted_at IS NOT NULL
            GROUP BY e.id, e.title
        `);
        if (deletedEventsWithMedia.rows.length > 0) {
            console.log(`   ⚠️  Found ${deletedEventsWithMedia.rows.length} deleted events with active media`);
            deletedEventsWithMedia.rows.forEach((row: any) => {
                console.log(`      - Event "${row.title}" (ID: ${row.id}) has ${row.media_count} active media items`);
            });
        } else {
            console.log('   ✅ Soft delete consistency is good');
        }

        // 3. Check for users without schools (if schools exist)
        console.log('\n3️⃣ Checking user-school relationships...');

        const schoolsExist = await pool.query(`
            SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'schools')
        `);

        if (schoolsExist.rows[0].exists) {
            const teachersWithoutSchool = await pool.query(`
                SELECT COUNT(*) as count FROM users 
                WHERE role = 'teacher' AND school_id IS NULL
            `);
            if (parseInt(teachersWithoutSchool.rows[0].count) > 0) {
                console.log(`   ⚠️  Found ${teachersWithoutSchool.rows[0].count} teachers without a school`);
            } else {
                console.log('   ✅ All teachers are assigned to schools');
            }
        } else {
            console.log('   ℹ️  Schools table does not exist yet');
        }

        // 4. Check for duplicate emails
        console.log('\n4️⃣ Checking for duplicate emails...');

        const duplicateEmails = await pool.query(`
            SELECT email, COUNT(*) as count 
            FROM users 
            GROUP BY email 
            HAVING COUNT(*) > 1
        `);
        if (duplicateEmails.rows.length > 0) {
            console.log(`   ❌ Found ${duplicateEmails.rows.length} duplicate emails`);
            duplicateEmails.rows.forEach((row: any) => {
                console.log(`      - ${row.email} (${row.count} occurrences)`);
            });
            issuesFound++;
        } else {
            console.log('   ✅ No duplicate emails');
        }

        // 5. Summary
        console.log('\n' + '='.repeat(50));
        if (issuesFound === 0) {
            console.log('✅ Database validation passed! No critical issues found.');
        } else {
            console.log(`⚠️  Database validation found ${issuesFound} critical issue(s).`);
            console.log('Please review and fix the issues above.');
        }
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Database validation failed:', error);
    } finally {
        await pool.end();
    }
}

validateDatabase();
