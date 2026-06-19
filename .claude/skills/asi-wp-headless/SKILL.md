---
name: asi-wp-headless
description: "Usar al trabajar en el pipeline de contenido del CMS ASI/TATC: editar cms-engine.js, content.json, cualquier marcado data-cms/data-cms-attr, o construir/depurar el endpoint headless de WordPress /wp-json/tatc/v1/content o /wp-json/tatc/v1/verify-password. También usar antes de cualquier commit o push en este proyecto, y al tocar el gating de páginas (security.pages, password.html, el CPT tatc_gate)."
---

# ASI WP Headless

## Resumen de arquitectura

Este proyecto es un frontend estático (HTML/CSS/JS sin build, marca TATC/ISEEASI) que está migrando su contenido hacia un WordPress headless. No hay `package.json` ni framework — cada página HTML carga sus `<script>` directamente.

Roles de los archivos clave:
- `cms-engine.js` — motor de hidratación de contenido. Busca elementos `[data-cms]` en el DOM y los rellena desde un objeto de datos (ver "Flujo de datos y prioridad de merge"). Es el único punto de integración real con WordPress headless.
- `content.json` — contrato/esquema de contenido. Es la fuente de verdad de la *forma* de los datos y el fallback final si WordPress no responde.
- `admin/admin.html` — editor activo. Carga `content.json`, permite editarlo en el navegador, guarda un draft en `localStorage['tatc_cms']` y puede exportar un `content.json` actualizado. Es la única herramienta de admin realmente conectada.
- (Existió un segundo panel de admin paralelo — `admin-system.js`/`admin.css`/`data/config.json` — sin referenciar desde ningún HTML. Se eliminó el 2026-06-17 tras confirmar que nada lo cargaba.)
- `script.js` — además de animaciones/transiciones de página, hace su propio `fetch('/content.json')` independiente para el page-gating (`security.*`). No pasa por `cms-engine.js`, por lo que nunca ve el draft de localStorage ni datos de WP.

WordPress (lado servidor) vive en un repo totalmente separado: **`/Users/darielcurbelo/Local Sites/asi-cms-website/app/public/`** (sitio de Local, no confundir con `~/Documents/Wordpress_Local/test_1/`, que es un sitio Local distinto y no relacionado — ver "Incidente: ruta de WordPress equivocada" más abajo). Tema activo: `tatc-headless` (custom, NO `twentytwentyfive`). URL local: `http://asi-cms-website.local`. El endpoint `/wp-json/tatc/v1/content` **ya existe y ya funciona**, implementado en `wp-content/themes/tatc-headless/functions.php`. Frontend y WordPress se mantienen intencionalmente en repos y (a futuro) hostings separados — es el patrón correcto para headless, no un descuido a corregir.

## Flujo de datos y prioridad de merge

`cms-engine.js` resuelve el objeto de contenido en este orden:

1. **Draft de admin** — `localStorage['tatc_cms']` (guardado por `admin/admin.html`). Si existe, es la base inicial de `data`.
2. **WordPress headless** — fetch a `http://asi-cms-website.local/wp-json/tatc/v1/content`. Si responde OK:
   - Si no había draft, `data` se vuelve directamente la respuesta de WP.
   - Si había draft, se hace merge selectivo:
     - Claves de nivel superior que falten en `data` se copian desde WP, pero **no sobrescriben** lo que ya existe en el draft.
     - Excepción — estas 4 rutas siempre se sobrescriben con el valor de WP, aunque ya existan en el draft (WP es la fuente de verdad): `gallery_3d.artworks`, `gallery_3d.audio_src`, `projects.items`, `projects_detail`.
3. **Fallback a `content.json`** — solo si el fetch a WP falla (red, CORS, endpoint caído). Mismo merge superficial: solo rellena claves de nivel superior faltantes, sin las reglas especiales de WP.

Si no se obtiene ningún dato, `cms-engine.js` no hidrata nada y solo deja un warning en consola.

