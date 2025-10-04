## Note: Pinned to Next.js 14
This copy has been adjusted to run on Next.js 14 with Node 18 on Vercel.

- Dependencies pinned: next@14.2.5, react@18.2.0, react-dom@18.2.0
- Added `.npmrc` with `save-exact=true`
- Removed lockfiles for a clean install (`npm i` will produce a fresh package-lock.json compatible with Next 14)
- Set `engines.node = "18.x"` to hint Vercel to use Node 18

Suggested deploy steps:
1) npm i --no-audit --no-fund
2) npm run build
3) vercel --prod
