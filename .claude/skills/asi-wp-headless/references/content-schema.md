# Esquema detallado de content.json

Contrato de forma completo. El endpoint `/wp-json/tatc/v1/content` debe devolver un JSON cuyas secciones, cuando estén presentes, respeten exactamente esta forma.

## global

```
global.brand            string
global.tagline          string
global.year             string
global.nav.blog         string
global.nav.projects     string
global.nav.info         string
global.social.twitter   string (url)
global.social.email     string (mailto:)
global.social.instagram string (url)
```

## home

```
home.meta_title        string
home.loader_text        string
home.loader_skip_label  string
home.hero_headline      string
```

## blog

```
blog.meta_title   string
blog.page_label   string
blog.page_title   string
blog.posts[]       array de:
  slug    string (clave usada para enlazar con post.posts{slug})
  date    string (formato libre, ej. "15.03.26")
  title   string
  summary string
  url     string (ej. "post.html?slug=post-1")
```

## post

```
post.posts{}            objeto indexado por slug (debe existir un slug por cada item de blog.posts[])
post.posts{slug}.meta_title     string
post.posts{slug}.date           string
post.posts{slug}.subject        string
post.posts{slug}.title          string
post.posts{slug}.body[]          array de bloques, cada uno con "type":
  { "type": "paragraph", "text": string }
  { "type": "image", "src": string, "alt": string, "caption": string }
  { "type": "pullquote", "text": string }
post.posts{slug}.footer_label   string
post.posts{slug}.footer_credit  string
```

## projects — fuente de verdad: WordPress

```
projects.meta_title  string
projects.items[]      array de:
  id     number
  src    string (imagen) — opcional si se usa iframe
  iframe string (ruta a un .html embebido) — opcional, alternativa a src
  title  string
  desc   string
  date   string
  loc    string
  link   string (página de detalle)
```

## projects_detail — fuente de verdad: WordPress (merge por clave, no reemplazo total)

```
projects_detail{}                  objeto indexado por slug de proyecto
projects_detail{slug}.meta_title         string
projects_detail{slug}.title              string
projects_detail{slug}.subtitle           string
projects_detail{slug}.date               string
projects_detail{slug}.location           string
projects_detail{slug}.medium             string
projects_detail{slug}.body[]              array de strings (párrafos)
projects_detail{slug}.immersive_url       string — opcional
projects_detail{slug}.immersive_cta_label string — opcional
projects_detail{slug}.gallery_images[]    array de strings (rutas de imagen)
```

## gallery_3d — fuente de verdad: WordPress (`artworks`, `audio_src`)

```
gallery_3d.meta_title                 string
gallery_3d.hud_label                  string
gallery_3d.loader_text                string
gallery_3d.return_label               string
gallery_3d.audio_src                  string (url de audio)
gallery_3d.light_default_intensity    number
gallery_3d.credits                    string
gallery_3d.artworks[]                  array de:
  id    number
  wall  string ("front" | "left" | "right")
  title string
  alt   string
  src   string (ruta de imagen)
```

## typography

```
typography.<rol>.font_size       string (css)
typography.<rol>.font_weight     string
typography.<rol>.letter_spacing  string (css)
typography.<rol>.text_transform  string ("uppercase" | "none")
typography.<rol>.font_family     string
```
Roles usados actualmente: `heading_h1`, `heading_h2`, `nav`, `body`, `label`.

## artist

```
artist.meta_title  string
artist.label        string
artist.name          string
artist.bio1          string
artist.bio2          string
```

## security

```
security.gate_password       string — ⚠️ texto plano, ver reglas de seguridad en SKILL.md
security.gate_title           string
security.gate_description     string
security.pages{}              objeto: nombre de archivo .html → "public" | "private"
security.page_passwords{}     objeto: nombre de archivo .html → string (password específica de esa página, puede ir vacía)
```