> ⚠️ **Trampa frecuente #1: no todo lo que edites en WordPress se reflejará en la web.** Solo las 4 rutas listadas arriba se sobrescriben siempre. El resto de secciones (`global`, `home`, `blog`, `post`, `typography`, `artist`, `security`) solo se completan desde WP si la clave **no existe ya** en el draft o en `content.json`. Si ya tienen un valor local, editar esa misma clave en WordPress no cambiará nada en la web hasta que se quite el valor local. Además, hasta que exista el endpoint `/wp-json/tatc/v1/content` y CORS esté bien configurado en producción, ningún cambio en WP se reflejará en absoluto (todo sale de `content.json`).
>
> ⚠️ **Trampa frecuente #2 (corrección): `projects_detail` se reemplaza por proyecto ENTERO, no campo por campo.** `Object.assign(data.projects_detail, fresh.projects_detail)` actúa sobre las claves de `projects_detail`, que son los **slugs** de proyecto (`"a-sweet-kid"`, `"a-sweet-kid-online"`, etc.) — no sobre los campos dentro de cada proyecto. Si WP devuelve `projects_detail["a-sweet-kid"]` sin el campo `immersive_url`, ese campo **se pierde por completo** (no se conserva del draft/`content.json`), porque todo el objeto de ese slug se sustituye de una sola vez. Conclusión práctica: el endpoint WP debe devolver **todos** los campos que le importen a cada proyecto en `projects_detail`, no solo los que cambiaron — omitir un campo equivale a borrarlo en producción.

### Ejemplo

**Draft en `localStorage` (editado a mano en el admin):**
```json
{
  "global": { "brand": "TATC (editado en admin)" },
  "gallery_3d": { "artworks": [ { "id": 0, "title": "OLD draft artwork" } ] },
  "projects_detail": { "a-sweet-kid": { "title": "OLD draft title", "immersive_url": "a-sweet-kid-online.html" } }
}
```

**Respuesta fresca de WordPress:**
```json
{
  "global": { "brand": "TATC" },
  "artist": { "name": "ISEEASI" },
  "gallery_3d": {
    "artworks": [ { "id": 0, "title": "Fragmented Identity" } ],
    "audio_src": "https://wp.local/audio/ambient.mp3"
  },
  "projects": { "items": [ { "id": 1, "title": "A Sweet Kid" } ] },
  "projects_detail": { "a-sweet-kid": { "subtitle": "Mexico City Art Week 2025" } }
}
```

**Resultado final que hidrata la página:**
```json
{
  "global": { "brand": "TATC (editado en admin)" },
  "artist": { "name": "ISEEASI" },
  "gallery_3d": {
    "artworks": [ { "id": 0, "title": "Fragmented Identity" } ],
    "audio_src": "https://wp.local/audio/ambient.mp3"
  },
  "projects": { "items": [ { "id": 1, "title": "A Sweet Kid" } ] },
  "projects_detail": {
    "a-sweet-kid": {
      "subtitle": "Mexico City Art Week 2025"
    }
  }
}
```

Notas del ejemplo: `global.brand` se conserva del draft porque ya existía y no es una de las 4 rutas "WP manda siempre". `artist` viene completo de WP porque no existía en el draft. `gallery_3d.*` se sobrescribe siempre con WP aunque el draft tuviera otro valor. `projects_detail.a-sweet-kid` termina **solo** con `subtitle` — `title` e `immersive_url` que estaban en el draft **se pierden por completo**, porque `Object.assign` reemplazó el objeto entero de ese slug, no hizo merge campo por campo (ver advertencia arriba). Por eso el plugin de WP debe devolver siempre el objeto completo de cada proyecto, con todos los campos que deban persistir.

## Esquema de contenido

`content.json` define el contrato de forma que el endpoint WP debe cumplir. Tiene 10 secciones de nivel superior:

