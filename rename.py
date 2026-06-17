import os
import glob
import re

html_replacements = {
    'main-container': 'page-wrapper',
    'inner-navbar-right': 'nav_menu-container',
    'inner-navbar': 'nav_container',
    'right-navbar': 'nav_menu',
    'navbar-text': 'text-style-nav',
    'navbar-link': 'nav_link',
    'nav-links': 'nav_list',
    'navbar': 'nav_component',
    'burger': 'nav_button',
    'social-icon': 'social_link',
    'socials': 'social_list',
    'hero-subtext': 'heading-style-h2',
    'hero-text': 'heading-style-h1',
    'hero': 'section_hero',
    'column-layout': 'layout_stack',
    'limit-width': 'container-medium',
    'text-description': 'text-size-regular',
    'content-label': 'text-style-label',
    'text-block': 'margin-bottom margin-medium',
    'bottom-left-wrapper': 'fixed-controls_component',
    'status-cube': 'icon-button is-cube',
    'status-square': 'icon-button is-square',
    'status-hollow-square': 'icon-button is-hollow',
    'artist-name': 'heading-style-h1 is-artist',
    'artist-bio-fluid': 'text-size-regular is-fluid',
    'content-bottom-wrapper': 'layout_bottom',
    'padding-2rem': 'padding-global',
    'body-fixed': 'body_fixed',
    'no-fixed': 'body_no-fixed'
}

css_js_replacements = {
    k: k for k in html_replacements
}

# Add dots for CSS semantics to safely replace.
css_js_replacements_dot = {
    '.' + k: '.' + v.replace(' ', '.') for k, v in html_replacements.items()
}

files = glob.glob('*.html') + glob.glob('*.css') + glob.glob('*.js')

# Sort to replace longer strings first to avoid partial replacements (e.g. hero vs hero-text)
sorted_html_keys = sorted(html_replacements.keys(), key=len, reverse=True)
sorted_css_keys = sorted(css_js_replacements_dot.keys(), key=len, reverse=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()

    if file.endswith('.html'):
        for k in sorted_html_keys:
            v = html_replacements[k]
            # using regex with word boundary to avoid replacing e.g. .hero-text when k='hero'
            content = re.sub(r'\b' + re.escape(k) + r'\b', v, content)
            
    elif file.endswith('.css'):
        for k in sorted_css_keys:
            v = css_js_replacements_dot[k]
            content = content.replace(k, v)
            
    elif file.endswith('.js'):
        for k in sorted_css_keys:
            v = css_js_replacements_dot[k]
            content = content.replace(k, v)
        for k in sorted_html_keys:
            v = html_replacements[k]
            # In JS files, replace both dot syntax and bare strings in quotes
            content = content.replace(f"'{k}'", f"'{v}'")
            content = content.replace(f'"{k}"', f'"{v}"')

    with open(file, 'w') as f:
        f.write(content)

print(f"Updated {len(files)} files.")
