# CMS ASI - Documentación del proyecto

## Resumen general
Este proyecto es un CMS estático/local que ya consume contenido desde un WordPress headless real y funcionando.

### Rutas importantes
- Proyecto principal CMS: `/Users/darielcurbelo/Documents/CMS ASI WEBSITE CONFIG/ASI TEST (A CMS)/`
- **WordPress real (el que responde en `asi-cms-website.local`): `/Users/darielcurbelo/Local Sites/asi-cms-website/app/public/`**
- WordPress DB: gestionada por Local (Flywheel); no hay un dump `.sql` versionado actualmente. Ver "Backup" más abajo para cómo generarlo.

> ⚠️ Existe también `/Users/darielcurbelo/Documents/Wordpress_Local/test_1/app/public/` — es **otro sitio Local sin relación con este proyecto** (solo tiene Elementor instalado). Una versión anterior de esta documentación apuntaba ahí por error. Si vuelves a ver esa ruta en algún lado, está desactualizada.

## Estructura del proyecto CMS
- `cms-engine.js`: motor principal de contenido.
- `content.json`: contenido local y fallback.
- `data/config.json`: configuración legada, no usada por el flujo activo (ver `.claude/skills/asi-wp-headless/SKILL.md`).
- `admin/`: sistema administrativo local (`admin/admin.html` es el activo).
- `assets/`: imágenes, iconos y recursos.
- Páginas del sitio: `index.html`, `about.html`, `blog.html`, `project-page.html`, etc.

## Integración con WordPress — ya funcionando
El frontend consume contenido headless desde:

```js
http://asi-cms-website.local/wp-json/tatc/v1/content
```

`cms-engine.js` utiliza este flujo de datos:
1. Draft guardado en `localStorage`
2. API de WordPress headless
3. Fallback a `content.json`

WP es la fuente de verdad (siempre sobrescribe) para:
- `gallery_3d.artworks`
- `gallery_3d.audio_src`
- `projects.items`
- `projects_detail`

El detalle completo del esquema, el flujo de merge (incluida una trampa importante sobre cómo se reemplaza `projects_detail` por proyecto completo, no campo por campo) y las reglas de seguridad/commits están documentados en **`.claude/skills/asi-wp-headless/SKILL.md`** — consultar esa skill antes de tocar cualquier cosa relacionada con WordPress.

## WordPress local y estado actual
- WordPress instalado en: `/Users/darielcurbelo/Local Sites/asi-cms-website/app/public/`
- URL configurada: `http://asi-cms-website.local`
- Tema activo: **`tatc-headless`** (custom — implementa el endpoint REST en `functions.php`)
- Plugins activos: `advanced-custom-fields` (ACF free)

### Contenido existente en WordPress
- CPT `project`, 2 posts publicados: `a-sweet-kid` (tipo `standard`) y `a-sweet-kid-online` (tipo `virtual`).
- Imágenes y audio reales ya sideload-eados a la biblioteca de medios (portada, carrusel, las 3 obras de la galería 3D, audio ambiente).
- Un CPT `artwork` adicional (1 post) que no se usa en la respuesta actual del endpoint — código/datos legacy.

## Control de versiones y seguridad
### Git
Repositorios Git:
- CMS: `/Users/darielcurbelo/Documents/CMS ASI WEBSITE CONFIG/ASI TEST (A CMS)/`
- WordPress real (`asi-cms-website`): inicializado el 2026-06-17. Solo versiona el tema `tatc-headless` (ver su `.gitignore` — excluye core, plugins de terceros, `wp-content/uploads`).

### Repositorio remoto
- El proyecto CMS se subió a: `https://github.com/darielcurbelo26/cms-system-asi`
- No hay remote configurado todavía para el repo de WordPress.

### Copia de seguridad recomendada
Git cubre el tema, pero no la base de datos ni los medios.
Para una copia de seguridad completa se debe:
1. Código ya versionado con Git (tema `tatc-headless`).
2. Subir ese repo a un remoto (GitHub/GitLab/Bitbucket) si se quiere respaldo en la nube.
3. Exportar la base de datos periódicamente (no hay WP-CLI instalado; usar el PHP/MySQL embebidos de Local — ver rutas en la skill).
4. Respaldar `wp-content/uploads` si se usa contenido multimedia.

## Qué falta y próximos pasos
1. Probar la integración real del frontend contra el endpoint (sirviendo el sitio con un servidor estático, no `file://`).
2. Resolver el texto plano de `security.gate_password`/`page_passwords` antes de exponer el endpoint más ampliamente.
3. Configurar un remoto para el repo de WordPress si se desea respaldo en la nube.
4. Decidir si restringir el CORS del endpoint (`Access-Control-Allow-Origin: *` actualmente) a un dominio concreto antes de producción.
5. Limpiar la ruta hardcodeada al Desktop en el script de auto-migración de `functions.php` (ya no se usa, pero queda como deuda técnica).

## Notas adicionales
- Mantener `wp-content/uploads` fuera del repo Git.
- Incluir solo el tema/plugin custom en el control de versiones, no plugins de terceros ni el core de WordPress.
- Si se modifica el tema, registrar claramente esos cambios en commits y en esta documentación.

---

Fecha de creación: 2026-06-17
Última corrección de ruta de WordPress: 2026-06-17 (ver `.claude/skills/asi-wp-headless/SKILL.md`, sección "Incidente: ruta de WordPress equivocada")