| Sección | Fuente de verdad | Resumen |
|---|---|---|
| `global` | draft/fallback | marca, tagline, year, nav, social |
| `home` | draft/fallback | meta_title, loader_text, hero_headline |
| `blog` | draft/fallback | listado de posts (slug, date, title, summary, url) |
| `post` | draft/fallback | posts{} indexado por slug, con body[] de bloques |
| `projects` | **WordPress** | `items[]` (listado de proyectos) |
| `projects_detail` | **WordPress** (merge por clave) | detalle por slug de proyecto |
| `gallery_3d` | **WordPress** (`artworks`, `audio_src`) | galería 3D inmersiva |
| `typography` | draft/fallback | tokens de tipografía por rol |
| `artist` | draft/fallback | bio del artista |
| `security` | draft/fallback | `gate_title`, `gate_description`, `pages` (mapa público/privado). Ya **no** contiene ningún password — ver "Page Gate" en reglas de seguridad |

Detalle completo de campos por sección: `references/content-schema.md`.

Reglas del contrato:
- Los nombres de clave son sensibles a mayúsculas/minúsculas y deben coincidir exactamente con los `data-cms="path.to.key"` usados en el HTML.
- Las rutas anidadas se resuelven por punto (`path.split('.').reduce(...)` en `cms-engine.js`), así que ninguna clave puede contener un punto literal en su nombre.
- `cms-engine.js` solo inyecta valores primitivos (`typeof value !== 'object'`) en elementos `[data-cms]`. Arrays/objetos (`body[]`, `artworks[]`, `posts[]`) deben ser leídos por JS específico de cada página (`post.html`, `gallery.html`, etc.), no por el hidratador genérico.

## Convenciones de marcado

- `data-cms="path.to.key"` — ruta separada por puntos hacia el objeto de contenido resuelto. `cms-engine.js` reemplaza el `innerHTML` del elemento con el valor encontrado.
- `data-cms-attr="nombreDeAtributo"` — si está junto a `data-cms`, en lugar de innerHTML se setea el atributo indicado (`href`, `src`, `alt`, etc.) con el valor encontrado.
- Caso especial `<title>` — en vez de innerHTML, actualiza `document.title`.
- Si la ruta no existe (`undefined`) o el valor es un objeto/array, no se inyecta nada: el elemento conserva su contenido HTML original tal como esté escrito en el archivo. Útil como placeholder visual, pero también puede esconder errores de tipeo en la ruta sin avisar.
- Convención de nombres en JSON: snake_case (`meta_title`, `hero_headline`, `loader_skip_label`) — mantenerla para que HTML y JSON se puedan revisar a simple vista.
- **El contenido escrito directamente en el HTML es un tercer nivel de fallback, no relleno descartable.** Si ni `cms:ready` llega a disparar (ver más abajo), algunas páginas (`index.html`) usan un `setTimeout` que revisa `window.TATC_CONTENT` y, si sigue vacío, usa el texto que ya estaba escrito en el elemento como último recurso. Por eso el HTML de cada página debe llevar siempre contenido real y representativo, nunca un placeholder vacío tipo "Lorem" pensado para borrarse luego.

### Sincronización con el resto de la página: `cms:ready` / `window.TATC_CONTENT`

Después de hidratar, `cms-engine.js` deja el objeto completo en `window.TATC_CONTENT` y dispara `document.dispatchEvent(new CustomEvent('cms:ready', { detail: data }))`. Cualquier script que necesite datos que `data-cms` no puede inyectar (arrays/objetos: `body[]`, `artworks[]`, `posts[]`, etc.) debe usar este patrón, ya usado en `index.html`, `post.html`, `blog.html`, `project-page.html`, `carousel.js`, `projects.js` y `a-sweet-kid-online.js`:

```js
if (window.TATC_CONTENT) {
  init(window.TATC_CONTENT); // ya estaba listo antes de que este script cargara
} else {
  document.addEventListener('cms:ready', (e) => init(e.detail));
}
```

Cualquier script nuevo que dependa del contenido debe seguir este mismo patrón doble (chequear `TATC_CONTENT` primero, escuchar `cms:ready` como respaldo) para no asumir un orden de carga de `<script>` específico.

## Reglas del lado WordPress

El WordPress que alimenta este frontend vive en un repo Git separado:

