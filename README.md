# 🛒 ShopSphere — Aprende SQL trabajando como analista de datos

[![CI](https://github.com/Juanmask327/curso-sql-shopsphere/actions/workflows/ci.yml/badge.svg)](https://github.com/Juanmask327/curso-sql-shopsphere/actions/workflows/ci.yml)

> ¿Cuántas veces has querido aprender algo nuevo y te has perdido en el intento? En la era de la IA, la información sobra; lo difícil es saber en qué orden aprenderla. No es lo mismo aprender a correr antes de caminar.
>
> Por eso nació **ShopSphere**, una plataforma para aprender SQL orientado al análisis de datos. Un diagnóstico inicial identifica tu nivel y arrancas justo donde lo necesitas.
>
> ¿Qué la hace diferente? No solo estudias: **trabajas**. Entras como analista de datos de una empresa de e-commerce ficticia, resuelves sus problemas de negocio con consultas reales y cada respuesta se evalúa al instante. Al final, cierras con un proyecto integrador que termina en un dashboard ejecutivo para la dirección de la empresa.

---

## 🎯 Qué vas a poder responder con SQL

- ¿Por qué disminuyeron las ventas?
- ¿Qué clientes generan más ingresos?
- ¿Qué campañas de marketing producen mejores resultados?
- ¿Qué productos deberían salir del catálogo?
- ¿Cómo mejorar la retención de clientes?

---

## ✨ Cómo funciona

- **Diagnóstico de entrada:** 24 preguntas, algunas con consultas SQL reales, que recomiendan el nivel por donde empezar. Se puede repetir cuando quieras.
- **SQL Playground en el navegador:** editor Monaco y SQLite compilado a WebAssembly (sql.js). Las consultas corren en tu propio navegador, sin servidor y sin esperas.
- **Corrección automática:** cada respuesta se valida en el servidor contra resultados esperados precalculados, con tres modos de comparación (orden exacto, sin orden o solo estructura). Cada envío corre en una copia aislada del dataset que se descarta al terminar, así que también se practican vistas, `EXPLAIN` y transacciones sin riesgo.
- **Pistas progresivas:** tres por ejercicio (conceptual, sintáctica y "casi la solución") que se desbloquean con XP.
- **Gamificación:** XP, rangos (bronce, plata, oro y diamante), rachas diarias y certificados verificables por nivel.
- **Narrativa continua:** cada nivel tiene briefings, personajes y problemas de la empresa ficticia ShopSphere.

---

## 📚 Plan de estudios

**SQL para Análisis de Datos: De Principiante a Analista Profesional**
55–60 horas · 20% teoría · 60% práctica guiada · 20% retos abiertos

| Nivel | Tema | Lo que aprendes |
|---|---|---|
| 0 | Fundamentos | SELECT, FROM, WHERE, ORDER BY, LIMIT |
| 1 | Exploración | Filtros, texto, LIKE, IN, BETWEEN, NULL |
| 2 | Métricas | Agregaciones, GROUP BY, HAVING |
| 3 | JOINs | Relacionar varias tablas |
| 4 | Clientes | Comportamiento, devoluciones y segmentación |
| 5 | Avanzado | Subconsultas, CTEs e inventario |
| 6 | Analítica | Window functions, cohortes, LTV y campañas |
| 7 | BI | Vistas y datasets para Power BI y Tableau |
| 8 | Profesional | Optimización, transacciones y pagos |
| 🏁 | Capstone | Proyecto integrador en 5 partes con dashboard ejecutivo |

**9 niveles · 36 lecciones · 240 ejercicios con corrección automática**

Todas las lecciones siguen la misma estructura de 7 pasos: problema de negocio → concepto SQL → ejemplos guiados → práctica interactiva → reto abierto → interpretación de resultados → insights empresariales.

---

## 🗄️ El dataset

Una base de datos ficticia y realista de e-commerce en SQLite, con 10 tablas: `customers`, `products`, `categories`, `orders`, `order_items`, `returns`, `inventory`, `payments`, `website_sessions` y `marketing_campaigns` (más `categories_jerarquia` para las consultas recursivas). Las tablas se van desbloqueando a medida que avanzas de nivel.

---

## 🛠️ Stack

| Capa | Tecnologías |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, Monaco Editor, sql.js (WebAssembly) |
| Backend | Node.js 22, Fastify, Drizzle ORM, Zod, Worker Threads con better-sqlite3 |
| Datos | PostgreSQL 16 (plataforma), SQLite (dataset del curso), Redis 7 (caché y límite de peticiones) |
| Autenticación | JWT con rotación de refresh tokens, Google OAuth, verificación por correo |
| Observabilidad | Prometheus, Grafana, prom-client |
| Infraestructura | Docker Compose, GitHub Actions |

---

## 🏗️ Arquitectura

```
Navegador ──► carga el dataset SQLite una sola vez (CDN)
    │
    ├──► explora y ejecuta queries localmente con sql.js (WebAssembly)
    │
    └──► envía su respuesta ──► API Fastify
                                   ├── límite de peticiones (Redis)
                                   ├── pool de workers SQLite aislados ──► valida el resultado
                                   └── guarda progreso, XP y certificados (PostgreSQL)
```

Dos bases de datos separadas a propósito: **PostgreSQL** guarda la plataforma (usuarios, progreso y certificados) y **SQLite** guarda el dataset sobre el que practica el estudiante. Las consultas de cada estudiante corren aisladas: en su navegador mientras explora y en workers efímeros con tiempo límite cuando se valida.

---

## 🚀 Levantarlo en local

**Requisitos:** Docker Desktop, Git y Python 3. Node.js 22 solo si quieres desarrollar fuera de Docker.

```bash
git clone https://github.com/Juanmask327/curso-sql-shopsphere.git
cd curso-sql-shopsphere
```

**1. Generar el dataset**

```bash
python dataset/rebuild_dataset.py
```

**2. Configurar y levantar todo**

```powershell
# Windows (PowerShell)
.\scripts\setup.ps1
```

```bash
# Linux / macOS / WSL
bash scripts/setup.sh
```

El script crea el `.env` con secretos aleatorios, levanta los servicios y espera a que estén listos. Si lo prefieres manual: copia `.env.example` a `.env`, completa `POSTGRES_PASSWORD`, `JWT_SECRET` y `SESSION_COOKIE_SECRET`, y ejecuta `docker-compose up -d`.

**3. Cargar los ejercicios**

```bash
docker exec shopsphere-backend npm run seed:exercises
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/health |
| Adminer (base de datos) | http://localhost:8080 |

Guía detallada: [`docs/guia-setup.md`](docs/guia-setup.md) · Operación: [`docs/runbook.md`](docs/runbook.md) · Decisiones de arquitectura: [`arquitectura/decisiones.md`](arquitectura/decisiones.md)

---

## ✅ Calidad

- Pruebas unitarias e integración con Vitest (servicios reales de PostgreSQL y Redis en CI).
- GitHub Actions en cada push: lint y tipado estricto (backend y frontend), tests, `npm audit`, análisis estático con CodeQL y escaneo de las imágenes Docker con Trivy.
- Informes de QA por nivel en [`qa/`](qa/) y auditoría de seguridad en [`security/`](security/).
- Las 240 soluciones de referencia se validan contra el dataset con `dataset/validate_exercises.py`.

---

## 👤 Sobre el proyecto

ShopSphere se construyó con agentes de IA especializados (backend, frontend, contenido pedagógico, análisis de datos, DevOps y seguridad), cuya configuración está en [`.claude/agents/`](.claude/agents/). Mi aporte fue la **concepción del producto y las pruebas documentales del curso**: validar que las lecciones, los ejercicios y la plataforma funcionaran como un curso coherente.

---

## 📬 Contacto

**Juan Manuel Benitez Skolik**
✉️ Juanmabennitez2008@gmail.com · 💼 [LinkedIn](https://www.linkedin.com/in/juan-manuel-benitez-skolik-9863673a7/) · 🌐 [Portafolio](https://juanmask327.github.io/Portafolio/) · 🆔 [ORCID](https://orcid.org/0009-0009-2170-4617)

---

© 2026 Juan Manuel Benitez Skolik. Todos los derechos reservados. El código está publicado para consulta y aprendizaje.
