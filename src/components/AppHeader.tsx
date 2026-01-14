import { BookOpen, Sparkles } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <BookOpen className="w-12 h-12 text-pink-500 animate-wiggle" />
        <h1 className="text-4xl md:text-6xl font-bold font-comic rainbow-text">
          Tiny Tales
        </h1>
        <Sparkles className="w-12 h-12 text-yellow-500 animate-sparkle" />
      </div>
      <p className="text-lg md:text-xl text-gray-600 font-lexend">
        ✨ Magical stories for little readers! ✨
      </p>
    </header>
  );
}
