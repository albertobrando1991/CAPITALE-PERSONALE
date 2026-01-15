
import 'dotenv/config'; // Load .env
import { pool } from './server/db';

async function checkData() {
    const concorsoId = 'b8809028-39c9-434b-91ae-2c164bfc073f'; // From logs

    try {
        console.log("Checking Fase 3 Data...");
        
        // 1. Count Errors
        const errors = await pool.query('SELECT COUNT(*) FROM fase3_errors WHERE concorso_id = $1', [concorsoId]);
        console.log(`Total Errors: ${errors.rows[0].count}`);

        // 2. Count Bins
        const bins = await pool.query('SELECT * FROM fase3_error_bins WHERE concorso_id = $1', [concorsoId]);
        console.log(`Total Bins: ${bins.rows.length}`);
        console.log("Bins details:", bins.rows);

        // 3. Check for Orphaned Errors (errors with invalid bin_id)
        // Note: This query assumes error_bin_id IS NULL or points to non-existent bin
        const orphaned = await pool.query(`
            SELECT COUNT(*) FROM fase3_errors e
            LEFT JOIN fase3_error_bins b ON e.error_bin_id = b.id
            WHERE e.concorso_id = $1 AND b.id IS NULL
        `, [concorsoId]);
        console.log(`Orphaned Errors (invalid bin_id): ${orphaned.rows[0].count}`);
        
        if (parseInt(orphaned.rows[0].count) > 0) {
            console.log("⚠️ FOUND ORPHANED ERRORS! This is why they don't show up.");
            
            // Sample orphaned errors
            const sample = await pool.query(`
                 SELECT e.id, e.topic_name, e.question_text 
                 FROM fase3_errors e
                 LEFT JOIN fase3_error_bins b ON e.error_bin_id = b.id
                 WHERE e.concorso_id = $1 AND b.id IS NULL
                 LIMIT 3
            `, [concorsoId]);
            console.log("Sample Orphaned Errors:", sample.rows);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await pool.end();
    }
}

checkData();
