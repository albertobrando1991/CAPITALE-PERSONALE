
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users } from "./shared/schema-base";
import { userRoles } from "./shared/schema-rbac";
import { eq } from "drizzle-orm";
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

async function checkUsers() {
  console.log("Checking users...");
  try {
      const allUsers = await db.select().from(users);
      console.log("Users found:", allUsers.length);
      for (const user of allUsers) {
        console.log(`User: ${user.id} - ${user.email} - ${user.firstName} ${user.lastName}`);
        const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
        console.log(`Roles:`, roles);
        
        // Force update if it matches
        if (user.email === 'albertobrando1991@gmail.com') {
            console.log("Found target user, forcing super_admin...");
            await db.delete(userRoles).where(eq(userRoles.userId, user.id));
            await db.insert(userRoles).values({
                userId: user.id,
                role: 'super_admin'
            });
            console.log("Updated role to super_admin");
        }
      }
  } catch (error) {
      console.error("Error checking users:", error);
  } finally {
      await pool.end();
  }
}

checkUsers().then(() => {
    console.log("Done");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
