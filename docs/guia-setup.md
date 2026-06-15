# Guía de Setup — ShopSphere SQL Platform

> Sigue los pasos en orden. Todos los comandos son **copiar y pegar**.
> Tiempo estimado: 10–15 minutos.

---

## Requisito previo

Instalar **Docker Desktop** (incluye Docker Compose):
👉 https://www.docker.com/products/docker-desktop/

Abrirlo y verificar que el ícono de la ballena esté activo en la barra de tareas antes de continuar.

---

## Paso 1 — Clonar el repositorio

**Windows (PowerShell) / Mac / Linux:**
```bash
git clone https://github.com/Juanmask327/curso-sql-shopsphere.git
cd curso-sql-shopsphere
```

---

## Paso 2 — Crear el archivo de configuración

**Windows (PowerShell):**
```powershell
copy .env.example .env
```

**Mac / Linux:**
```bash
cp .env.example .env
```

Ahora abre el archivo `.env` con cualquier editor de texto (Notepad, VS Code, etc.).

---

## Paso 3 — Generar los secretos (credenciales)

Necesitas llenar **3 valores** en el `.env`. A continuación los comandos para generarlos:

### JWT_SECRET (clave de 64 caracteres)

**Windows (PowerShell):**
```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

**Mac / Linux:**
```bash
openssl rand -hex 64
```

Copia el resultado y pégalo en el `.env`:
```
JWT_SECRET=aqui_el_valor_generado
```

---

### SESSION_COOKIE_SECRET (clave de 32 caracteres)

**Windows (PowerShell):**
```powershell
-join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
```

**Mac / Linux:**
```bash
openssl rand -hex 32
```

Copia el resultado y pégalo en el `.env`:
```
SESSION_COOKIE_SECRET=aqui_el_valor_generado
```

---

### POSTGRES_PASSWORD (elige cualquier contraseña)

No necesitas un comando especial. Elige cualquier texto sin espacios, por ejemplo:

```
POSTGRES_PASSWORD=miClaveSegura2025
```

**Importante:** Actualiza también `DATABASE_URL` con la misma contraseña:
```
DATABASE_URL=postgresql://shopsphere_user:miClaveSegura2025@db:5432/shopsphere
```

> El valor de `miClaveSegura2025` debe ser el mismo en ambas líneas.

---

### Google OAuth (opcional — solo si vas a usar "Iniciar con Google")

Solicita al líder del proyecto los valores de:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Si los dejas vacíos, el login con email y contraseña funciona normalmente.

---

## Paso 4 — Generar el dataset

El dataset de e-commerce no está en el repositorio y debe generarse localmente.
Requiere Python 3 instalado.

```bash
python dataset/generate_seed.py > dataset/shopsphere-seed.sql
python dataset/validate_seed.py
sqlite3 data/dataset.db < dataset/shopsphere-seed.sql
```

> Si no tienes `sqlite3` en el PATH en Windows, descárgalo desde https://sqlite.org/download.html
> y agrégalo al PATH, o instala Python y usa `pip install apsw`.

---

## Paso 5 — Levantar los servicios

```bash
docker-compose up -d
```

La primera vez descarga las imágenes y crea la base de datos. Puede tardar **2–3 minutos**.

Para ver si todo está corriendo:
```bash
docker-compose ps
```

Todos los servicios deben mostrar `healthy` o `running`.

---

## Paso 6 — Verificar que funciona

Abre estas URLs en el navegador:

| Servicio       | URL                          | Qué deberías ver             |
|----------------|------------------------------|------------------------------|
| Frontend       | http://localhost:3000        | Pantalla de inicio ShopSphere|
| Backend API    | http://localhost:3001/health | `{"status":"ok"}`            |
| Base de datos  | http://localhost:8080        | Panel de Adminer             |

---

## Paso 7 — Crear una cuenta de desarrollo (opcional)

Para saltarte el registro y entrar directo con una cuenta pre-configurada:

```bash
docker exec shopsphere-backend npx tsx src/scripts/seed-dev-account.ts
```

Credenciales creadas:
- **Email:** `dev@shopsphere.local`
- **Contraseña:** `devpassword123`

---

## Comandos del día a día

| Acción                        | Comando                        |
|-------------------------------|--------------------------------|
| Iniciar el entorno            | `docker-compose up -d`         |
| Detener (conserva los datos)  | `docker-compose down`          |
| Ver logs en tiempo real       | `docker-compose logs -f`       |
| Ver logs de un servicio       | `docker-compose logs -f backend` |
| Reset completo (borra todo)   | `docker-compose down -v`       |
| Reconstruir imágenes          | `docker-compose up -d --build` |

---

## Problemas comunes

**"JWT_SECRET está vacío — el backend no arranca"**
Completar el valor en `.env` siguiendo el Paso 3 y reiniciar: `docker-compose restart backend`

**"Puerto 3000 / 3001 / 5432 ya está en uso"**
Cambiar en `.env` las variables `FRONTEND_PORT`, `PORT` o `POSTGRES_PORT_EXPOSED` a otro número (ej: 3100, 3201, 5433) y reiniciar los servicios.

**"Hot-reload no detecta cambios en Windows"**
Normal — está resuelto por defecto con `WATCHPACK_POLLING=true` en `docker-compose.override.yml`. Si persiste, reiniciar el contenedor: `docker-compose restart frontend`

**"sqlite3: comando no encontrado" al generar el dataset**
En Windows, descargar el binario desde https://sqlite.org/download.html (sqlite-tools-win-x64) y descomprimirlo en una carpeta del PATH (ej: `C:\sqlite\`).

---

*Para dudas técnicas, revisar el `README.md` en la raíz del proyecto o consultar `arquitectura/decisiones.md`.*
