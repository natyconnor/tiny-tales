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
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border-4 border-yellow-300 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-yellow-200 bg-gradient-to-r from-pink-50 to-purple-50">
          <h3 className="text-xl font-bold text-gray-700 font-comic flex items-center gap-2">
            <span>🖼️</span> Export Preview
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preview Image */}
        <div className="p-4 overflow-auto max-h-[calc(90vh-160px)] bg-gradient-to-b from-amber-50/50 to-pink-50/50 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <img
            src={previewUrl}
            alt="Export preview"
            className="w-full rounded-2xl border-2 border-yellow-200 shadow-lg"
          />
        </div>

        {/* Footer with Download Button */}
        <div className="p-4 border-t-2 border-yellow-200 bg-gradient-to-r from-cyan-50 to-green-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-lexend font-medium transition-colors"
          >
            Close
          </button>
          <a
            href={previewUrl}
            download={fileName}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-green-400 hover:from-cyan-500 hover:to-green-500 text-white rounded-xl font-lexend font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </a>
        </div>
      </div>
    </div>
  );
}
