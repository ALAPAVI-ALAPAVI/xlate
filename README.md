# xlate — terminal translator (Vercel, free)

Files: `index.html` (the page), `api/translate.js` (the serverless function), `vercel.json` and `package.json`. No build step, no API key.

## Deploy
1. Create a free account at vercel.com.
2. Push this folder to a GitHub repo, then in Vercel: Add New > Project > import the repo > Deploy.
   (Or from this folder: `npx vercel` then `npx vercel --prod`.)
3. Open the URL Vercel gives you. Anyone can use it.

## Optional
- Add env var `MYMEMORY_EMAIL` (your email) in Project Settings > Environment Variables to raise MyMemory's free daily limit.

## Limits
- No per-message length limit: long text is split into pieces and stitched back together. Very long text is slower (the function may run up to 60 seconds) and uses up MyMemory's free daily quota faster.
- Free engine (MyMemory): ~30 languages, daily cap; no regional dialects; weaker than Claude on slang and idioms.
- Vercel Hobby plan is for non-commercial use.
