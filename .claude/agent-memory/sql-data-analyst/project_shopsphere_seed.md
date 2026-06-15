---
name: project-shopsphere-seed
description: Estado del seed data de ShopSphere — métricas, outliers, decisiones de diseño y archivos generados
metadata:
  type: project
---

Seed data generado y validado con SQLite en 2026-05-31.

Archivo principal: `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\shopsphere-seed.sql`
Generador: `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\generate_seed.py`
Validador: `C:\Users\Juanm\OneDrive\Desktop\Curso SQL\dataset\validate_seed.py`

## Métricas reales del dataset

| Tabla              | Registros |
|--------------------|-----------|
| categories         | 10        |
| customers          | 500       |
| marketing_campaigns| 15        |
| products           | 80        |
| orders             | 2 000     |
| order_items        | ~4 186    |
| returns            | ~167      |
| inventory          | 80        |
| website_sessions   | 8 000     |
| payments           | ~1 481    |

- Rango de fechas: 2023-06-01 a 2024-12-01 (18 meses)
- Revenue delivered: ~$277 000
- Ticket promedio: ~$187
- Tasa de devolución: ~5.3% de items
- Órdenes delivered: ~74%

## Outliers narrativos plantados

- **customer_id=7** (whale): 25 órdenes. Segmento Premium garantizado por code.
- **product_id=10** (Hub USB-C): stock=0, last_updated=2024-10-15, tiene órdenes en Nov 2024 → stockout no detectado.
- **product_id=24** (Smartwatch ProX 3): tasa devolución ~26% (batería defectuosa).
- **product_id=39** (Campera Invierno): tasa devolución ~11% (talla incorrecta).
- **product_id=40** (Vestido Fiesta): tasa devolución ~20% (descripción engañosa).
- **Black Friday 2023-11-24 y 2024-11-29**: 9x peso en el pool de fechas → spike visible en histograma mensual.

## Campañas por ROI (fijo con seed=42)

| id | Nombre                  | ROI    | Tipo     |
|----|-------------------------|--------|----------|
| 1  | Black Friday 2023       | +323%  | alto     |
| 2  | Cyber Monday 2023       | +446%  | alto     |
| 3  | Navidad 2023            | +435%  | alto     |
| 4  | Reyes 2024              | +82%   | mediocre |
| 5  | San Valentin 2024       | +98%   | mediocre |
| 6  | Primavera Tech Sale     | -56%   | fallido  |
| 7  | Dia de la Madre 2024    | +499%  | alto     |
| 8  | Mid-Year Clearance      | +151%  | mediocre |
| 9  | Back to School 2024     | +145%  | mediocre |
| 10 | Flash Sale Agosto       | -71%   | fallido  |
| 11 | Septiembre Exclusivo    | -62%   | fallido  |
| 12 | Pre Black Friday Oct    | +70%   | mediocre |
| 13 | Black Friday 2024       | +483%  | alto     |
| 14 | Cyber Monday 2024       | +256%  | alto     |
| 15 | Navidad 2024 Early      | +120%  | mediocre |

## Decisiones de diseño relevantes

- El schema del curso usa `signup_date` (no `registered_at`) y `segment` como columna extra en `customers`.
- `orders` tiene columna `channel` y `campaign_id` (FK a marketing_campaigns).
- `products` tiene columna `cost` (para análisis de margen).
- `website_sessions` tiene `source`, `duration_sec`, `converted`.
- `marketing_campaigns` tiene `revenue_generated` (para calcular ROI directo).
- `returns` tiene `refund_amount`.
- `inventory` tiene `stock_qty`, `reorder_level`, `last_updated`.

**Why:** El schema del seed difiere ligeramente del schema canónico del sistema-prompt (que usa `registered_at`, no tiene `segment` ni `cost` ni `channel`). El seed usa el schema definido en el prompt de la tarea de generación, que es el schema del curso de producción.

**How to apply:** Al hacer QA de lecciones, verificar contra el schema del seed (con `signup_date`, `segment`, `cost`, `channel`) no contra el schema del sistema-prompt. Si hay inconsistencia, señalarla como hallazgo.
