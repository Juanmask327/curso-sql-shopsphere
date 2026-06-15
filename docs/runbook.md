# ShopSphere — Runbook de Operaciones

**Audiencia:** Desarrolladores y operadores del proyecto ShopSphere.
**Propósito:** Procedimientos operativos para el entorno local y de staging.
**Mantenido por:** DevOps Engineer.

---

## 1. Levantar el entorno local

El método recomendado es usar los scripts de setup automáticos. Ejecutar desde la raíz del proyecto:

**Linux / macOS / WSL:**
```bash
bash scripts/setup.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

El script realiza en orden:
1. Verifica que Docker y Docker Compose estén instalados y corriendo.
2. Crea `.env` desde `.env.example` si no existe.
3. Valida que las variables críticas del `.env` sean correctas (`validate-env.sh`).
4. Levanta todos los servicios con `docker-compose up -d --build`.
5. Espera a que PostgreSQL y Redis estén healthy antes de continuar.
6. Imprime las URLs de acceso.

**Setup manual (si el script falla):**
```bash
cp .env.example .env
# Editar .env con los valores correctos
bash scripts/validate-env.sh
docker-compose up -d
```

**URLs de acceso una vez levantado:**

| Servicio   | URL                               | Notas                              |
|------------|-----------------------------------|------------------------------------|
| Frontend   | http://localhost:3000             | Next.js 15                         |
| Backend    | http://localhost:3001/health      | Fastify — retorna `{"status":"ok"}`|
| DB Admin   | http://localhost:8080             | Adminer                            |
| PostgreSQL | localhost:5432                    | Para DBeaver / TablePlus / psql    |

---

## 2. Conectarse a la base de datos directamente

**Via Docker Compose (recomendado — no requiere psql local):**
```bash
docker-compose exec db psql -U shopsphere_user -d shopsphere
```

**Via psql local (si está instalado en tu máquina):**
```bash
psql postgresql://shopsphere_user:TU_PASSWORD@localhost:5432/shopsphere
```

Reemplaza `TU_PASSWORD` con el valor de `POSTGRES_PASSWORD` en tu `.env`.

**Comandos psql útiles una vez dentro:**
```sql
-- Listar todas las tablas
\dt

-- Ver estructura de una tabla
\d users
\d exercise_attempts

-- Ver triggers activos
\dS+ users

-- Salir
\q
```

**Via Adminer (interfaz web, sin instalar nada):**
1. Abre http://localhost:8080
2. Sistema: `PostgreSQL`
3. Servidor: `db`
4. Usuario: valor de `POSTGRES_USER` en `.env` (default: `shopsphere_user`)
5. Contraseña: valor de `POSTGRES_PASSWORD` en `.env`
6. Base de datos: valor de `POSTGRES_DB` en `.env` (default: `shopsphere`)

---

## 3. Ver los logs de cada servicio

**Todos los servicios (streaming en tiempo real):**
```bash
docker-compose logs -f
```

**Servicio específico:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
docker-compose logs -f redis
docker-compose logs -f adminer
```

**Últimas N líneas sin streaming:**
```bash
docker-compose logs --tail=100 backend
```

**Buscar un patrón en logs (ejemplo: errores):**
```bash
docker-compose logs backend | grep -i error
docker-compose logs backend 2>&1 | grep -E "(ERROR|WARN|playground)"
```

**Logs del stack de monitoring (si está activo):**
```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml logs -f grafana
```

---

## 4. Resetear la base de datos

**Reset completo (elimina todos los datos y vuelve a ejecutar init.sql):**
```bash
docker-compose down -v
docker-compose up -d
```

El flag `-v` elimina los volúmenes Docker (donde vive la data de PostgreSQL y Redis). Al volver a levantar, `init.sql` se ejecuta automáticamente porque el volumen es nuevo.

**Cuándo hacer esto:**
- Después de modificar `scripts/init.sql` con cambios de schema.
- Cuando la DB está en un estado inconsistente.
- Para empezar desde cero en desarrollo.

