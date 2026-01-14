import type { RefObject } from "react";

import type { ExportItem } from "../types/story";

type ExportPrintContainerProps = {
  topic: string;
  exportItems: ExportItem[];
  printContainerRef: RefObject<HTMLDivElement>;
};

export default function ExportPrintContainer({
  topic,
  exportItems,
  printContainerRef,
}: ExportPrintContainerProps) {
  return (
    <div
      ref={printContainerRef}
      data-print-container
      className="absolute -left-[9999px] top-0"
      style={{ display: "none" }}
    >
      <div className="w-[600px] bg-gradient-to-b from-amber-50 to-pink-50 font-lexend p-6">
        {/* Decorative top border */}
        <div className="h-1.5 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 rounded-full mb-4" />

        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">📖</span>
            <h1 className="text-3xl font-bold font-comic text-purple-600">
              Tiny Tales
            </h1>
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-gray-500 text-sm">
            A story about: <strong className="text-pink-500">{topic}</strong>
          </p>
        </div>

        {/* Images Grid - uses captured data URLs from already-loaded images */}
        {exportItems.length > 0 && (
          <div
            className={`grid gap-3 mb-4 items-start ${
              exportItems.length === 1 ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {exportItems.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border-2 border-yellow-300 bg-white overflow-hidden"
              >
                <div className="aspect-square bg-amber-50">
                  {item.dataUrl ? (
                    <img
                      src={item.dataUrl}
                      alt={`Story illustration ${index + 1}`}
                      className="w-full h-full object-contain block bg-white"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-amber-600">
                      Image unavailable
                    </div>
                  )}
                </div>
                <div className="border-t-2 border-yellow-300 px-3 py-4 text-center bg-white">
                  <p className="text-sm leading-snug text-gray-700">
                    {item.segment}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-xs text-gray-400">Made with Tiny Tales ✨</p>
        </div>
      </div>
    </div>
  );
}
