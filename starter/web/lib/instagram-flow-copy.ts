const objectiveLabels = {
  engagement: ["Interacción", "Engagement", "Engajamento"],
  sales: ["Ventas", "Sales", "Vendas"],
  reach: ["Alcance", "Reach", "Alcance"],
  store_visits: ["Visitas al negocio", "Store visits", "Visitas ao negócio"],
  launch: ["Lanzamiento", "Launch", "Lançamento"],
  brand_awareness: ["Reconocimiento de marca", "Brand awareness", "Reconhecimento da marca"],
  community: ["Comunidad", "Community", "Comunidade"],
} as const;

const qualityLabels = {
  fast: ["Rápido", "Fast", "Rápido"],
  balanced: ["Equilibrado", "Balanced", "Equilibrado"],
  quality: ["Calidad", "Quality", "Qualidade"],
} as const;

function copyAt(index: 0 | 1 | 2) {
  return {
    objectiveLabels: Object.fromEntries(
      Object.entries(objectiveLabels).map(([key, value]) => [key, value[index]])
    ) as Record<keyof typeof objectiveLabels, string>,
    qualityLabels: Object.fromEntries(
      Object.entries(qualityLabels).map(([key, value]) => [key, value[index]])
    ) as Record<keyof typeof qualityLabels, string>,
  };
}

export const instagramFlowCopy = {
  es: {
    title: "Crea tu post de Instagram", subtitle: "Elige una plantilla 4:5, confirma tu idea y obtén un borrador editable.", loading: "Cargando tu contexto creativo…", noBusiness: "Completa primero la información de tu negocio y marca.", template: "1. Elige una plantilla de Instagram 4:5", context: "Tu contexto de negocio y marca", theme: "2. Objetivo o tema", objective: "Objetivo", quality: "3. Nivel de calidad", generate: "Generar post", generating: "Generando tu recomendación y post…", result: "Post generado", caption: "Texto del post", cta: "Llamada a la acción", hashtags: "Hashtags", visualBrief: "Visual brief 4:5", visualNote: "Esta es una guía para Canva o diseño; no es una imagen generada.", save: "Guardar post", saving: "Guardando…", restore: "Restaurar generado", unsaved: "Tienes cambios sin guardar.", duplicate: "Duplicar proyecto", duplicating: "Duplicando…", variation: "Crear variación", variationNotice: "La variación se creó como una nueva versión del post original.", openCanva: "Abrir plantilla en Canva", saved: "Post guardado. Puedes abrirlo de nuevo desde Proyectos.", format: "Instagram · 4:5", locale: "Idioma del contenido", invalidResponse: "No recibimos un post de Instagram válido.", generationError: "No pudimos generar el post. Puedes reintentar sin perder tu tema.", saveError: "No pudimos guardar. Tus cambios siguen disponibles aquí.", duplicateError: "No pudimos duplicar el proyecto.", variationError: "No pudimos crear la variación.", validationCaption: "Escribe un caption de hasta 2.200 caracteres.", validationVisual: "Escribe un visual brief de hasta 700 caracteres.", validationCta: "Escribe una llamada a la acción de hasta 240 caracteres.", validationHashtags: "Usa entre uno y cinco hashtags no vacíos, de hasta 100 caracteres cada uno.",
    ...copyAt(0),
  },
  en: {
    title: "Create your Instagram post", subtitle: "Choose a 4:5 template, confirm your idea, and get an editable draft.", loading: "Loading your creative context…", noBusiness: "Complete your business and brand information first.", template: "1. Choose an Instagram 4:5 template", context: "Your business and brand context", theme: "2. Goal or topic", objective: "Goal", quality: "3. Quality level", generate: "Generate post", generating: "Generating your recommendation and post…", result: "Generated post", caption: "Post caption", cta: "Call to action", hashtags: "Hashtags", visualBrief: "4:5 visual brief", visualNote: "This is guidance for Canva or a designer; it is not a generated image.", save: "Save post", saving: "Saving…", restore: "Restore generated", unsaved: "You have unsaved changes.", duplicate: "Duplicate project", duplicating: "Duplicating…", variation: "Create variation", variationNotice: "The variation was created as a new version of the original post.", openCanva: "Open template in Canva", saved: "Post saved. You can reopen it from Projects.", format: "Instagram · 4:5", locale: "Content language", invalidResponse: "We did not receive a valid Instagram post.", generationError: "We could not generate the post. You can retry without losing your topic.", saveError: "We could not save the post. Your changes are still available here.", duplicateError: "We could not duplicate the project.", variationError: "We could not create the variation.", validationCaption: "Enter a caption of up to 2,200 characters.", validationVisual: "Enter a visual brief of up to 700 characters.", validationCta: "Enter a call to action of up to 240 characters.", validationHashtags: "Use one to five non-empty hashtags, up to 100 characters each.",
    ...copyAt(1),
  },
  pt: {
    title: "Crie seu post do Instagram", subtitle: "Escolha um template 4:5, confirme sua ideia e receba um rascunho editável.", loading: "Carregando seu contexto criativo…", noBusiness: "Complete primeiro as informações do seu negócio e da sua marca.", template: "1. Escolha um template Instagram 4:5", context: "Seu contexto de negócio e marca", theme: "2. Objetivo ou tema", objective: "Objetivo", quality: "3. Nível de qualidade", generate: "Gerar post", generating: "Gerando sua recomendação e post…", result: "Post gerado", caption: "Legenda do post", cta: "Chamada para ação", hashtags: "Hashtags", visualBrief: "Brief visual 4:5", visualNote: "Esta é uma orientação para Canva ou design; não é uma imagem gerada.", save: "Salvar post", saving: "Salvando…", restore: "Restaurar gerado", unsaved: "Você tem alterações não salvas.", duplicate: "Duplicar projeto", duplicating: "Duplicando…", variation: "Criar variação", variationNotice: "A variação foi criada como uma nova versão do post original.", openCanva: "Abrir template no Canva", saved: "Post salvo. Você pode reabri-lo em Projetos.", format: "Instagram · 4:5", locale: "Idioma do conteúdo", invalidResponse: "Não recebemos um post válido do Instagram.", generationError: "Não foi possível gerar o post. Você pode tentar novamente sem perder seu tema.", saveError: "Não foi possível salvar. Suas alterações continuam disponíveis aqui.", duplicateError: "Não foi possível duplicar o projeto.", variationError: "Não foi possível criar a variação.", validationCaption: "Escreva uma legenda de até 2.200 caracteres.", validationVisual: "Escreva um brief visual de até 700 caracteres.", validationCta: "Escreva uma chamada para ação de até 240 caracteres.", validationHashtags: "Use de uma a cinco hashtags não vazias, com até 100 caracteres cada.",
    ...copyAt(2),
  },
} as const;

export type InstagramFlowLocale = keyof typeof instagramFlowCopy;
