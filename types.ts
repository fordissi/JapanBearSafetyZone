export interface BearHotspot {
  id: string;
  lat: number;
  lng: number;
  title: string;
  desc: string;
  count: number;
  source: string;
  date: string; // YYYY-MM-DD
}

export interface QuizQuestion {
  id: number;
  scenario: string;
  // Multiple images for random selection to keep it fresh but fast
  scenarioImages: string[]; 
  // Images to show based on result
  successImages: string[];
  failureImages: string[];
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
  explanation: string;
}

export enum AlertLevel {
  NONE = 'NONE',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
}

export interface UserLocation {
  lat: number;
  lng: number;
}