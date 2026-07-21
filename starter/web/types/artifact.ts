export type Platform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "whatsapp"
  | "youtube"
  | "x"
  | "linkedin";

export interface GeneratedSocialPost {
  artifact_type: "social_post";
  platform: Platform;
  hook: string;
  caption: string;
  call_to_action: string;
  hashtags: string[];
  visual_direction: string;
  format_recommendation:
    "static_post" | "carousel" | "story" | "reel" | "short_video" | "text_post";
  assumptions: string[];
}
