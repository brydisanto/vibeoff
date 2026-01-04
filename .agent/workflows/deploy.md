---
description: Deploy the application to Vercel
---

# Deploy to Vercel

1. Check if the user is authenticated with Vercel:
   ```bash
   npx vercel whoami
   ```
   If not, ask the user to login via `npx vercel login`.

2. Run the deployment command:
   ```bash
   npx vercel
   ```

3. If this receives a 403 or permissions error, it likely means we need the user to run this interactively in their own terminal because we cannot handle the interactive login/auth flow purely via the agent.

4. Once deployed, run production build to confirm:
   ```bash
   npx vercel --prod
   ```
