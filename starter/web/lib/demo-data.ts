import type {
  GeneratedShortVideoScript,
  GeneratedSocialPost,
} from "@/types/artifact";
import type { Template } from "@/types/template";

type DemoConversation = {
  id: string;
  title: string;
  status: "active" | "archived";
  last_message: string;
  updated_at: string;
};

type DemoProject = {
  id: string;
  name: string;
  platform: string;
  status: "active" | "archived";
  updated_at: string;
  artifact_snapshot: { hook: string };
};

const demoUser = {
  user: { id: "demo-user", name: "Ana Demo", email: "demo@hitrendy.local" },
  workspaces: [{ id: "demo-workspace", role: "owner" }],
};

const demoProjects: DemoProject[] = [
  {
    id: "project-demo-1",
    name: "Lanzamiento de desayuno",
    platform: "Instagram",
    status: "active",
    updated_at: new Date().toISOString(),
    artifact_snapshot: { hook: "Nueva carta de desayunos para llevar" },
  },
  {
    id: "project-demo-2",
    name: "Promo fin de semana",
    platform: "Facebook",
    status: "archived",
    updated_at: new Date().toISOString(),
    artifact_snapshot: { hook: "Una promo clara para traer más visitas" },
  },
];

const demoConversations: DemoConversation[] = [
  {
    id: "conversation-demo-1",
    title: "Nueva creación",
    status: "active",
    last_message: "Necesito un post para anunciar una oferta.",
    updated_at: new Date().toISOString(),
  },
];

const demoTemplates: Template[] = [
  {
    id: "template-demo-1",
    title: "Promoción floral",
    platforms: ["instagram", "facebook"],
    formats: ["static_post"],
    category: "Posts",
    objective: "sales",
    thumbnail_url: "/templates/flores.png",
    editable_slots: ["titular", "precio", "llamada_a_la_accion"],
    description: "Una promoción de producto con espacio para una oferta clara.",
  },
  {
    id: "template-demo-2",
    title: "Reel de lanzamiento",
    platforms: ["instagram", "tiktok"],
    formats: ["reel"],
    category: "Reels",
    objective: "launch",
    thumbnail_url: "/templates/video-mar.png",
    editable_slots: ["hook", "escenas", "llamada_a_la_accion"],
    description: "Un inicio visual para presentar una novedad.",
  },
  {
    id: "template-demo-3",
    title: "Menú del día",
    platforms: ["instagram", "whatsapp"],
    formats: ["story"],
    category: "Stories",
    objective: "store_visits",
    thumbnail_url: "/templates/comida.png",
    editable_slots: ["producto", "precio", "horario"],
    description: "Una historia clara para impulsar visitas hoy.",
  },
  {
    id: "template-demo-4",
    title: "Oferta de temporada",
    platforms: ["instagram", "facebook"],
    formats: ["static_post"],
    category: "Anuncios",
    objective: "sales",
    thumbnail_url: "/templates/amor.png",
    editable_slots: ["oferta", "fecha", "llamada_a_la_accion"],
    description: "Un anuncio cálido y editable para una fecha especial.",
  },
  {
    id: "template-demo-5",
    title: "Final de verano",
    platforms: ["instagram"],
    formats: ["story"],
    category: "Stories",
    objective: "engagement",
    thumbnail_url: "/templates/summer.png",
    editable_slots: ["mensaje", "descuento", "llamada_a_la_accion"],
    description: "Una historia de temporada para mantener el ritmo.",
  },
  {
    id: "template-demo-6",
    title: "Historia de marca",
    platforms: ["instagram", "facebook"],
    formats: ["static_post"],
    category: "Posts",
    objective: "brand_awareness",
    thumbnail_url: "/templates/coffee.png",
    editable_slots: ["producto", "historia", "llamada_a_la_accion"],
    description:
      "Una pieza editorial para contar qué hace especial a tu negocio.",
  },
  {
    id: "template-demo-7",
    title: "Producto natural",
    platforms: ["instagram", "tiktok"],
    formats: ["reel"],
    category: "Reels",
    objective: "reach",
    thumbnail_url: "/templates/video-trigo.png",
    editable_slots: ["hook", "escenas", "cta"],
    description: "Un reel vertical pensado para descubrir un producto.",
  },
  {
    id: "template-demo-8",
    title: "Café destacado",
    platforms: ["instagram", "facebook"],
    formats: ["static_post"],
    category: "Anuncios",
    objective: "sales",
    thumbnail_url: "/templates/coffee.png",
    editable_slots: ["producto", "precio", "cta"],
    description: "Un anuncio de producto que conserva espacio para tu oferta.",
  },
];

const demoArtifact: GeneratedSocialPost = {
  artifact_type: "social_post",
  platform: "instagram",
  hook: "Desayuna mejor esta semana",
  caption:
    "Una propuesta fresca, rápida y lista para compartir con tu audiencia.",
  call_to_action: "Escríbenos y te preparamos el tuyo.",
  hashtags: ["#HiTrendy", "#Contenido", "#Instagram"],
  visual_direction: "Luz cálida, mesa cercana y composición limpia.",
  format_recommendation: "static_post",
  assumptions: ["El negocio quiere impulsar visitas esta semana."],
};

const demoVideoScript: GeneratedShortVideoScript = {
  artifact_type: "short_video_script",
  platform: "instagram",
  hook: "Un video corto para tu promo",
  duration_seconds: 15,
  scenes: [
    {
      order: 1,
      duration_seconds: 5,
      visual: "Plano del producto principal",
      on_screen_text: "Nuevo lanzamiento",
      voiceover: "Hoy te mostramos una opción pensada para convertir.",
    },
    {
      order: 2,
      duration_seconds: 5,
      visual: "Cliente disfrutando el resultado",
      on_screen_text: "Rápido y claro",
      voiceover: "Sin complicarte, con un mensaje directo.",
    },
    {
      order: 3,
      duration_seconds: 5,
      visual: "Cierre con marca y CTA",
      on_screen_text: "Pide el tuyo",
      voiceover: "Pide tu versión y te ayudamos a ajustarla.",
    },
  ],
  call_to_action: "Pide tu versión hoy.",
  caption: "Guion de ejemplo para revisar ritmo, enfoque y CTA.",
  assumptions: ["El negocio quiere una pieza breve para redes."],
};

export const demoData = {
  auth: demoUser,
  projects: demoProjects,
  conversations: demoConversations,
  templates: demoTemplates,
  businesses: [
    {
      id: "business-demo-1",
      name: "Café Central",
      description: "Café de especialidad para quienes trabajan y viven cerca.",
      primary_product: "Café de especialidad y desayunos",
      target_audience: "Personas que buscan una pausa cercana y de calidad.",
    },
  ],
  brandProfile: {
    voice_tones: ["friendly"],
    value_proposition:
      "Un café cercano que convierte una pausa en un buen momento.",
    preferred_words: ["cercano", "fresco", "hecho con cariño"],
    forbidden_words: ["barato", "urgente"],
    primary_color: "#541787",
    secondary_color: "#B79CFA",
  },
  artifacts: {
    demoArtifact,
    demoVideoScript,
  },
};

export function cloneDemo<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
