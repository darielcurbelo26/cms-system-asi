# Guía simple para poner esto en línea de verdad

Esta guía te lleva paso a paso para que tu web y WordPress queden funcionando en internet, con tu propio dominio. Está escrita para que la puedas seguir aunque no seas la persona técnica.

## La idea en una frase

Todo va en **un solo hosting** y **un solo dominio**:
- `tudominio.com` → tu web (lo que ve la gente)
- `tudominio.com/cms` → WordPress (donde tú editas el contenido)

Así no tienes que pagar ni administrar dos cosas separadas, y evitamos un problema técnico (CORS) que nos hubiera dado dolores de cabeza si los separábamos.

## Cuánto cuesta (aproximado)

| Cosa | Costo |
|---|---|
| Dominio (ej. `tatc.com`) | $10–15 al año |
| Hosting | $3–8 al mes ($36–96 al año) |
| **Total** | **~$50–110 al año** |

Son precios de referencia — confirma el precio real con el proveedor antes de pagar, y mira cuánto cuesta la **renovación** (suele subir después del primer año).

> 💡 **Nota sobre los pasos técnicos (4, 5 y 6):** no es obligatorio hacerlos a mano. Si tu desarrollador tiene acceso **SSH/SFTP** y a la base de datos del hosting, puede hacer esos pasos directamente desde su computadora — solo necesita que le compartas esos accesos una vez tengas la cuenta de hosting.

---

## Paso 1 — El dominio

**Si ya tienes un dominio** (por ejemplo, registrado o conectado en Squarespace, como en este caso): no necesitas comprar uno nuevo. Solo hay que "redirigirlo" para que apunte al hosting nuevo — ver el Paso 1b más abajo.

