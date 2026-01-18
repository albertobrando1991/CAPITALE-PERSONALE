import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});

async function setAdmin() {
  const client = await pool.connect();
  try {
    // Insert owner as super_admin
    const result = await client.query(`
      INSERT INTO user_roles (user_id, role, assigned_by)
      VALUES ('admin-user-123', 'super_admin', 'system')
      ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin'
      RETURNING *
    `);
    console.log('✅ Owner role set:', result.rows[0]);

    // Check all roles
    const roles = await client.query('SELECT * FROM user_roles');
    console.log('\nAll user_roles:', roles.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

setAdmin();
