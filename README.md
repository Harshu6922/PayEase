# Payroll MVP Setup Instructions

## Prerequisites
- Node.js (v18+)
- Supabase Account

## 1. Supabase Setup
1. Create a new project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of `sql/schema.sql` and run it to set up the database and RLS policies.
4. Note down your `Project URL` and `anon public` keys from Project Settings -> API.

## 2. Environment Variables
1. Ensure you have copied `.env.example` to `.env.local`.
2. Update the variables with your Supabase keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## 3. Creating the First Admin
Since this is an internal tool, you can create the first admin user via the Supabase Dashboard:
1. Go to Authentication -> Users.
2. Click "Add user" -> "Create new user".
3. Enter an email and password.
4. Go to the Table Editor, open the `companies` table, and add a row manually (e.g., Name: Acme Corp). Copy its ID.
5. Open the `profiles` table, add a new row. Set `id` to the new user's UUID, and `company_id` to the company's UUID.
   
*(Note: A registration flow can be added later, but this is the fastest way to test the MVP as an existing company).*

## 4. Running the App Local
Since you don't have Node.js locally right now, you need to execute this locally after installing it, or deploy to Vercel.

**Local Execution**
1. Run `npm install`
2. Run `npm run dev`
3. Navigate to `http://localhost:3000`

## 5. Deployment
This project is ready to be deployed to Vercel. 
1. Push to GitHub.
2. Import project in Vercel.
3. Don't forget to add the Supabase Environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel dashboard.
