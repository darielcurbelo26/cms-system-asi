/**
 * cms-engine.js — TATC Content Engine v2
 *
 * Priority: localStorage draft (admin edits) → content.json → fallback
 *
 * Usage:
 *   data-cms="path.to.key"          → sets innerHTML
 *   data-cms-attr="href"            → sets attribute instead
 *
 * Admin saves via: localStorage.setItem('tatc_cms', JSON.stringify(data))
 */
(function () {
  function get(obj, path) {
    return path.split('.').reduce((a, k) => a && a[k], obj);
  }

  function inject(el, value) {
    const attr = el.getAttribute('data-cms-attr');
    if (attr)                   el.setAttribute(attr, value);
    else if (el.tagName==='TITLE') document.title = value;
    else                        el.innerHTML = value;
  }

  function hydrate(data) {
    document.querySelectorAll('[data-cms]').forEach(el => {
      const path  = el.getAttribute('data-cms');
      const value = get(data, path);
      if (value !== undefined && typeof value !== 'object') inject(el, String(value));
    });
    window.TATC_CONTENT = data;
    document.dispatchEvent(new CustomEvent('cms:ready', { detail: data }));
  }

  async function init() {
    let data = null;

    // 1 — Admin draft (localStorage) takes priority for general content
    try {
      const draft = localStorage.getItem('tatc_cms');
      if (draft) data = JSON.parse(draft);
    } catch(e) {}

    // 2 — Fetch from WordPress Headless API
    try {
      let res = await fetch('https://throughalltheclutter.com/cms/wp-json/tatc/v1/content?t=' + Date.now());
      if (res.ok) {
        const fresh = await res.json();
        if (!data) {
          data = fresh;
        } else {
          // Merge missing top-level keys from WP
          Object.keys(fresh).forEach(k => { if (!(k in data)) data[k] = fresh[k]; });
          
          // WP is the source of truth for 3D gallery
          if (fresh.gallery_3d && fresh.gallery_3d.artworks) {
            if (!data.gallery_3d) data.gallery_3d = {};
            data.gallery_3d.artworks = fresh.gallery_3d.artworks;
          }
          if (fresh.gallery_3d && fresh.gallery_3d.audio_src) {
            data.gallery_3d.audio_src = fresh.gallery_3d.audio_src;
          }
          
          // WP is also the source of truth for the appended projects list!
          if (fresh.projects && fresh.projects.items) {
            if (!data.projects) data.projects = {};
            data.projects.items = fresh.projects.items;
          }
          if (fresh.projects_detail) {
            if (!data.projects_detail) data.projects_detail = {};
            Object.assign(data.projects_detail, fresh.projects_detail);
          }
        }
      }
    } catch(e) {
      console.warn('[CMS] WP Headless API unavailable, falling back to local content.json');
      try {
        const fallbackRes = await fetch('content.json?t=' + Date.now());
        if (fallbackRes.ok) {
          const fresh = await fallbackRes.json();
          if (!data) {
            data = fresh;
          } else {
            Object.keys(fresh).forEach(k => { if (!(k in data)) data[k] = fresh[k]; });
          }
        }
      } catch(err) {}
    }

    if (!data) { console.warn('[CMS] No content loaded.'); return; }
    hydrate(data);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
