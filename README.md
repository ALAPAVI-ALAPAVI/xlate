# xlate — terminal translator (Vercel, free)

Files: `index.html` (the page) and `api/translate.js` (the serverless function). No build step, no API key.

## Deploy
1. Create a free account at vercel.com.
2. Push this folder to a GitHub repo, then in Vercel: Add New > Project > import the repo > Deploy.
   (Or from this folder: `npx vercel` then `npx vercel --prod`.)
3. Open the URL Vercel gives you. Anyone can use it.

## Optional
- Add env var `MYMEMORY_EMAIL` (your email) in Project Settings > Environment Variables to raise MyMemory's free daily limit.

## Limits
- Free engine (MyMemory): ~30 languages, 450 characters per message, daily cap; no regional dialects; weaker than Claude on slang and idioms.
- Vercel Hobby plan is for non-commercial use.
