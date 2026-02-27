# Vibe Off — Agent Handoff Document

> **Live URL**: [https://vibeoff.xyz](https://vibeoff.xyz)
> **Repo**: `github.com/brydisanto/vibeoff`
> **Last Updated**: February 27, 2026

---

## 1. What This Project Is

Vibe Off is a gamified voting and recommendation platform for the **Good Vibes Club (GVC)** NFT collection (6,969 items on Ethereum). Users vote on randomized matchups:

- **1v1 Mode**: Two GVCs head-to-head. Vote with keyboard arrows or taps.
- **2v2 Duos Mode**: User-created pairs (Duos) battle each other.

Voting builds a **leaderboard** and a personal **Vibe DNA** taste profile. The platform recommends GVCs to buy based on voting patterns, linking to OpenSea listings.

A **monetization layer** lets users buy extra daily votes with the **VIBESTR ERC20 token**.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (custom tokens in `tailwind.config.ts`) |
| **Database** | Vercel KV (Upstash Redis) — all state, votes, leaderboards |
| **Web3** | wagmi v2 + RainbowKit v2 + viem |
| **Deployment** | Vercel (auto-deploy on push to `main`) |
| **Cron Jobs** | Vercel Crons (see `vercel.json`) |

### Custom Fonts
- **Brice Bold** → `font-display` / `font-cooper` (headings, "VIBE OFF!" title)
- **Mundial** → `font-mundial` (body/labels/buttons)
- **Outfit** → `font-sans` (default)

### Brand
- **GVC Gold**: `#FFE048` — primary accent, `gvc-gold` in Tailwind
- **Background**: Pure black (`#050505`) + `public/grid.svg` SVG pattern

---

## 3. Project Structure

```
app/
├── page.tsx                      # Landing → renders GameInterface
├── layout.tsx                    # Root layout (fonts, WalletProvider, analytics)
├── profile/page.tsx              # Profile dashboard (Collection, Duos, Recs, Activity tabs)
├── duos/
│   ├── page.tsx                  # 2v2 Duos voting interface
│   ├── [id]/page.tsx             # Individual Duo detail page
│   ├── hall-of-fame/page.tsx     # Duos Hall of Fame
│   └── lookup/page.tsx           # Duo lookup
├── gvc/[id]/page.tsx             # Individual GVC detail page
├── hall-of-fame/page.tsx         # 1v1 Hall of Fame (top 35)
├── lookup/page.tsx               # GVC lookup
├── daily/page.tsx                # Daily challenge
├── share/page.tsx                # Social share pages
├── admin/page.tsx                # Admin panel (protected)
└── api/                          # 20+ API route groups (see §5)

components/
├── GameInterface.tsx             # Main 1v1 voting UI
├── VibeCard.tsx                  # Individual GVC card (IPFS fallback built-in)
├── BuyVotesModal.tsx             # Payment modal (VIBESTR ERC20)
├── Leaderboard.tsx               # Leaderboard with sorting/filtering/search
├── GlobalActivityToast.tsx       # Real-time vote activity toasts
├── GlobalFeedDrawer.tsx          # Activity feed drawer
└── WalletProvider.tsx            # RainbowKit + wagmi config

lib/
├── useGameLogic.ts               # Client-side 1v1 state + server sync
├── data.ts                       # Static GVC definitions (6,969 items)
├── trait_map.json                # Full trait metadata per GVC ID
├── kv.ts                         # Vercel KV (Upstash Redis) client
├── opensea.ts                    # OpenSea API helpers (owner lookup, in-memory cache)
├── ipfs.ts                       # IPFS gateway rotation + fallback logic
├── auth.ts                       # Admin auth helper
└── ratelimit.ts                  # Rate limiting utilities

scripts/
└── fix_leaderboard_scores.js     # One-off: recalculate Redis zset scores (see §7.2)
```

---

## 4. Core Features

### 4.1 — 1v1 Voting (`GameInterface.tsx`, `lib/useGameLogic.ts`)
- **Weighted random matchups**: GVCs with fewer matches appear more often (via `/api/stats/weights`)
- **Elo rating system**: K=32, updated on every vote (currently tracked, not publicly displayed)
- **Daily limit**: 69 votes/day, expandable via VIBESTR purchases
- **Queue prefetch**: 12 future matchups are pre-generated client-side; the DOM preloads only the next 2 matchups (4 images) to avoid mobile connection starvation
- **Refresh penalty**: Refreshing during a matchup costs 1 vote (prevents free cycling)
- **Offline vote sync**: Anonymous votes stored locally, synced to server on wallet connect

### 4.2 — 2v2 Duos (`app/duos/page.tsx`)
- Users create Duos from their owned GVCs (Profile → My Duos tab)
- Random Duo-vs-Duo matchups, same daily limit system (30 votes/day, expandable)
- Separate Elo and leaderboard from 1v1
- **API is Edge Runtime** (`/api/duos/matchup`) — all Redis reads pipelined into one round-trip

### 4.3 — Profile & Recommendations (`app/profile/page.tsx`)
- **Vibe DNA**: Bayesian-smoothed trait scoring from vote history (K=10 confidence)
- Structural JSON keys (`Background`, `Type`, `Rank`, `Score`, `id`) are **explicitly excluded** from trait calculations — do not remove these exclusions
- Two recommendation views: **Listed** (buyable on OpenSea) and **All Time Vibes**
- `maxBudget` slider and `hideGrails` toggle filter client-side via `useMemo` — no extra API calls
- OpenSea listings cached server-side for 10 minutes
- Results capped at 30 displayed items

### 4.4 — Payment System (`BuyVotesModal.tsx`, `/api/payment/verify`)
- Users pay **250 VIBESTR** (ERC20 on mainnet) to buy vote packs
- Server verifies by parsing **Transfer event logs** from the transaction receipt — NOT calldata
- Atomic Redis lock (`set NX`) prevents replay attacks with concurrent requests
- Validated: `from === walletAddress`, `to === TREASURY_ADDRESS`, `value >= 250 VIBESTR`

### 4.5 — Leaderboard (`components/Leaderboard.tsx`, `app/api/leaderboard/route.ts`)
- Weekly and All-Time views; search and filter
- **CRITICAL — Sorting Algorithm**: The Redis sorted set `leaderboard:alltime` MUST use the composite score formula: `(wins - losses) * 10000 + (wins / matches) * 1000`. This is because the frontend sorts by `+/- Net Wins` then `Win Rate%` as a tiebreaker. If the backend stores a different score (e.g. raw total wins), ranks will differ between the main leaderboard and individual GVC lookup pages.

---

## 5. API Route Reference

### Voting
| Route | Method | Cache Override | Purpose |
|-------|--------|----------------|---------| 
| `/api/vote` | `GET` | `force-no-store` | Fetch daily vote count + remaining |
| `/api/vote` | `POST` | `force-no-store` | Submit 1v1 vote |
| `/api/vote/sync` | `POST` | — | Sync offline votes to wallet |

### Duos (all Edge Runtime)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/duos/matchup` | `GET` | Get random Duo matchup (pipelined Redis) |
| `/api/duos/vote` | `GET/POST` | Fetch/submit Duo votes |
| `/api/duos/submit` | `POST` | Create a new Duo |
| `/api/duos/delete` | `POST` | Delete a Duo |
| `/api/duos/my-duos` | `GET` | Fetch user's Duos |
| `/api/duos/leaderboard` | `GET` | Duos leaderboard |
| `/api/duos/[id]` | `GET` | Individual Duo stats |

### Profile & Data
| Route | Method | Cache Override | Purpose |
|-------|--------|----------------|---------| 
| `/api/profile/gvcs` | `GET` | `force-no-store` | User's owned GVCs with stats |
| `/api/profile/activity` | `GET` | — | Match history for user's GVCs |
| `/api/recommendations` | `GET` | `force-no-store` | Personalized GVC recommendations |
| `/api/leaderboard` | `GET` | `force-no-store` | Global 1v1 leaderboard |
| `/api/gvc/[id]` | `GET` | `force-no-store` | Individual GVC stats + history |
| `/api/stats/weights` | `GET` | — | Matchup weights (inverse match count) |
| `/api/traits/rankings` | `GET` | `force-no-store` | Trait ranking data |

### Payments
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/payment/verify` | `POST` | Verify VIBESTR tx and grant bonus votes |

### Infrastructure
| Route | Purpose |
|-------|---------|
| `/api/sync-owners` | Cron: sync GVC ownership from OpenSea (daily 6AM UTC) |
| `/api/daily/discord/post` | Cron: post daily stats to Discord (5PM UTC) |
| `/api/og` | OG image generation |
| `/api/ipfs` | IPFS proxy for blocked networks (UAE, etc.) |

> **Note**: All Upstash-reading API routes export `export const fetchCache = 'force-no-store'` and `export const revalidate = 0` to prevent Next.js from caching Redis responses. Do not remove these.

---

## 6. Redis Key Schema

| Key Pattern | Type | Purpose |
|-------------|------|---------|
| `votes:wallet:{wallet}` | List | Full vote history (up to 50K per wallet) |
| `votes:wallet:{wallet}:daily:{date}` | Counter | Daily vote count |
| `user:{wallet}:bonus:{type}:{date}` | Counter | Purchased bonus votes (`1v1` or `duo`) |
| `stats:weekly:{gvcId}` | Hash | `wins`, `losses`, `matches` |
| `stats:alltime:{gvcId}` | Hash | `wins`, `losses`, `matches`, `elo`, `winStreak` |
| `leaderboard:weekly` | Sorted Set | Weekly leaderboard (score = raw wins) |
| `leaderboard:alltime` | Sorted Set | **Score = `(wins-losses)*10000 + (wins/matches)*1000`** — see §4.5 |
| `history:{gvcId}` | List | Last 50 match results per GVC |
| `history:global` | List | Last 50 global matches |
| `owner:{wallet}` | Set | GVC IDs owned by wallet |
| `tx:{txHash}:lock` | String (NX) | Payment processing lock (60s TTL) |
| `tx:{txHash}:processed` | String | Replay protection for verified payments |
| `duos:all` | Sorted Set | All registered Duo IDs |
| `duos:{duoId}` | Hash | Duo data (GVCs, owner, stats) |
| `duos:votes:{date}:{deviceId}` | Counter | Duos daily votes per device |
| `duos:state:{date}:{sessionId}` | String | Session state for refresh penalty detection |
| `global:votes` | Counter | Total votes cast globally |
| `stats:vol:{bucketId}` | Counter | Vote volume in 10-min buckets (24h TTL) |

---

## 7. Recent Major Changes (Post-February 2026)

### 7.1 — Cache-Busting for All Upstash Routes
**Problem**: Next.js was aggressively caching API responses, causing stale leaderboard and vote data.

**Fix**: Added these exports to every route that reads from Redis:
```ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
```
Affected files: `api/leaderboard/route.ts`, `api/gvc/[id]/route.ts`, `api/profile/gvcs/route.ts`, `api/recommendations/route.ts`, `api/traits/rankings/route.ts`, `api/vote/route.ts`.

### 7.2 — Leaderboard Sorting Algorithm Fix
**Problem**: The backend stored `leaderboard:alltime` scores as raw `wins`, but the frontend `Leaderboard.tsx` sorted by `(wins - losses)` then `win rate%`. This caused GVCs to appear at different ranks on the main leaderboard vs. the individual GVC lookup page.

**Fix**: 
1. Updated `/api/vote/route.ts` to calculate and store the composite score on every vote for both winner AND loser.
2. Ran `scripts/fix_leaderboard_scores.js` to retroactively recalculate all 6,969 existing scores.

**Formula**:
```ts
const score = (wins - losses) * 10000 + (wins / Math.max(1, matches)) * 1000;
```
> **Important**: If you ever add a new leaderboard view with different sort logic, you must either match this formula or maintain a separate sorted set.

### 7.3 — Trait Algorithm Exclusions
**Problem**: The recommendations API (`/api/recommendations/route.ts`) and trait rankings (`/api/traits/rankings/route.ts`) were treating structural JSON metadata fields (`Background`, `Type`, `Rank`, `Score`, `id`) as actual traits, corrupting Vibe DNA scores.

**Fix**: These keys are now explicitly skipped in both `getGvcTraits()` and the trait aggregation loop. Do not remove these exclusions.

### 7.4 — Mobile Performance: Image Preloader Throttling
**Problem**: `GameInterface.tsx` had a DOM-based hidden preloader that loaded ALL 12 queued matchups (24 images) with `loading="eager"`. On mobile, this exhausted the browser connection pool and starved the main visible images.

**Fix**: Added `.slice(0, 2)` — now only preloads the next 2 matchups (4 images).

### 7.5 — DUOS Performance Optimizations
Three fixes applied to `app/duos/page.tsx` and `app/api/duos/matchup/route.ts`:

1. **Preloader**: Sliced from all queued matchups to `.slice(0, 1)` (4 images max). Switched from Next.js `<Image priority unoptimized>` to native `<img decoding="async">`.
2. **OpenSea owner fetching**: Changed from a sequential `for...of await` loop to parallel, non-blocking `.forEach` + `.then()`. Owner names appear asynchronously without delaying card rendering.
3. **Redis pipeline**: Folded the `penalty_lock` GET into the initial pipeline, eliminating a blocking round-trip between pipeline and candidate fetch.

---

## 8. Environment Variables

### Required (Vercel Dashboard)
| Variable | Purpose |
|---------|---------|
| `KV_REST_API_URL` | Upstash Redis REST endpoint |
| `KV_REST_API_TOKEN` | Upstash Redis REST auth token |
| `KV_URL` / `REDIS_URL` | Redis connection string (for local scripts) |
| `OPENSEA_API_KEY` | OpenSea API v2 key |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | ETH address receiving VIBESTR payments |
| `ETH_CHAIN` | `mainnet` or `sepolia` |

### Optional
| Variable | Purpose |
|---------|---------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID (defaults to `'demo'`, which rate-limits in prod) |
| `ETH_RPC_URL` | Custom RPC endpoint |
| `VIBESTR_ADDRESS` | VIBESTR token contract address |

> **Build Note**: If `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is not set, RainbowKit uses `'demo'` which gets rate-limited by Web3Modal and breaks the SSG build. Always set this in Vercel.

---

## 9. Deployment

### Local Development
```bash
cd /Users/bryan/.gemini/antigravity/playground/neon-solstice
npm install
npm run dev       # http://localhost:3000
```
Pull env vars: `vercel env pull .env.local`

### Production Deploy
```bash
npm run build     # verify no type errors
git push origin main   # Vercel auto-deploys on push
# OR for immediate prod:
npx vercel --prod
```

### Cron Jobs (`vercel.json`)
- `/api/sync-owners` — daily at `0 6 * * *` UTC (sync NFT ownership from OpenSea)
- `/api/daily/discord/post` — daily at `0 17 * * *` UTC (Discord stats post)

### Useful One-Off Scripts (run with `node`)
| Script | Purpose |
|--------|---------|
| `scripts/fix_leaderboard_scores.js` | Recalculate all Redis zset scores to match frontend sort |
| `sync_all_owners.js` | Bulk sync all GVC owners from OpenSea |
| `init_elo.js` | Initialize Elo ratings for all GVCs |
| `init_global_counter.js` | Set/reset global vote counter |
| `restore_leaderboard.js` | Rebuild leaderboard sorted set from hash stats |
| `fix_daily.js` | Fix daily vote counter discrepancies |

---

## 10. Known Issues & Gotchas

1. **IPFS Blocking**: UAE/Dubai and some corporate networks block IPFS gateways. `lib/ipfs.ts` has a multi-gateway fallback chain with `/api/ipfs` as the final proxy. Do not simplify this.

2. **OpenSea Rate Limits**: `lib/opensea.ts` throttles to 2 req/s with a 500ms inter-request delay. This means sequential owner lookups are slow — always fire them in parallel.

3. **Next.js Caching vs. Redis**: Next.js will cache ANY `fetch()` call inside API routes in production unless you explicitly export `fetchCache = 'force-no-store'`. Always add this to new routes that read from Upstash.

4. **VIBESTR Token Decimals**: Payment verification assumes 18 decimals (`parseEther`). If the token ever changes, update `/api/payment/verify`.

5. **Vote History Scale**: Each wallet stores up to 50,000 vote entries. The recommendations API fetches all of them with `lrange 0 -1`. Fast at current scale, but worth revisiting at extreme volume.

6. **Leaderboard Score Formula**: If the formula in `/api/vote/route.ts` is ever changed, `scripts/fix_leaderboard_scores.js` must be re-run against the production database to backfill all existing scores. Mismatch = rank inconsistency.

7. **`duoOwners` State in DUOS**: The `duoOwners` map in `app/duos/page.tsx` is not cleared between matchups — this is intentional as a cache. If a DUO's owner changes mid-session, the stale name will show until page reload.

---

## 11. Design System

| Token | Value | Usage |
|-------|-------|-------|
| `gvc-gold` | `#FFE048` | Primary CTA, badges, title, highlights |
| Background | `#050505` + `grid.svg` | Root body background |
| Cards | `bg-[#1A1A1A]` | All card surfaces |
| Card border | `border-white/10` | Default state |
| Hover border | `hover:border-gvc-gold` | Interactive card highlight |
| Error | `bg-red-500/10 border-red-500/50 text-red-400` | Error states |
| Disabled | `opacity-50 pointer-events-none` | Out-of-votes state |

**Animations**: Framer Motion throughout. Spring transitions are standard: `type: 'spring', stiffness: 300, damping: 30`.

**Mobile-first**: All components use `md:` breakpoints as the desktop upgrade. Default (<md) is the mobile layout.
