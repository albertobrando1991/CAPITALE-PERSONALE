Implementation Plan - Admin Dashboard & Staff Tools
This plan outlines the integration of a complete Admin Panel directly into the existing web application.

Goal Description
Create a secure, comprehensive /admin dashboard accessible only to users with 'admin' or 'staff' roles. This dashboard will allow management of users, public library files, regulations, and subscriptions without code edits.

Proposed Changes
Database & Auth
[MODIFY] shared/schema.ts
Export * from "./schema-rbac".
Ensure migrations for RBAC tables are applied (using 
create_rbac_tables.ts
 if needed).
[READ] shared/schema-rbac.ts
Utilization of userRoles table to assign 'admin'/'staff' roles.
Utilization of adminActivityLog for auditing actions.
Server Side
[NEW] server/middleware/auth.ts
specific middleware to check req.user.role.
[NEW] server/routes/admin.ts
API endpoints for user management (promote/demote/ban).
API endpoints for file management (upload/delete).
API endpoints for regulations (CRUD).
Client Side (Admin UI)
[NEW] client/src/pages/admin/AdminLayout.tsx
Sidebar navigation and protected route wrapper.
[NEW] client/src/pages/admin/Dashboard.tsx
Overview stats.
[NEW] client/src/pages/admin/UsersPage.tsx
DataTable of users.
Actions: Change Role, Invite User (simulated or email).
[NEW] client/src/pages/admin/LibraryPage.tsx
File manager interface.
Drag & drop upload zone.
[NEW] client/src/pages/admin/RegulationsPage.tsx
Form to add/edit regulations links/content.
Verification Plan
Automated Tests
Test API endpoints for permission denial (accessing admin routes as normal user).
Manual Verification
Login as Admin -> Access Dashboard.
Login as User -> Access Dashboard -> Expect 403 Forbidden.
Upload a file in Admin Panel -> Check it appears in Public Library.
Promote a user to Staff -> Verify they can access Admin Panel.
