# Deploying "Vibe Offs"

This guide will help you deploy the "Vibe Offs" application so others can play it.

## Option 1: Vercel (Recommended)

Vercel is the easiest place to deploy Next.js apps.

### Prerequisites

- You need a [Vercel account](https://vercel.com/signup) (free).
- Using GitHub is the easiest way to manage updates, but you can also deploy from the command line.

### Steps (Command Line)

1.  Open the terminal in your project folder.
2.  Run the following command:
    ```bash
    npx vercel
    ```
3.  Follow the prompts:
    - **Set up and deploy?** [Y]
    - **Which scope?** [Select your account]
    - **Link to existing project?** [N]
    - **Project Name?** `vibe-offs` (or whatever you prefer)
    - **Directory?** `./` (default)
    - **Auto-detect settings?** [Y] (It should detect Next.js)

4.  Wait for deployment to finish. It will give you a live URL (e.g., `https://vibe-offs.vercel.app`).

### Updating

When you make changes, just run `npx vercel --prod` to push the update live.

## Option 2: Docker / Self-Hosting

If you prefer to host it yourself, you can build the production app:

1.  Build: `npm run build`
2.  Start: `npm run start`

The app will run on port 3000.