- **Ruta real: `/Users/darielcurbelo/Local Sites/asi-cms-website/app/public/`** — este es el sitio de Local que de verdad responde en `http://asi-cms-website.local`. Verificar siempre con `ls ~/Library/Application\ Support/Local/run/*/conf/nginx/site.conf` (buscar la línea `root`) antes de asumir una ruta, porque hay varios sitios Local en esta máquina y se ha confundido antes (ver incidente abajo).
- URL local: `http://asi-cms-website.local`
- Tema activo: **`tatc-headless`** (custom — no es `twentytwentyfive`, que solo está instalado pero inactivo)
- Plugins activos: `advanced-custom-fields` (ACF free). `elementor` NO está instalado en este sitio.
- Repo Git: inicializado por Claude Code el 2026-06-17, remoto `https://github.com/darielcurbelo26/tatc-wordpress` configurado ese mismo día. Solo el tema `tatc-headless` está versionado por ahora (ver `.gitignore` del repo WP).

### El endpoint `/wp-json/tatc/v1/content`

- **Ya existe y ya funciona.** Implementado en `wp-content/themes/tatc-headless/functions.php`, función `tatc_get_custom_content()`.
- Estrategia: carga `content.json` (una copia bundleada dentro del propio tema, en `wp-content/themes/tatc-headless/content.json`) como base, y solo sobreescribe `projects.items`, `projects_detail` y `gallery_3d.artworks`/`gallery_3d.audio_src` con datos reales de WordPress. Por eso la respuesta incluye TODAS las secciones del esquema (`global`, `home`, etc.), no solo las 4 gestionadas por WP.
- CPT `project` (slugs reales: `a-sweet-kid`, `a-sweet-kid-online`). Campo ACF `project_type` = `standard` (portada + carrusel) o `virtual` (iframe 3D + paredes). Campos clave: `desc`, `date`, `loc`, `custom_link`, `subtitle`, `medium`, `body` (textarea, un párrafo por línea), `carousel_paths` (textarea, una ruta de imagen por línea), `iframe_url`, `audio_override` (archivo mp3), `wall_front_image`/`_title`/`_desc`, `wall_left_*`, `wall_right_*`, `wall_back_*` (estas 4 paredes alimentan `gallery_3d.artworks`).
- Existe también un CPT `artwork` (1 solo post, "Obra 1") que **no se usa** en la respuesta actual del endpoint — código/datos legacy, no construir sobre él sin confirmar primero.
- CORS: el callback ya manda `Access-Control-Allow-Origin: *` manualmente. Abierto a cualquier origen — aceptable para una API de solo lectura, pero revisar si conviene restringirlo a un dominio concreto antes de producción (ver Fase 4 del plan).
- Hay un script de auto-migración (`admin_init`, guard `tatc_projects_migrated_v9`) que ya corrió una vez y sideload-eó imágenes/audio reales a la biblioteca de medios. Usa una ruta absoluta hardcodeada a una copia ANTIGUA del frontend en el Desktop (`/Users/darielcurbelo/Desktop/VERSIONES ASI WEBSITE/ASI TEST (A CMS)/`) — no correrá de nuevo (el guard ya está puesto), pero si algún día se sube `tatc_projects_migrated_v9` o se borra esa opción, fallará porque esa ruta del Desktop ya no existe.

### Incidente: ruta de WordPress equivocada en la documentación

El README/CLAUDE.md originales (y una primera versión de esta skill) documentaban `~/Documents/Wordpress_Local/test_1/app/public/` como "el" WordPress del proyecto, con tema `twentytwentyfive` y el endpoint "todavía no construido". Eso era incorrecto: `test_1` es un sitio Local sin relación con este proyecto (solo tiene Elementor instalado, sin nada de "tatc"). El sitio real, con el endpoint ya funcionando, es `~/Local Sites/asi-cms-website/`. Antes de corregirlo, se llegó a construir un plugin completo en la ruta equivocada (sin efecto en el sitio real) y, al intentar activarlo vía SQL directo, se escribió por error una entrada inválida en `active_plugins` del sitio **real** (ya revertida). Lección: **verificar siempre la ruta real vía la config de nginx/Local antes de asumir cualquier ruta de un README**, incluso (especialmente) cuando el README es de este mismo repo.

