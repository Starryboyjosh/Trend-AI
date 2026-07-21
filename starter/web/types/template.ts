export interface Template {
  id: string;
  title: string;
  platforms: string[];
  formats: string[];
  category: string;
  objective: string;
  thumbnail_url: string;
  editable_slots: string[];
  description: string | null;
}
