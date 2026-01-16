type BookletPrintContainerProps = {
  bookletPreviewUrl: string | null;
};

export default function BookletPrintContainer({
  bookletPreviewUrl,
}: BookletPrintContainerProps) {
  return (
    <div
      data-booklet-print
      className="absolute -left-[9999px] top-0"
      aria-hidden="true"
    >
      {bookletPreviewUrl && (
        <img
          src={bookletPreviewUrl}
          alt="Mini-book print sheet"
          className="booklet-print-image"
        />
      )}
    </div>
  );
}
