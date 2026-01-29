import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Copy, Check, Link } from "lucide-react";

type ShareModalProps = {
  shareUrl: string;
  onClose: () => void;
};

export default function ShareModal({ shareUrl, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border-4 border-purple-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-purple-200 bg-gradient-to-r from-pink-50 to-purple-50">
            <h3 className="text-xl font-bold text-gray-700 font-comic flex items-center gap-2">
              <Link className="w-5 h-5 text-purple-500" />
              Share Your Story
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="p-6 bg-gradient-to-b from-pink-50/50 to-purple-50/50">
            <p className="text-gray-600 font-lexend mb-4 text-center">
              Share this link with friends and family to let them read your
              story!
            </p>

            {/* URL Input with Copy Button */}
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-4 py-3 bg-white border-2 border-purple-200 rounded-xl font-mono text-sm text-gray-700 focus:outline-none focus:border-purple-400"
                onClick={(e) => e.currentTarget.select()}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className={`px-4 py-3 rounded-xl font-lexend font-bold transition-all flex items-center gap-2 ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t-2 border-purple-200 bg-gradient-to-r from-pink-50 to-fuchsia-50 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-lexend font-medium transition-colors"
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
