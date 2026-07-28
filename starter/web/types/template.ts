export interface Template {
  id: string;
  title: string;
  platforms: string[];
  formats: string[];
  category: string;
  objective: string;
  thumbnail_url: string;
  canva_url?: string;
  aspect_ratio?: "4:5";
  editable_slots: string[];
  description: string | null;
}
