# Home Easy Web (Next.js + Tailwind)

## Setup
```bash
cd /Users/trungngovan/Repositories/personal-repo/home-easy/frontend
npm install
# copy env
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev
```

## Pages
- `/` landing
- `/login`, `/register`
- `/dashboard` (overview)
- `/rooms`
- `/invoices`
- `/maintenance`

## API config
- `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8000/api` if not set.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` required for Google Sign-In on the login page.
- `src/lib/api.ts` has endpoint map and fetch helper (add auth token storage as needed).
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Prep checklist (monorepo):
- Root directory: `frontend`
- Build command: `npm run build` (install via `npm ci`)
- Output directory: `.next`
- Env (Production/Preview):
  - `NEXT_PUBLIC_API_BASE_URL` (set to `/api` to use Vercel rewrite, or full URL)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  - `API_BASE_URL` (private; for rewrite target, e.g. Railway API base)
- No Supabase keys on FE; backend handles all Supabase access.

Deploy with the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
