import { motion } from "motion/react";
import { BookOpen, Sparkles } from "lucide-react";

export default function AppHeader() {
  return (
    <header className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <motion.div
          initial={{ opacity: 0, rotate: -20, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <BookOpen className="w-12 h-12 text-pink-500" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-4xl md:text-6xl font-bold font-comic rainbow-text"
        >
          Tiny Tales
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, rotate: 20, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        >
          <Sparkles className="w-12 h-12 text-purple-500" />
        </motion.div>
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-lg md:text-xl text-gray-600 font-lexend"
      >
        ✨ Magical stories for little readers! ✨
      </motion.p>
    </header>
  );
}