### Qué versionar en el repo de WordPress

- **Sí versionar:** el tema `tatc-headless` (todo su contenido: `functions.php`, `style.css`, `content.json` bundleado, assets). Cualquier plugin custom futuro.
- **No versionar:** `wp-content/uploads/`, plugins de terceros (ACF, Elementor), temas por defecto de WordPress, `wp-admin/`, `wp-includes/`, archivos core sueltos. Ver `.gitignore` ya creado en ese repo.
- Si se modifica el tema, registrar claramente esos cambios en el mensaje de commit (no agruparlos junto con cambios de un futuro plugin sin explicar cuál es cuál).

### Backup (no es Git)

Git no cubre la base de datos ni los medios. Para respaldo completo:
1. Código versionado con Git (tema + plugin custom si lo hay) — ya inicializado, ver incidente arriba.
2. Export periódico de la base de datos: `wp db export backup.sql` o `mysqldump` (no hay WP-CLI instalado en esta máquina; usar el PHP/MySQL embebidos de Local, ver rutas bajo `~/Library/Application Support/Local/lightning-services/` y `~/Library/Application Support/Local/run/<hash>/mysql/mysqld.sock`).
3. Respaldo de `wp-content/uploads` por separado (rsync, copia manual, etc.).

## Reglas de commits

- **Un commit, un repo.** Nunca mezclar cambios del frontend (este repo) con cambios del WordPress local (otro repo) en el mismo commit.
- **Agrupar por intención.** Cambios de contenido (`content.json`, archivos dentro de `admin/`) en commits separados de cambios de comportamiento/código (`cms-engine.js`, `script.js`, etc.) cuando sea razonable.
- **No commitear generados del sistema** (`.DS_Store`) — ya están en `.gitignore`; si se edita ese archivo, confirmar que sigue cubriéndolos.
- **No commitear credenciales ni dumps de base de datos** (`local.sql`) en el repo de WordPress, ni nada bajo `wp-content/uploads/`.
- **Mensajes de commit con el "qué" y el "por qué"** cuando no sea obvio.
- **Antes de cualquier commit**, revisar que no se esté incluyendo ningún valor real de password de un Page Gate (deben vivir solo en la base de datos de WordPress, nunca en un archivo de este repo ni del repo de WordPress).

## Reglas de publicación/push

- Remotos: frontend en `https://github.com/darielcurbelo26/cms-system-asi`, WordPress real en `https://github.com/darielcurbelo26/tatc-wordpress` (configurado el 2026-06-17). No asumir que existe un remoto distinto a estos dos ni inventar una URL.
- Nunca hacer push (y menos force-push) sin confirmación explícita del usuario en esa misma conversación, incluso si ya se autorizó un push antes.
- Force-push a cualquier rama compartida (especialmente `main`) requiere confirmación explícita y nunca se hace por iniciativa propia.
- Antes de publicar, verificar que no se esté subiendo ningún secreto real (passwords, dumps de DB, credenciales de WP).
- Si se configura un remoto nuevo (para cualquier repo), confirmarlo con el usuario antes de crear el repo remoto o de hacer el primer push.

## Reglas de seguridad

- **Nunca commitear:** `wp-config.php`, dumps de base de datos (`local.sql` u otros `.sql`), archivos `.env`, ni ninguna credencial de WordPress (usuario/contraseña de admin, claves de aplicación). Tampoco el password real de ningún Page Gate (ver siguiente punto) — esos valores viven únicamente en la base de datos de WordPress.

### Page Gate — protección de páginas por password (implementado 2026-06-18)

El password de páginas protegidas (`security.pages[x] === "private"`) **ya no vive en ningún archivo del repo**. El flujo actual:

