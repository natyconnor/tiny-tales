# 📖 Tiny Tales

A magical reading exercise generator for kids! Create simple, engaging stories with customizable word lengths perfect for early readers.

![Tiny Tales](https://img.shields.io/badge/Made%20with-❤️-red) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-3-teal)

## ✨ Features

- **📝 Custom Topics**: Enter any topic for your story (brave cats, magical forests, funny robots...)
- **📏 Word Length Control**: Slider to set maximum letters per word (3-8 letters)
- **🎨 Kid-Friendly UI**: Colorful, playful design with dyslexia-friendly fonts
- **🔊 Read Aloud**: Built-in text-to-speech for story narration
- **🖨️ Print Stories**: Export and print stories for offline reading
- **📚 Story History**: Automatically saves recent stories to localStorage
- **✨ Word Highlighting**: Hover over words for interactive reading practice
- **📱 Mobile Responsive**: Works great on tablets and phones

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tiny-tales.git
cd tiny-tales
```

2. Install dependencies (use your preferred package manager):
```bash
npm install
# or: yarn install
# or: pnpm install
```

3. Create a `.env.local` file in the root directory with your API keys:
```env
# For AI story generation (pick one or both):
GEMINI_API_KEY=your_google_gemini_api_key_here
POLLINATIONS_API_KEY=your_pollinations_api_key_here

# Optional: Convex backend (if using story persistence)
# VITE_CONVEX_URL=your_convex_deployment_url
```

4. Start the development servers:
```bash
# Option 1: Run both frontend and API server together (recommended)
npm run dev:all
# or: yarn dev:all / pnpm dev:all

# Option 2: Run them separately in different terminals
npm run dev:api    # API server on http://localhost:3001
npm run dev        # Frontend on http://localhost:5173
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

### Local Development Notes

- The API server runs on port 3001 by default (configurable via `API_PORT` env variable)
- Vite automatically proxies `/api/*` requests to the local API server
- Make sure both servers are running when testing API calls locally

## 🌐 Deployment

The project is configured for deployment on **Vercel** (see `vercel.json`). To deploy:

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard:
   - `GEMINI_API_KEY`: Your Google Gemini API key (required)
   - `POLLINATIONS_API_KEY`: Optional, for Pollinations API
4. Deploy — Vercel will automatically build and deploy

You can deploy to other platforms as well; the app is a standard Vite + React build with an API directory for serverless functions.

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom animations
- **AI**: Pollinations API to use AI models for both text and image generation
- **Icons**: Lucide React
- **Production deployment**: Vercel (pnpm, serverless functions)

## 📁 Project Structure

```
tiny-tales/
├── api/
│   └── generate.ts      # Vercel serverless function for Gemini API
├── public/
│   └── favicon.svg      # App favicon
├── src/
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # React entry point
│   └── index.css        # Tailwind & custom styles
├── server.ts            # Local development API server
├── index.html           # HTML template
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json          # Vercel configuration
└── vite.config.ts       # Vite config with API proxy
```

## 🎯 How It Works

1. **Enter a Topic**: Type what you want the story to be about
2. **Set Word Length**: Use the slider to limit maximum letters per word
3. **Generate**: Click the magic button to create your story
4. **Read & Learn**: Hover over words, read aloud, or print the story

## 🔒 Security

- API keys are stored securely as environment variables (never committed)
- All AI API calls go through the backend/serverless layer — no keys are exposed to the client

## 📜 License

MIT License - feel free to use this for educational purposes!

## 🙏 Acknowledgments

- Google Gemini for the AI magic
- Lexend font for improved readability
- All the little readers who inspire us to create

---

Made with ❤️ for little readers everywhere
