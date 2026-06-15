---
name: project-api-connection
description: Conexión del frontend al backend real — convenciones, endpoints, mapeo de tipos
metadata:
  type: project
---

El frontend (Next.js 15) fue conectado al backend real (Fastify + localhost:3001) en la Fase 4.

**Token de auth:** clave `ss_access_token` en localStorage (TOKEN_KEY en api-client.ts). El api-client maneja auto-refresh con `ss_refresh_token`.

**Endpoints usados:**
- `GET /levels` → `api.levels.list()` → `LevelPublic[]`
- `GET /levels/:id` → `api.levels.getDetail(id)` → `LevelDetail` (incluye exercises con progress)
- `GET /exercises/:id` → `api.exercises.getDetail(id)` → `ExerciseDetail` (incluye hints como `string[]` y progress)
- `POST /playground/validate` → `api.playground.validate(exerciseId, query)` → `ValidationResult`
- `PATCH /exercises/:id/save-draft` → `api.exercises.saveDraft(id, query)` (auto-save, debounce 2s)
- `POST /exercises/:id/hint` → `api.exercises.requestHint(id)` (background, no bloquea UI)
- `GET /users/me/dashboard` → `api.users.getDashboard()` → `DashboardResponse`

**Discrepancia conocida entre tipos y respuesta real (Resuelta):**
- *Corregido (2026-06-04):* `level_id` y `order_index` ahora están incluidos en el esquema de respuesta 200 en Fastify (`GET /exercises/:id`) por lo que el objeto `exercise` del frontend ya los tiene poblados de forma segura.
- `hints` viene como `string[]` del backend, pero los componentes UI esperan `Hint[]`. Mapper: `mapApiHintsToHintObjects()` en la página del ejercicio.
- `ValidationResult` del API-client tiene `xp_earned` (snake_case), el tipo local `ValidationResult` tiene `xpEarned` (camelCase). Mapper: `mapApiValidationResult()`.

*(Nota: Los controles de navegación Anterior/Siguiente agregados en la vista de ejercicio, y los de navegación entre lecciones/unidades en la vista de detalle de nivel, fueron completamente removidos del frontend a petición del usuario, restableciendo el diseño y el comportamiento de navegación a su estado inicial).*

**SaveDraft path correcto:** `PATCH /exercises/:id/save-draft` (no `/draft`). Corregido en api-client.ts.

**updateProfile path corregido:** `PATCH /users/me/profile` (no `/users/me`). El backend registra la ruta como `/users/me/profile`. Corregido en api-client.ts en auditoría Fase 5.

**PlaygroundContainer — reescrito con WASM real (Fase 5):**
- La ejecución de queries usa sql.js real cargado vía dynamic import. Ya NO usa mock.
- Dataset cargado desde `/public/dataset.db` al montar el componente.
- WASM file (`sql-wasm.wasm`) copiado a `/frontend/public/` desde `node_modules/sql.js/dist/`.
- `locateFile: (file) => \`/${file}\`` en initSqlJs para que Next.js sirva el WASM correctamente.
- Estado de carga: `"loading_db"` muestra banner mientras inicializa WASM + fetch del dataset.
- DB se cierra en el cleanup del useEffect para liberar memoria WASM.
- Prop `onHint?: () => void` añadida a `PlaygroundContainerProps` en `types.ts`.

**PlaygroundContainer — props:**
- `onQueryChange?: (query: string) => void` — sincroniza query con página padre (para botón externo "Verificar")
- `onHint?: () => void` — delegado al padre para controlar HintPanel
- Ambas se pasan desde la página del ejercicio.

**Why:** El PlaygroundContainer maneja su propio estado de query internamente. El prop `onSubmit` es para validación externa. `onQueryChange` resuelve la sincronización con el botón externo de verificar.

**How to apply:** Siempre pasar `onQueryChange` y `onHint` en la página de ejercicio para mantener sincronía entre PlaygroundContainer y la UI exterior.
