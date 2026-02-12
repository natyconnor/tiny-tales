# 📖 Tiny Tales

A magical reading exercise generator for kids! Create simple, engaging stories with customizable word lengths perfect for early readers.

![Tiny Tales](https://img.shields.io/badge/Made%20with-❤️-red) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-teal)

## ✨ Features

- **📝 Custom Topics**: Enter any topic for your story (brave cats, magical forests, funny robots...)
- **📏 Word Length Control**: Slider to set maximum letters per word (3-8 letters)
- **🎨 Kid-Friendly UI**: Colorful, playful design with dyslexia-friendly fonts
- **🖨️ Print Stories**: Export and print stories for offline reading
- **📚 Story History**: Automatically saves recent stories to localStorage
- **✨ Word Highlighting**: Hover over words for interactive reading practice
- **🔗 Share Stories**: Share your favorite tales with others without needing a login

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/tiny-tales.git
   cd tiny-tales
   pnpm install
   ```

2. **Set up Convex** (required for the app)
   ```bash
   npx convex dev
   ```
   This creates a Convex project, deploys the schema, and adds `VITE_CONVEX_URL` to `.env.local`. Keep this running in one terminal.

3. **Add API keys** (optional but recommended)

   Edit `.env.local` and add:
   ```env
   # Pollinations API for AI text + server-proxied image generation
   POLLINATIONS_API_KEY=your_pollinations_api_key_here
   # Recommended: stable secret for signed /api/image tokens
   IMAGE_PROXY_SIGNING_SECRET=your_random_long_secret_here
   ```
   Get a key at [Pollinations](https://pollinations.ai/).

4. **Start the app** (in a second terminal)
   ```bash
   pnpm dev:all
   ```
   Open [http://localhost:5173](http://localhost:5173). The API server runs on port 3001; Vite proxies `/api/*` to it.

### Development Notes

- **Terminals**: You need `npx convex dev` (Convex backend) and `pnpm dev:all` (frontend + API) running
- **Alternative**: Run `pnpm dev:api` and `pnpm dev` separately if you prefer
- **API port**: Override with `API_PORT` env variable


## 🌐 Deployment

Deploy to **Vercel** (configured via `vercel.json`):

1. Push to GitHub and import the project in [Vercel](https://vercel.com)
2. Add environment variables:
   - `VITE_CONVEX_URL` — from your Convex dashboard (deploy with `npx convex deploy`)
   - `POLLINATIONS_API_KEY` — for AI generation
   - `IMAGE_PROXY_SIGNING_SECRET` — secret used to sign internal image proxy URLs
3. Deploy; Vercel builds the frontend and runs the API serverless function

Shared story links (`/s/:id`) are handled by the SPA rewrite in `vercel.json`.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI**: Pollinations API (text + images)
- **Backend**: Convex (story sharing)
- **Deployment**: Vercel
- **Storage**: Convex

## 📁 Project Structure

```
tiny-tales/
├── api/
│   ├── generate.ts      # Story generation endpoint
│   ├── image.ts         # Server-side image proxy endpoint
│   └── imageProxyToken.ts # HMAC signing helpers for proxy URLs
├── convex/
│   ├── schema.ts        # Shared stories schema
│   └── stories.ts       # Share & fetch mutations/queries
├── src/
│   ├── components/      # UI components
│   ├── App.tsx
│   └── main.tsx
├── server.ts            # Local dev API server
├── vercel.json          # Vercel config + rewrites
└── vite.config.ts       # Vite config + API proxy
```

## 🎯 How It Works

1. **Enter a topic** — What should the story be about?
2. **Set word length** — Slider for max letters per word (3–8)
3. **Generate** — AI creates a story and 4 illustrations
4. **Read & share** — Hover words, print, or share via link

## 🙏 Attribution

Tiny Tales uses [pollinations.ai](https://pollinations.ai/) for text and image generation.


Made with ❤️ for little readers everywhere
