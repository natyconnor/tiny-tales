import { motion, AnimatePresence } from "motion/react";
import { X, Download } from "lucide-react";

type ExportPreviewModalProps = {
  previewUrl: string;
  fileName: string;
  onClose: () => void;
};

export default function ExportPreviewModal({
  previewUrl,
  fileName,
  onClose,
}: ExportPreviewModalProps) {
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
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-4 border-purple-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-purple-200 bg-gradient-to-r from-pink-50 to-purple-50">
            <h3 className="text-xl font-bold text-gray-700 font-comic flex items-center gap-2">
              <span>🖼️</span> Export Preview
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

          {/* Preview Image */}
          <div className="p-4 overflow-auto max-h-[calc(90vh-160px)] bg-gradient-to-b from-pink-50/50 to-purple-50/50 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <img
              src={previewUrl}
              alt="Export preview"
              className="w-full rounded-2xl border-2 border-purple-200 shadow-lg"
            />
          </div>

          {/* Footer with Download Button */}
          <div className="p-4 border-t-2 border-purple-200 bg-gradient-to-r from-pink-50 to-fuchsia-50 flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-lexend font-medium transition-colors"
            >
              Close
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href={previewUrl}
              download={fileName}
              className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 text-white rounded-xl font-lexend font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Download className="w-4 h-4" />
              Download PNG
            </motion.a>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