1. **CPT `tatc_gate`** en el WordPress real (`tatc-headless/functions.php`) — cada entrada tiene dos campos ACF: `page_file` (ej. `a-sweet-kid-online.html`) y `password`. Para proteger una página nueva, basta con crear una entrada nueva en wp-admin (**Page Gates → Añadir nuevo**) — no requiere tocar código.
2. **Endpoint `POST /wp-json/tatc/v1/verify-password`** — recibe `{page, password}`, busca la entrada `tatc_gate` con ese `page_file`, compara con `hash_equals()` server-side, y responde solo `{ok: true|false}`. El valor real del password **nunca** sale de WordPress.
3. **`password.html`** ya no compara nada localmente — llama a ese endpoint y actúa según la respuesta.
4. **`content.json`** (y su copia bundleada en el tema de WP) ya no tienen `gate_password` ni `page_passwords` — `security` solo guarda `gate_title`, `gate_description` y `pages` (el mapa público/privado, que no es sensible).
5. **Si WordPress está caído, el acceso se niega** (no hay fallback local) — es el trade-off correcto: cualquier sistema de login real depende de que el backend esté arriba. Verificado empíricamente (ver "Verificación").

Esto resuelve la exposición del password (problema real), pero **no** convierte el sitio en uno con control de acceso a nivel de archivo: como el HTML/JS/assets siguen siendo archivos estáticos servidos a cualquiera, alguien que sepa cómo (ver código fuente, `curl`, deshabilitar JS) puede seguir llegando al contenido de la página protegida sin pasar por el gate. Si en algún momento se necesita protección real a nivel de archivo, hay que moverse a hosting con autenticación de servidor (`.htaccess`/`htpasswd`, Cloudflare Access, etc. — no disponible en GitHub Pages).

- **Checklist antes de publicar (commit o push):**
  - ¿El diff incluye algún valor real de password, API key o credencial?
  - ¿Se está exportando contenido desde el admin que incluya secretos sin querer?
  - ¿El `.gitignore` sigue cubriendo lo que no debe versionarse?
- Si se detecta un secreto que ya fue commiteado y subido al remoto, no basta con borrarlo en un commit nuevo — ya quedó expuesto en el historial. Hay que rotarlo y avisar al usuario explícitamente, no solo corregir el archivo. (Esto ya pasó con el password viejo, `"sweet"` — se rotó al crear el Page Gate, ver pendientes.)

## Referencias a las skills WP nativas

Antes de tocar código del lado WordPress, consultar la skill correspondiente en `.claude/skills/`:
- `wp-rest-api` — al construir o depurar el endpoint `tatc/v1/content`.
- `wp-plugin-development` — al estructurar el plugin custom que expone ese endpoint.
- `wp-block-development` / `wp-block-themes` — si se decide mapear contenido vía bloques Gutenberg en vez de CPTs/ACF.
- `wp-wpcli-and-ops` — para tareas operativas vía WP-CLI (exportar DB, gestionar plugins, etc.).
- `wp-phpstan` — para análisis estático del PHP del plugin custom.
- `wp-project-triage` — para diagnóstico inicial si algo no está claro sobre el estado del WP local.
- `gsap-*` — si se necesita animar algo ligado a la hidratación de contenido (ej. transiciones cuando llega `cms:ready`).

## Pendientes conocidos

