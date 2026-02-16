# Vibe Off (Neon Solstice) - Project Handover

## Project Overview
**Name**: Neon Solstice (Vibe Off)
**Goal**: A gamified voting and recommendation platform for the Good Vibes Club (GVC) NFT collection. Users vote on "Vibe Offs" (1v1 battles) to rank characters, earn a "Vibe DNA" profile, and get personalized recommendations for GVCs to buy.
**Live URL**: [https://vibeoff.xyz](https://vibeoff.xyz)

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Vercel KV (Upstash Redis) for all state, votes, and leaderboards.
- **Deployment**: Vercel
- **Web3**: Wagmi / RainbowKit for wallet connection.

## Core Features
1.  **Vibe Off (Battle Mode)**:
    -   Random 1v1 matchups between GVCs.
    -   Elo rating system updates in background.
    -   Daily vote limit (currently 69 votes/day).
2.  **Profile Dashboard**:
    -   **My Collection**: Displays owned GVCs.
    -   **My Duos**: Manage 2v2 teams.
    -   **Activity**: Recent vote history.
    -   **Recommendation Machine**: Personalized GVC suggestions.
3.  **Recommendation Engine**:
    -   **Logic**: Tracks user votes. Winner traits = +1, Loser traits = -0.5.
    -   **Data Source**: Fetches live OpenSea listings to show purchasing options.
    -   **Persistence**: Stores last 10,000 votes per wallet to build a long-term preference profile.

## Key File Structure
-   `app/page.tsx`: Main battle interface.
-   `app/profile/page.tsx`: User profile, tabs, and recommendation display.
-   `app/api/vote/route.ts`: Handles vote submission, stats updates, and history storage (Redis).
-   `app/api/recommendations/route.ts`: Generates trait scores and fetches OpenSea listings.
-   `lib/useGameLogic.ts`: Client-side game state management and server sync.
-   `components/GameInterface.tsx`: The main voting UI component.

## Recent Changes (Session Summary)
-   **Vote History**: increased server-side retention from 200 to **10,000 votes** per wallet to ensure long-term learning.
-   **Recommendations API**: Updated to fetch **full history** (`0, -1`) from Redis.
-   **UI Layout**: Refined Recommendations tab. Moved controls (Price Slider, Tabs) into the grid and right-aligned them.
-   **Defaults**:
    -   Expanded recommendation lists (Listed & All-Time) to **20 items**.
    -   Set default Max Price filter to **3 ETH**.
-   **Deployment**: All changes are deployed to production.

## Environment Variables (Required)
Ensure these are set in Vercel or `.env.local`:
-   `KV_URL` / `KV_REST_API_URL`
-   `KV_TOKEN` / `KV_REST_API_TOKEN`
-   `OPENSEA_API_KEY`: For fetching live listings.
-   `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: For RainbowKit.

## Next Steps / Known Issues
1.  **Mobile Responsiveness**: Verify the new right-aligned controls on smaller screens.
2.  **Daily Limit**: Confirm the UTC-based daily limit reset works as expected for users in different timezones.
3.  **Performance**: Monitor the `recommendations` API latency as vote history grows (fetching 10k items might eventually need pagination or summary storage).
