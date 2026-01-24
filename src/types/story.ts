export interface Story {
  id: string;
  topic: string;
  title?: string;
  maxLetters: number;
  content: string;
  imageUrls: string[];
  createdAt: number;
}

export interface ExportItem {
  dataUrl?: string;
  segment: string;
}
