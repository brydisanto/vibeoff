---
description: Deploy to production and commit to GitHub
---

# Deploy to Production

When deploying changes to production, follow these steps:

// turbo-all
1. Commit and push changes to GitHub:
```bash
cd /Users/bryan/.gemini/antigravity/playground/neon-solstice && git add . && git commit -m "[describe changes]" && git push
```

2. Deploy to Vercel production:
```bash
cd /Users/bryan/.gemini/antigravity/playground/neon-solstice && npx vercel --prod --yes
```

## Notes
- Always commit to GitHub BEFORE deploying to Vercel
- Use descriptive commit messages that summarize the changes
- GitHub repo: https://github.com/brydisanto/vibeoff
- Production URL: https://vibeoff.xyz