- [x] Crear el plugin/endpoint REST que expone `/wp-json/tatc/v1/content` — **ya existe**, en `tatc-headless/functions.php` (ver "Reglas del lado WordPress"). No estaba documentado porque el README apuntaba a la ruta de WordPress equivocada.
- [x] Versionar el tema dentro del repo de WordPress — hecho el 2026-06-17 (primer commit, solo `tatc-headless`).
- [x] CORS — el endpoint ya manda `Access-Control-Allow-Origin: *`. Pendiente decidir si restringirlo a un dominio concreto antes de producción.
- [~] Bucle de recarga en local — **mitigado, no resuelto del todo.** La causa principal identificada es Live Server (VS Code) recargando ante cualquier cambio de archivo en el proyecto, agravado por su interacción con el caché del navegador (se rompe el ciclo al abrir DevTools). Se aplicó `.vscode/settings.json` con `liveServer.settings.ignoreFiles` excluyendo `.git/**`, `.claude/**`, `.DS_Store`. **Pero el usuario reporta que en frío (primer arranque de Live Server) todavía puede recargar varias veces antes de "entrar" establemente** — pendiente de investigar la causa exacta de ese comportamiento en frío específicamente (posible candidato: la primera negociación de la conexión websocket de Live Server, o el propio `checkSecurity()`/fetch a `content.json` en una carga sin caché todavía). Si reaparece de forma molesta, usar `python3 -m http.server` (sin auto-reload) para depurar sin esta variable.
- [x] Probar la integración real del frontend (`cms-engine.js`) contra este endpoint real — **verificado el 2026-06-17**, los 3 escenarios de "Verificación" pasaron: WP arriba (las 4 rutas WP se actualizan), con draft + WP arriba (draft se conserva salvo en las 4 rutas WP, `projects_detail` se reemplaza completo por slug), y con draft + WP caído (cae a `content.json` con el warning esperado, sin romper la página, y sin tocar `projects_detail` porque la clave ya existía en el draft).
- [x] Resolver el texto plano de `security.gate_password`/`page_passwords` — **resuelto el 2026-06-18** con el sistema de Page Gate (CPT `tatc_gate` + endpoint `verify-password`), ver "Reglas de seguridad".
- [x] Remoto configurado para el repo Git de `~/Local Sites/asi-cms-website/app/public/` — **`https://github.com/darielcurbelo26/tatc-wordpress`, subido el 2026-06-17.**
- [x] Código legado `admin-system.js` + `admin.css` + `data/config.json` — **eliminados el 2026-06-17** tras confirmar cero referencias.
- [x] Carpeta duplicada `projects/projects/` y las artworks huérfanas de `projects/a-sweet-kid/artworks/` — **eliminadas el 2026-06-17** tras confirmar cero referencias (las imágenes reales viven en `assets/artworks/`).
- [ ] El script de auto-migración en `functions.php` referencia una ruta del Desktop que ya no existe (ver "Reglas del lado WordPress") — no es urgente (ya corrió, tiene guard), pero limpiarlo evitaría confusión futura.
- [x] Carrusel y galería 3D nunca cargaban — **corregido el 2026-06-17.** Tres causas distintas, encontradas una tras otra:
  1. `a-sweet-kid.html` nunca cargaba `cms-engine.js`, así que `cms:ready` nunca se disparaba ahí y `carousel.js` esperaba para siempre (falla en cualquier entorno, no solo Pages). Fix: agregar el `<script>` faltante.
  2. `cms-engine.js`, `script.js` y `password.html` hacían `fetch('/content.json')` con ruta absoluta desde la raíz del dominio — rompe en GitHub Pages porque el sitio vive en `/cms-system-asi/`, no en la raíz. Fix: cambiar las 3 rutas a relativas (`content.json` sin `/` inicial). Lección para cualquier fetch nuevo: usar siempre ruta relativa.
  3. **Bug real en `a-sweet-kid-online.js`** (no relacionado con WP/rutas): en `buildArtworks()`, `spotLights.push(spot)` guardaba el objeto `SpotLight` crudo, pero `animate()` hace `spotLights.forEach(({ light, id }) => { light.intensity += ... })`, esperando `{ light, id }`. Como `spot.light` no existe, cada frame del render loop lanzaba `Cannot read properties of undefined (reading 'intensity')` **antes** de llegar a `renderer.render()` — el canvas se congelaba en el último frame válido (la sala vacía, justo antes de que se agregaran las obras), y la consola se llenaba de la misma excepción sin parar. Fix: `spotLights.push({ light: spot, id: a.id })`.
  - **Update 2026-06-19 — resuelto:** lo anterior causaba que las imágenes de WP se vieran como cuadros negros dentro de la galería 3D (WebGL "tainted texture" cuando una imagen cross-origin no trae `Access-Control-Allow-Origin`). Fix aplicado en `~/Local Sites/asi-cms-website/conf/nginx/site.conf.hbs` (plantilla nginx **de este sitio específico de Local**, no un archivo global): se agregó `add_header Access-Control-Allow-Origin *;` al `location` de `jpg|jpeg|gif|png|ico|xml`, igual que ya existía para fuentes (`eot|woff|...`). Requiere reiniciar el sitio en Local para que la plantilla se regenere. Esto es específico del entorno Local — en producción (hosting real) habrá que configurar CORS de la misma forma en el servidor real, ver `GUIA-PRODUCCION.md`.
