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

### Prerequisites

- Node.js 18+
- npm or yarn
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tiny-tales.git
cd tiny-tales
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🌐 Deployment to Vercel

1. Push your code to GitHub

2. Import the project in [Vercel](https://vercel.com)

3. Add the environment variable:
   - `GEMINI_API_KEY`: Your Google Gemini API key

4. Deploy! Vercel will automatically build and deploy your app

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom animations
- **AI**: Google Gemini 1.5 Flash API
- **Icons**: Lucide React
- **Hosting**: Vercel (with Edge Functions)

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
├── index.html           # HTML template
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json          # Vercel configuration
└── vite.config.ts
```

## 🎯 How It Works

1. **Enter a Topic**: Type what you want the story to be about
2. **Set Word Length**: Use the slider to limit maximum letters per word
3. **Generate**: Click the magic button to create your story
4. **Read & Learn**: Hover over words, read aloud, or print the story

## 🔒 Security

- API keys are stored securely as environment variables
- All API calls go through Vercel Edge Functions
- No sensitive data is exposed to the client

## 📜 License

MIT License - feel free to use this for educational purposes!

## 🙏 Acknowledgments

- Google Gemini for the AI magic
- Lexend font for improved readability
- All the little readers who inspire us to create

---

Made with ❤️ for little readers everywhere
