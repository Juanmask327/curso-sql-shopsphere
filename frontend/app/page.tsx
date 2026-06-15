/**
 * Landing Page — ShopSphere SQL Course
 *
 * Estructura:
 * 1. Hero: título, descripción, CTA primario → /registro
 * 2. Social proof: stats del curso
 * 3. Features: 4 propuestas de valor con íconos
 * 4. CTA final: call-to-action para registro
 *
 * Server Component (sin 'use client') para máximo SEO.
 * Interacciones básicas se manejan con CSS :hover puro.
 */

import Link from 'next/link';
import {
  ArrowRight,
  Database,
  BarChart3,
  Users,
  Award,
  CheckCircle2,
  Zap,
  BookOpen,
  Terminal,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Features data
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Terminal,
    title: 'Playground interactivo',
    description:
      'Editor SQL completo con sintaxis resaltada, ejecución en tiempo real y feedback instantáneo sobre cada query.',
    color: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    icon: Database,
    title: 'Dataset real de e-commerce',
    description:
      'Practica con datos de ShopSphere: 31k+ pedidos, clientes, productos e inventario de una empresa latinoamericana real.',
    color: 'bg-primary-50 text-primary-600 border-primary-100',
  },
  {
    icon: Users,
    title: 'Personajes con contexto',
    description:
      'Cada ejercicio viene de un personaje del equipo ShopSphere. Valentina de Analytics, Marco del CEO — aprende SQL con contexto de negocio.',
    color: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    icon: Award,
    title: 'Certificados verificables',
    description:
      'Al completar cada nivel obtienes un certificado con URL pública única. Compártelo en LinkedIn sin que el verificador necesite cuenta.',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
] as const;