- [x] **Pared derecha de la galería 3D nunca se veía — corregido el 2026-06-17.** No era un bug de renderizado: la cámara en `a-sweet-kid-online.js` solo puede rotar (`yaw`) entre -90° y +90° (un arco de 180°), así que de las 4 paredes físicas de la sala solo 3 son alcanzables (`x=-R`, `z=-R`, `x=+R`); la 4ª pared (`z=+R`) existe pero la cámara nunca puede girar lo suficiente para mirarla. El `wallMap` viejo usaba las etiquetas `front`/`left`/`right`/`back`, y la 3ª obra ("Solitary Confinement") venía etiquetada `"right"`, que apuntaba justo a esa 4ª pared inalcanzable. Fix: `wallMap` ahora solo tiene 3 posiciones, renombradas a `left`/`center`/`right` (coincidiendo con lo que el usuario realmente puede ver al girar la cámara), y tanto `content.json` como el endpoint real de WordPress (`functions.php`, vía un `$wall_label_map` que traduce los nombres de campo ACF `front/left/right/back` a `left/center/right` solo en la respuesta JSON, sin tocar los campos ACF ni los datos ya migrados) quedaron alineados con esto. Lección: si alguna vez se agrega una 4ª obra, primero hay que ampliar el rango de `yaw` en `animate()` — agregar el dato sin tocar la cámara reproduce este mismo bug.
- [x] **Fuente "Inter Variable" no cargaba en otras máquinas — corregido el 2026-06-19.** `style.css` referenciaba `font-family: "Inter Variable"` en 6 lugares sin cargar esa fuente desde ningún sitio (sin `@font-face`, sin Google Fonts, sin archivo local) — solo se veía bien en máquinas que ya tenían un font llamado exactamente así instalado como fuente del sistema. Google Fonts expone la familia como `"Inter"` (sin "Variable"), no como un nombre separado. Fix: se agregó el `@import` real de Inter a `style.css` y se corrigieron las 6 referencias a `"Inter"`. Verificado con un barrido completo: ningún CSS ni `<style>` inline del proyecto quedó con un nombre de fuente no cargado.
- [ ] `content.json.typography` (tokens de tamaño/peso/tracking de fuente) **no lo lee ningún JS del proyecto** — es configuración muerta, no afecta el render hoy. Por eso quedó fuera de la migración a gestión por WordPress (ver más abajo) — no tiene sentido exponer para edición algo que no hace nada. Si en el futuro se decide conectarlo a algo real, hacerlo ahí.

## Principio de documentación a futuro

Toda regla y contrato de esta skill debe describirse en términos de comportamiento (qué pasa, en qué orden, bajo qué condición), no en términos de la implementación vanilla-JS actual cuando sea posible. El esquema de `content.json`, el flujo de merge, y las convenciones `data-cms` deben quedar documentados de forma que, si en el futuro se decide migrar el frontend a un framework moderno (Next.js, Astro, etc.), esta skill sirva directamente como spec de migración en lugar de tener que redocumentar todo desde cero.

## Verificación

- El endpoint `http://asi-cms-website.local/wp-json/tatc/v1/content` responde 200 y su forma coincide con las claves de `content.json` (mismo nivel superior, mismas claves anidadas en las 4 rutas "fuente de verdad WP").
- `cms-engine.js` probado en 3 escenarios: WP arriba (las 4 rutas WP se ven actualizadas), WP abajo (cae a `content.json` sin romper la página), y con un draft en `localStorage['tatc_cms']` presente (no debe perder datos salvo en las 4 rutas WP).
- Sin errores de consola tipo `[CMS] No content loaded.` en una carga normal.
- Ningún valor real de password viajando en una respuesta pública del endpoint.
