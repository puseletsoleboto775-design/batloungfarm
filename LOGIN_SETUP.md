# Batloung Farm Distribution — Login setup

## 1. Configure backend credentials

Open `backend/.env` (not `.env.example`) and add these settings. Use your own strong passwords and a long random JWT secret:

```env
JWT_SECRET=put-a-long-random-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-strong-admin-password
SALES_USERNAME=sales
SALES_PASSWORD=choose-a-strong-sales-password
```

Do not share or commit `backend/.env`.

## 2. Install and start the backend

From the `backend` folder:

```bash
npm install
npm run dev
```

When the database is connected, the first startup creates the `users` table and creates the initial admin and sales accounts from the four environment settings above. This automatic initial account creation only happens when the users table is empty.

## 3. Start the frontend

In a second terminal, from the project root:

```bash
npm install
npm run dev
```

Open the Vite address shown in the terminal and sign in.

## 4. Roles

- `ADMIN`: full access to management, purchases, reports, users, and sales.
- `SALES`: overview/sales workspace; can view vendors and inventory needed to record sales; cannot access supplier management, purchases, or reports.

All protected API routes require a valid login token. Passwords are stored as salted scrypt hashes.

## Important

If the `users` table already contains records, the automatic initial account creation will not add default users. In that case, create an initial account by clearing/renaming the empty test users table only if it contains no accounts, or use a controlled database administrator process. Do not delete existing user records.