const STATS = [
  { value: '226', label: 'ejercicios', icon: BookOpen },
  { value: '10', label: 'niveles progresivos', icon: BarChart3 },
  { value: '0', label: 'instalaciones necesarias', icon: CheckCircle2 },
  { value: '100%', label: 'práctico', icon: Zap },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shadow-primary shrink-0">
            <span className="text-white font-black text-sm select-none">S</span>
          </div>
          <span className="font-bold text-neutral-900 text-base leading-none">
            ShopSphere <span className="text-primary-500">SQL</span>
          </span>
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-2 rounded-lg hover:bg-neutral-100"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-semibold shadow-sm hover:bg-primary-600 transition-all duration-150 active:scale-[0.98]"
          >
            Comenzar gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="flex-1 flex items-center py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-7">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold">
          <Database className="w-3.5 h-3.5" aria-hidden="true" />
          Dataset real · 31k+ pedidos · 9 tablas
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-900 tracking-tight leading-[1.08]">
          Aprende SQL resolviendo{' '}
          <span className="text-primary-500">problemas reales</span>
          {' '}de negocio
        </h1>

        {/* Subheadline */}
        <p className="max-w-2xl mx-auto text-neutral-500 text-lg sm:text-xl leading-relaxed">
          Practica con datos de ShopSphere, una empresa de e-commerce latinoamericana.
          Desde{' '}
          <span className="font-semibold text-neutral-700">SELECT básico</span>
          {' '}hasta{' '}
          <span className="font-semibold text-neutral-700">Window Functions y BI</span>.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/registro"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary-500 text-white font-bold text-base shadow-primary hover:bg-primary-600 transition-all duration-200 active:scale-[0.98]"
          >
            Empezar gratis
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-neutral-700 font-semibold text-base border border-neutral-300 hover:bg-neutral-50 transition-all duration-200 active:scale-[0.98]"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Section
// ─────────────────────────────────────────────────────────────────────────────

function StatsSection() {
  return (
    <section className="bg-white border-y border-neutral-200 py-10 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <Icon className="w-4 h-4 text-primary-400" aria-hidden="true" />
                  <span className="text-3xl font-black text-neutral-900">
                    {stat.value}
                  </span>
                </div>
                <p className="text-sm text-neutral-500">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Features Section
// ─────────────────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
            Por qué ShopSphere SQL es diferente
          </h2>
          <p className="mt-3 text-neutral-500 text-lg max-w-xl mx-auto">
            No más ejercicios de academia sin contexto. Cada query resuelve un
            problema real de negocio.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs hover:shadow-md hover:border-primary-200 transition-all duration-200"
              >
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 ${feature.color}`}
                  aria-hidden="true"
                >
                  <Icon className="w-5 h-5" />
                </div>

                <h3 className="text-lg font-bold text-neutral-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample Query Section
// ─────────────────────────────────────────────────────────────────────────────

function SampleQuerySection() {
  const query = `-- ¿Quiénes son los 10 mejores clientes por revenue?
SELECT
  c.first_name || ' ' || c.last_name AS customer_name,
  c.country,
  SUM(oi.unit_price * oi.quantity)   AS total_revenue
FROM customers c
JOIN orders o  ON o.customer_id  = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
WHERE o.status = 'delivered'
GROUP BY c.customer_id, customer_name, c.country
ORDER BY total_revenue DESC
LIMIT 10;`;

  return (
    <section className="bg-white border-y border-neutral-200 py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: text */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              Dataset real · 31k+ pedidos
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight leading-tight">
              Queries con contexto de negocio real
            </h2>
            <p className="text-neutral-500 text-lg leading-relaxed">
              Valentina (Head of Analytics) necesita los top 10 clientes antes
              de la reunión con el CEO. Tu misión: escribir la query correcta.
            </p>
            <ul className="space-y-2">
              {[
                'Feedback inmediato con mensaje específico por error',
                'Sistema de pistas con costo en XP para no trivializar',
                'Validación server-side contra el resultado esperado',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-neutral-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: code block */}
          <div className="relative">
            <div className="rounded-xl overflow-hidden shadow-lg border border-neutral-800">
              {/* Editor header */}
              <div className="bg-[#1e1e2e] px-4 py-3 flex items-center gap-2 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-rose-500" aria-hidden="true" />
                <div className="w-3 h-3 rounded-full bg-amber-400" aria-hidden="true" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" aria-hidden="true" />
                <span className="ml-2 text-xs text-neutral-400 font-mono">
                  ejercicio_01.sql
                </span>
              </div>

              {/* Code */}
              <pre
                className="bg-[#1e1e2e] px-5 py-5 text-sm font-mono leading-relaxed overflow-x-auto"
                aria-label="Ejemplo de query SQL"
              >
                {query.split('\n').map((line, i) => {
                  // Basic syntax highlighting via spans
                  const keywords = /\b(SELECT|FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY|LIMIT|AS|AND|SUM|DESC)\b/g;
                  const comments = /^(--.*)/;
                  const strings = /('[^']*')/g;

                  if (comments.test(line.trim())) {
                    return (
                      <div key={i}>
                        <span className="text-[#6c7086]">{line}</span>
                        {'\n'}
                      </div>
                    );
                  }

                  return (
                    <div key={i}>
                      <span
                        className="text-[#cdd6f4]"
                        dangerouslySetInnerHTML={{
                          __html: line
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(
                              keywords,
                              '<span style="color:#cba6f7;font-weight:600">$&</span>',
                            )
                            .replace(strings, '<span style="color:#a6e3a1">$&</span>'),
                        }}
                      />
                      {'\n'}
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Floating result hint */}
            <div className="absolute -bottom-3 -right-3 bg-white border border-emerald-200 rounded-xl shadow-md px-3.5 py-2.5 text-xs text-emerald-700 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              10 filas · +45 XP
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA Final
// ─────────────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div
          className="rounded-2xl p-10 sm:p-14"
          style={{
            background: 'linear-gradient(135deg, rgb(249 115 22 / 0.06) 0%, rgb(124 58 237 / 0.06) 100%)',
            border: '1px solid rgb(249 115 22 / 0.15)',
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-6 shadow-primary">
            <span className="text-white font-black text-2xl select-none">S</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
            Empieza hoy, gratis.
          </h2>
          <p className="mt-4 text-neutral-500 text-lg max-w-md mx-auto">
            Sin tarjeta de crédito. Sin instalaciones. Tu primer ejercicio en
            menos de 2 minutos.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-primary-500 text-white font-bold text-base shadow-primary hover:bg-primary-600 transition-all duration-200 active:scale-[0.98]"
            >
              Crear cuenta gratis
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white text-neutral-700 font-semibold text-base border border-neutral-300 hover:bg-neutral-50 transition-all duration-200 active:scale-[0.98]"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
        <span>ShopSphere SQL Course — MVP v0.1 · Datos de demostración</span>
        <div className="flex items-center gap-4">
          <Link href="/certificados/verify/demo" className="hover:text-neutral-600 transition-colors">
            Verificar certificado
          </Link>
          <Link href="/diagnostic" className="hover:text-neutral-600 transition-colors">
            Diagnóstico
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(253, 252, 250)' }}>
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <SampleQuerySection />
      <CTASection />
      <Footer />
    </div>
  );
}
