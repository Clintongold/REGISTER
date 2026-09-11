# Vehicle License Registry Dashboard

Internal staff dashboard for a registry unit to manage companies, vehicle
fleets, and annual license plate renewals.

## Stack
- **Frontend:** React + Vite, Tailwind (via CDN, no build step needed)
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Hosting:** Cloudflare Pages (deploys from this GitHub repo)

## Project layout
```
src/                     React app
supabase/migrations/      Versioned SQL schema (source of truth for the DB)
supabase/functions/       Edge Function source (license-renewal, generate-receipt)
.github/workflows/        Optional Supabase keep-alive cron (free-tier only)
```

## 1. Supabase setup
1. Create a Supabase project (or reuse one already provisioned for this app).
2. Run the SQL in `supabase/migrations/0001_initial_schema.sql` against it
   (SQL Editor, or `supabase db push` if using the CLI).
3. Deploy the two Edge Functions:
   ```
   supabase functions deploy license-renewal
   supabase functions deploy generate-receipt
   ```
4. Create the first staff account:
   - In Supabase Auth, create a user (email + password).
   - In the `profiles` table, insert a row with that user's `id`,
     `full_name`, and `role` (`admin` or `staff`).
   - All further staff accounts should be created the same way — there is
     no public sign-up in this app by design.

## 2. Frontend setup
```
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project settings
npm run dev      # local development
npm run build    # production build -> dist/
```

## 3. Quick test on GitHub Pages (optional, before Cloudflare)
A ready-made workflow (`.github/workflows/deploy-pages.yml`) builds and
publishes the app automatically on every push to `main`, giving you a
live URL to test with right away:

1. Push this repo to GitHub.
2. In the repo, go to **Settings > Pages > Build and deployment > Source**
   and select **GitHub Actions** (one-time setup).
3. Add two repo secrets (**Settings > Secrets and variables > Actions**):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to `main` (or run the workflow manually from the Actions tab).
   Once it finishes, the Actions run summary shows your live URL —
   something like `https://<your-username>.github.io/<repo-name>/`.

Note: this is a temporary test URL. It's served from a subpath
(`/repo-name/`), which the app already accounts for, but it's still
worth doing a full click-through test on the real Cloudflare Pages URL
before handover, since that's the actual production home (served from
the domain root, no subpath quirks).

## 4. Deploy to Cloudflare Pages
1. Push this repo to GitHub.
2. In Cloudflare Pages, create a project connected to the GitHub repo.
3. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables in Pages project settings (Production and
   Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
5. Deploy. Pages will auto-redeploy on every push to `main`.
6. A custom domain can be attached later under Pages > Custom domains —
   the free `*.pages.dev` subdomain works fine for testing in the meantime.

## 5. Optional: keep-alive workflow
Only needed if staying on Supabase's free tier (which pauses a project
after 7 days of inactivity). Add these two repo secrets in GitHub
(Settings > Secrets and variables > Actions):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

The workflow in `.github/workflows/keep-alive.yml` will then ping the
project every 4 days. If/when the project is upgraded to a paid plan,
this workflow can be deleted — it's not needed.

## Handover / portability notes
This app is intentionally config-driven and holds no hardcoded identifiers:
- The database schema lives in `supabase/migrations/`, so it can be
  replayed against any fresh Supabase project.
- The frontend reads its Supabase connection entirely from environment
  variables, so pointing it at a new project is a config change, not a
  code change.
- To fully transfer ownership to the end client: transfer the GitHub
  repo to their account/org, have them create their own Supabase project
  and run the migration + deploy the functions, recreate the Cloudflare
  Pages project under their account pointing at the transferred repo, and
  update the environment variables to the new project's URL/key.