**Solo limpiar datos de Redis (sin tocar PostgreSQL):**
```bash
docker-compose exec redis redis-cli FLUSHALL
```

**Recrear solo el contenedor de DB (sin eliminar datos):**
```bash
docker-compose stop db
docker-compose rm -f db
docker-compose up -d db
```

---

## 5. Acceder a Adminer

Adminer es la interfaz web de administración de base de datos incluida en el entorno de desarrollo.

**URL:** http://localhost:8080

**Credenciales de conexión:**

| Campo          | Valor                                             |
|----------------|---------------------------------------------------|
| Sistema        | PostgreSQL                                        |
| Servidor       | `db`                                              |
| Usuario        | Valor de `POSTGRES_USER` en `.env`                |
| Contraseña     | Valor de `POSTGRES_PASSWORD` en `.env`            |
| Base de datos  | Valor de `POSTGRES_DB` en `.env`                  |

Los valores default en `.env.example` son:
- Usuario: `shopsphere_user`
- Base de datos: `shopsphere`

**Nota de seguridad:** Adminer solo está disponible en el entorno de desarrollo local. No existe en staging ni producción. Nunca exponer el puerto 8080 públicamente.

---

## 6. Correr los tests del backend manualmente

**Desde dentro del contenedor (recomendado — mismo entorno que CI):**
```bash
# Entrar al shell del contenedor de backend
docker-compose exec backend sh

# Una vez dentro, correr los tests
npm test

# Con watch mode (re-corre al guardar cambios)
npm run test:watch

# Con cobertura de código
npm run test:coverage
```

**Desde tu máquina local (requiere Node.js 22+ y las dependencias instaladas):**
```bash
cd backend
npm install
npm test
```

**Notas importantes:**
- Los tests usan `BCRYPT_ROUNDS=4` para velocidad. En producción es 12.
- Los tests de integración requieren PostgreSQL y Redis corriendo. El `docker-compose.yml` los levanta automáticamente.
- En CI (GitHub Actions), los servicios de DB se configuran como `services:` en el workflow.

**Filtrar tests específicos:**
```bash
# Un archivo específico
npm test -- auth.service.test.ts

# Tests que coincidan con un patrón
npm test -- --grep "login"
```

---

## 7. Qué hacer si el Playground no responde

El SQL Playground tiene dos capas: ejecución en WASM (cliente) y validación server-side (backend). Diagnosticar cuál está fallando:

### Síntoma: el editor no ejecuta queries en absoluto

La ejecución exploratoria corre en el navegador via WebAssembly. Si no responde:

1. **Verificar que el archivo `dataset.db` se cargó correctamente:**
   - Abrir DevTools del navegador → pestaña Network.
   - Buscar la request a `dataset.db`. Debe retornar 200 con Content-Type `application/octet-stream`.
   - Si retorna 404: el archivo no está en `/data/dataset.db` o el frontend no lo está sirviendo.

2. **Verificar errores en la consola del navegador:**
   - DevTools → Console.
   - Buscar errores de inicialización de sql.js o del Web Worker.

3. **Verificar que el navegador soporta WebAssembly:**
   - En la consola: `typeof WebAssembly` debe retornar `"object"`.

### Síntoma: la ejecución funciona pero el "submit" falla

El submit envía la query al backend para validación server-side.

1. **Verificar que el backend está vivo:**
   ```bash
   curl http://localhost:3001/health
   # Debe retornar: {"status":"ok"}
   ```

2. **Verificar el Worker pool del backend:**
   ```bash
   docker-compose logs -f backend | grep -i "playground\|worker\|timeout"
   ```
   Señales de problemas:
   - `"Worker pool exhausted"` — todos los workers ocupados. Aumentar `PLAYGROUND_WORKER_POOL_SIZE` en `.env`.
   - `"Query timeout"` — la query tardó más de `PLAYGROUND_QUERY_TIMEOUT_MS`. Normal para queries muy pesadas.

