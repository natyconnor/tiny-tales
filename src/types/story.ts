export interface Story {
  id: string;
  topic: string;
  title?: string;
  maxLetters: number;
  model?: string;
  imageModel?: string;
  imageSafetyBlocked?: boolean;
  imageSafetyReason?: string;
  content: string;
  imageUrls: string[];
  createdAt: number;
}

export interface ExportItem {
  dataUrl?: string;
  segment: string;
}
