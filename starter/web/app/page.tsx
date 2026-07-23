import Link from "next/link";
import Image from "next/image";

import { HeroComposer } from "@/components/landing/hero-composer";
import { PublicHeader } from "@/components/layout/public-header";
import { Logo } from "@/components/brand/logo";
import { loginPath, routes } from "@/lib/routes";

const heroImages = [
  { src: "/templates/flores.png", alt: "Plantilla de promoción floral", label: "Nuevos sabores" },
  { src: "/templates/summer.png", alt: "Plantilla de campaña de verano", label: "Campaña de verano" },
  { src: "/templates/coffee.png", alt: "Plantilla para cafetería", label: "Contenido para café" },
  { src: "/templates/amor.png", alt: "Plantilla de promoción especial", label: "Promoción especial" },
];

const templateRail = [
  { src: "/templates/flores.png", title: "Promoción floral" },
  { src: "/templates/summer.png", title: "Final de verano" },
  { src: "/templates/coffee.png", title: "Coffee launch" },
  { src: "/templates/comida.png", title: "Oferta del día" },
  { src: "/templates/amor.png", title: "Historia de marca" },
];

export default function HomePage() {
  return (
    <main className="marketing-page">
      <PublicHeader />

      <section id="crear" className="marketing-hero" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-floating-templates" aria-hidden="true">
          {heroImages.map((image, index) => (
            <figure key={image.src} className={`hero-float hero-float--${index + 1}`}>
              <Image src={image.src} alt="" width={154} height={206} priority={index < 2} />
              <figcaption>{image.label}</figcaption>
            </figure>
          ))}
        </div>
        <div className="marketing-hero-copy">
          <p className="hero-eyebrow"><span /> Tu estudio creativo con inteligencia artificial</p>
          <h1 id="hero-title">Comienza a <em>crear</em></h1>
          <p>Transforma una idea sencilla en publicaciones, campañas y contenido listo para tus redes, sin perder la identidad de tu negocio.</p>
          <HeroComposer />
        </div>
      </section>

      <div className="marketing-wave" aria-hidden="true" />

      <section id="plantillas" className="marketing-marquee-section" aria-labelledby="marquee-title">
        <div className="marketing-section-heading">
          <div>
            <p className="eyebrow">EMPIEZA CON UNA IDEA</p>
            <h2 id="marquee-title">Una colección que se mueve al ritmo de tu marca.</h2>
          </div>
          <p>Explora formatos para promociones, lanzamientos, historias y campañas. Selecciona uno y continúa personalizándolo dentro del Studio.</p>
        </div>
        <div className="template-marquee" aria-label="Vista previa de plantillas">
          <div className="template-marquee-track">
            {templateRail.map((template) => (
              <Link className="landing-template-tile" href={routes.templates} key={template.src}>
                <Image src={template.src} alt={`Plantilla ${template.title}`} width={240} height={320} />
                <span>{template.title} <b aria-hidden="true">›</b></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="nosotros" className="about-section" aria-labelledby="about-title">
        <div className="about-collage">
          <Image src="/templates/about-collage.png" alt="Collage de publicaciones creadas para pequeños negocios" fill sizes="(max-width: 639px) 100vw, 45vw" />
          <span className="about-note about-note--top">Contenido actual, sin complicaciones →</span>
          <span className="about-note about-note--bottom">Tu idea + HiTrendy = una campaña lista</span>
        </div>
        <div className="about-copy">
          <p className="eyebrow">LA HISTORIA DETRÁS DE LA PLATAFORMA</p>
          <h2 id="about-title">¿Quiénes <em>somos?</em></h2>
          <p>HiTrendy es una plataforma diseñada para ayudar a pequeños negocios, emprendedores y creadores a transformar sus ideas en contenido visual atractivo, profesional y alineado con las tendencias actuales usando inteligencia artificial.</p>
          <p>Buscamos simplificar la creación de contenido para que cualquier persona, sin importar su experiencia en diseño o marketing, pueda comunicar el valor de su negocio de manera efectiva.</p>
          <div className="about-points">
            <span><b>01</b><small>Ideas que conservan tu identidad.</small></span>
            <span><b>02</b><small>Contenido listo para publicar.</small></span>
          </div>
          <Link className="button-primary" href={loginPath(routes.studioNew)}>Crear mi primer proyecto <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className="marketing-footer">
        <Logo inverse />
        <span>Plataforma web de asistencia publicitaria con inteligencia artificial.</span>
        <Link className="button-secondary" href={routes.login}>Entrar al Studio</Link>
      </footer>
    </main>
  );
}