3. **Verificar el rate limiting de Redis:**
   ```bash
   # Ver los contadores de rate limit actuales
   docker-compose exec redis redis-cli KEYS "playground:ratelimit:*"
   
   # Ver el valor de un counter específico (reemplazar USER_ID)
   docker-compose exec redis redis-cli GET "playground:ratelimit:USER_ID:BUCKET"
   ```
   Si el rate limiting está bloqueando requests legítimos, el límite por defecto es `PLAYGROUND_RATE_LIMIT_RPM=60` queries por minuto por usuario.

4. **Ver métricas de latencia (si monitoring está activo):**
   - Abrir Grafana en http://localhost:3002
   - Dashboard: ShopSphere → métrica `playground_query_duration_ms`
   - P95 > 1500ms sostenido indica saturación del Worker pool.

5. **Reinicio de emergencia del Worker pool:**
   ```bash
   # Reiniciar solo el backend (los workers se recrean al arrancar)
   docker-compose restart backend
   ```

---

## 8. Revocar todas las sesiones de un usuario

Hay dos métodos según la urgencia:

### Método 1: Revocación lógica via SQL (recomendado)

Marca todas las sesiones activas del usuario como revocadas. El usuario queda deslogueado de todos sus dispositivos al expirar el token JWT actual (máximo 15 minutos por `JWT_EXPIRY_ACCESS`).

```sql
-- Conectarse a la DB primero:
-- docker-compose exec db psql -U shopsphere_user -d shopsphere

-- Revocar por email del usuario
UPDATE sessions
SET    revoked_at = now()
WHERE  user_id = (SELECT id FROM users WHERE email = 'usuario@ejemplo.com')
  AND  revoked_at IS NULL;

-- Verificar cuántas sesiones fueron revocadas
SELECT COUNT(*) AS sesiones_revocadas
FROM   sessions
WHERE  user_id = (SELECT id FROM users WHERE email = 'usuario@ejemplo.com')
  AND  revoked_at IS NOT NULL;
```

```sql
-- Revocar por user_id directo (si ya tienes el UUID)
UPDATE sessions
SET    revoked_at = now()
WHERE  user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  AND  revoked_at IS NULL;
```

### Método 2: Desactivar el usuario (acceso inmediato bloqueado)

Si el usuario representa una amenaza activa y necesitas bloqueo inmediato antes de que expire el JWT:

```sql
-- Desactivar la cuenta (el auth middleware verifica is_active en cada request)
UPDATE users
SET    is_active = false
WHERE  email = 'usuario@ejemplo.com';

-- También revocar todas las sesiones por consistencia
UPDATE sessions
SET    revoked_at = now()
WHERE  user_id = (SELECT id FROM users WHERE email = 'usuario@ejemplo.com')
  AND  revoked_at IS NULL;
```

Para reactivar la cuenta después:
```sql
UPDATE users
SET    is_active = true
WHERE  email = 'usuario@ejemplo.com';
```

### Limpiar sesiones expiradas (mantenimiento rutinario)

Las sesiones expiradas se acumulan en la tabla. Limpiar periódicamente:
```sql
-- Ver cuántas sesiones expiradas hay
SELECT COUNT(*) FROM sessions WHERE expires_at < now();

-- Eliminar sesiones expiradas hace más de 30 días
DELETE FROM sessions
WHERE  expires_at < now() - INTERVAL '30 days';
```

---

## Referencia rápida de comandos

```bash
# Levantar todo
docker-compose up -d

# Detener (preserva datos)
docker-compose down

# Reset completo
docker-compose down -v && docker-compose up -d

# Logs en tiempo real
docker-compose logs -f [servicio]

# Shell de un servicio
docker-compose exec backend sh
docker-compose exec db psql -U shopsphere_user -d shopsphere
docker-compose exec redis redis-cli

# Estado de los servicios
docker-compose ps

# Reconstruir imágenes
docker-compose up -d --build

# Activar monitoring
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml --profile monitoring up -d

# Validar .env antes de levantar
bash scripts/validate-env.sh
```
