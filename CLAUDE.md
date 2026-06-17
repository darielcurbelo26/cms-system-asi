# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is a static, vanilla-JS/HTML/CSS frontend (brand **TATC** / artist **ISEEASI**) that is being migrated to pull its content from a **headless WordPress** instance instead of hardcoded data. There is no `package.json`, `composer.json`, or build tooling — every page is plain HTML loading plain `<script>` tags.

Two related repos exist on this machine:
- This CMS frontend (current repo), pushed to `https://github.com/darielcurbelo26/cms-system-asi`.
- The WordPress install consumed by this frontend: **`/Users/darielcurbelo/Local Sites/asi-cms-website/app/public/`** (separate git repo, initialized 2026-06-17, no remote configured yet, only the `tatc-headless` theme is tracked). Do not confuse this with `/Users/darielcurbelo/Documents/Wordpress_Local/test_1/app/public/` — that is an unrelated Local site (Elementor only, no "tatc" anything); an earlier version of this repo's docs incorrectly pointed there. Always verify the real docroot via `~/Library/Application Support/Local/run/*/conf/nginx/site.conf` (the `root` line) before assuming a path.

Never mix changes from both repos into one commit — they are versioned independently.

## Running locally

There is no build step and no test/lint command configured. Serve this directory with any static file server so the `fetch()` calls in `cms-engine.js`/`script.js` can resolve relative URLs (opening the HTML files directly via `file://` breaks those fetches), e.g.:

```
python3 -m http.server 8080
```

## Content pipeline architecture

This is the part that spans multiple files and is easy to get wrong:

- Any element with `data-cms="path.to.key"` gets its `innerHTML` replaced by `cms-engine.js` walking a dot-path into a content object (`data-cms-attr="href"` sets an attribute instead; `<title>` is a special case that sets `document.title`).
- Load priority inside `cms-engine.js`:
  1. Admin draft from `localStorage['tatc_cms']`.
  2. Live fetch from the WordPress headless REST endpoint `http://asi-cms-website.local/wp-json/tatc/v1/content`.
  3. Fallback to the local `content.json` if the WP fetch fails.
- When the WP fetch succeeds, it is **not** a full overwrite: most top-level keys from WP only fill in keys missing from the draft, but `gallery_3d.artworks`, `gallery_3d.audio_src`, `projects.items`, and `projects_detail` are always overwritten by WP — these four are WP's source of truth. See the merge logic in `cms-engine.js`.
- `content.json` defines the authoritative shape of all content (`global`, `home`, `blog`, `post`, `projects`, `projects_detail`, `gallery_3d`, `typography`, `artist`, `security`). Any change to the future WP REST response, or to the admin export, must keep this exact key structure or `cms-engine.js`'s dot-path lookups will silently return `undefined`.
- The WP REST endpoint (`/wp-json/tatc/v1/content`) already exists and works, implemented in the `tatc-headless` theme's `functions.php` on the separate WordPress repo. It loads its own bundled copy of `content.json` as a base and only overwrites the four WP-source-of-truth paths above. See `.claude/skills/asi-wp-headless/SKILL.md` for the full contract, field names, and a documented merge-logic gotcha (`projects_detail` is replaced whole-object-per-slug, not merged field-by-field).
- `script.js` independently re-fetches `/content.json` directly (for the page-gating/"security" feature) rather than going through `cms-engine.js`. It does **not** see the localStorage draft or WP data — only the static file. Keep this in sync if `security.*` content ever needs to be editable via WP/admin.

## Admin tooling — two parallel systems, only one is live

- `admin/admin.html` is the active editor: its inline `<script>` block loads `../content.json`, lets you edit fields, saves a draft to `localStorage['tatc_cms']` (the same key `cms-engine.js` reads), and can export an updated `content.json`.
- `admin/admin-system.js` + `admin/admin.css` implement a second admin panel keyed off `data/config.json`, but neither file is referenced by any `<script>`/`<link>` tag anywhere in the repo. Treat this pair as legacy/unused — don't assume it runs, and don't extend it unless asked to revive it.

## Claude Code skills in this repo

`.claude/skills/` contains:
- `asi-wp-headless` — the project-specific skill for this content pipeline: full content schema, merge-priority gotchas, markup conventions, the real WordPress path/theme, commit/publish/security rules. Read this first for anything touching `cms-engine.js`, `content.json`, or the WordPress side.
- WordPress-topic skills (`wp-rest-api`, `wp-plugin-development`, `wp-block-development`, `wp-block-themes`, `wp-performance`, `wp-phpstan`, `wp-interactivity-api`, `wp-abilities-*`, `wp-wpcli-and-ops`, `wp-playground`, `wp-project-triage`, `wp-plugin-directory-guidelines`, `wordpress-router`, `wpds`, `blueprint`). Consult the relevant one before doing WordPress-side work.
- GSAP animation skills (`gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance`, `gsap-utils`, `gsap-react`, `gsap-frameworks`; indexed in `llms.txt`). Relevant because this project already drives page transitions in `script.js` and the gallery in `carousel.js` with GSAP loaded from a CDN `<script>` tag (no npm package).