**Si todavía no tienes ninguno**: entra a [Namecheap](https://www.namecheap.com) (o Cloudflare), busca el nombre que quieras, y cómpralo. Eso es todo, no necesitas nada más de ahí.

### Paso 1b — Si tu dominio está en Squarespace

"Redirigir" el dominio no significa transferirlo ni perderlo — solo se cambia a dónde apunta.

1. Entra a tu cuenta de Squarespace → **Settings → Domains** → clic en el dominio. Ahí confirmas si dice "registrado en Squarespace" o "conectado desde otro lugar" (avísale a tu desarrollador cuál de las dos dice).
2. En esa misma pantalla, busca **DNS Settings** (o "Advanced Settings"). Ahí se cambian los registros DNS para que apunten al hosting nuevo — tu desarrollador te dice exactamente qué valor poner una vez tengan la cuenta de Hostinger lista.
3. En cuanto se actualice el DNS, el sitio viejo de Squarespace deja de verse en ese dominio (la suscripción de Squarespace no se cancela sola, eso es aparte).
4. **Posible ahorro**: como ya no vas a usar el editor de sitios de Squarespace, revisa **Settings → Billing** ahí — probablemente puedes cancelar o bajar el plan del "sitio web" (la parte cara) y quedarte solo pagando el dominio (mucho más económico).

## Paso 2 — Compra el hosting

Entra a [Hostinger](https://www.hostinger.com) (u otro hosting compartido económico) y compra el plan más básico. Antes de pagar, fíjate que diga:
- PHP 8.0 o más nuevo (este proyecto lo necesita).
- Certificado SSL gratis incluido (el "candado" de sitio seguro). Casi todos lo incluyen hoy.

## Paso 3 — Instala WordPress dentro de una carpeta (no en la raíz)

Casi todo hosting tiene un botón de "Instalar WordPress" en su panel. Cuando te pregunte en qué carpeta instalarlo, escribe **`cms`** (no lo dejes en la raíz). Así WordPress queda en `tudominio.com/cms` y deja libre `tudominio.com` para tu web.

(Usamos "cms" y no "admin" para no confundirlo con `wp-admin`, que es la pantalla de login que WordPress ya trae por su cuenta — vas a entrar a editar en `tudominio.com/cms/wp-admin`.)

## Paso 4 — Sube tu web a la carpeta principal

Con el administrador de archivos del hosting (o un programa de FTP como FileZilla), sube **todos los archivos de este proyecto** (los `.html`, `.js`, `.css`, la carpeta `assets/`, etc. — todo excepto la carpeta donde quedó WordPress) a la carpeta raíz del hosting (normalmente se llama `public_html`).

## Paso 5 — Trae tu WordPress real (con los proyectos ya cargados) desde tu computadora

El WordPress que instalaste en el Paso 3 está vacío. El que ya tiene tus proyectos, imágenes y configuración está en tu Mac (en Local). Hay que moverlo:

1. Desde Local, exporta la base de datos del sitio `asi-cms-website` (un archivo `.sql`).
2. Sube (reemplazando lo que ya había) las carpetas `wp-content/themes/tatc-headless/` y `wp-content/plugins/advanced-custom-fields/`, y también `wp-content/uploads/` (ahí están las imágenes y el audio reales).
3. Importa el `.sql` del paso 1 en la base de datos del hosting nuevo (usando phpMyAdmin, que viene en el panel del hosting).
4. WordPress guarda su propia dirección web dentro de la base de datos. Hay que decirle que cambió, con un comando llamado "buscar y reemplazar" (lo hace un plugin como "Better Search Replace" desde adentro de WordPress, sin tocar nada técnico):
   - Buscar: `http://asi-cms-website.local`
   - Reemplazar con: `https://tudominio.com/cms`
5. Activa el tema y el plugin ACF desde el panel de WordPress si no quedaron activos solos.

## Paso 6 — Avisa a tu web cuál es la nueva dirección de WordPress

En el archivo `cms-engine.js` (y en cualquier otro archivo donde aparezca esa misma dirección — puedes buscar "asi-cms-website.local" en todos los archivos para encontrarlos todos) cambia:
- `http://asi-cms-website.local` → `https://tudominio.com/cms`

Guarda, sube el cambio a GitHub, y luego sube ese mismo archivo actualizado al hosting (Paso 4, otra vez, solo ese archivo).

## Paso 7 — Seguridad antes de avisarle a la gente que el sitio existe

1. Los passwords de páginas protegidas ya no viven en `content.json` — se gestionan en `tudominio.com/cms/wp-admin`, sección **Page Gates**. Revisa que la entrada de cada página protegida tenga el password que quieres antes de anunciar el sitio.
2. Abre `https://tudominio.com` en el navegador y confirma que aparece el candado de "sitio seguro", sin advertencias.

## Paso 8 — Agrega métricas de visitas (recomendado)

Los plugins de WordPress no te dicen cuánta gente visita tu web real (solo lo que pasa dentro de WordPress). Para ver visitas de verdad:
1. Crea una cuenta gratis en [Google Analytics](https://analytics.google.com) (o, más simple y privado, [Plausible](https://plausible.io)).
2. Te dan un pequeño código para pegar en tus páginas. Avísame cuando llegues aquí y te lo agrego yo en el sitio.

## Paso 9 — Prueba todo

Repite estas 3 pruebas, ahora contra tu dominio real:
1. Abre el sitio normal y confirma que los proyectos y la galería 3D se ven bien.
2. Apaga WordPress un momento (o entra antes de tenerlo listo) y confirma que el sitio sigue funcionando igual (sin errores ni pantallas en blanco).
3. Recorre el carrusel y la galería 3D completas.

## Paso 10 — Tu día a día de ahí en adelante

- **Proyectos, galería 3D, audio**: los editas entrando a `tudominio.com/cms/wp-admin`. Se actualizan solos en la web, sin tocar código.
- **Todo lo demás** (textos generales, blog, biografía, etc.): se edita igual que ahora, con `admin/admin.html` en tu computadora, y subiendo el archivo actualizado tanto a GitHub (para guardarlo) como al hosting (para que se vea en vivo).
- **Copias de seguridad**: el código ya queda guardado en GitHub. La base de datos y las imágenes de WordPress no — revisa si tu plan de hosting incluye copias de seguridad automáticas (muchos sí), o prográmalas tú mismo.
