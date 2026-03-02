# Project Context

## Stack
- HTML
- CSS
- JavaScript
- Google Fonts: Manrope
- Header/footer partial loading via `fetch()`

## Deployment
- Not configured in current project files

## Typography System
- Font family: `--ff-manrope: "Manrope", system-ui, -apple-system, "Segoe UI", Arial, sans-serif`
- Font sizes:
  - `--fs-10: 0.625rem`
  - `--fs-12: 0.75rem`
  - `--fs-14: 0.875rem`
  - `--fs-16: 1rem`
  - `--fs-24: 1.5rem`
- Line heights:
  - `--lh-120: 1.2`
  - `--lh-140: 1.4`
  - `--lh-150: 1.5`
- Letter spacing:
  - `--ls-30: 0.30em`
  - `--ls-16: 0.16em`
  - `--ls-08: 0.08em`
  - `--ls-02: 0.02em`
  - `--ls-00: 0em`
- Weights:
  - `--fw-regular: 400`
  - `--fw-medium: 500`
  - `--fw-semibold: 600`

## Color System
- `--c-black: #313437`
- `--c-black-rgb: 49, 52, 55`
- `--c-smoke: #d3d8d6`
- `--c-white: #f5f2ef`
- `--c-gray: #999999`
- `--c-menu-overlay: #8f8d8b`

## Coverage
- Implemented pages:
  - `index.html`
  - `about.html`
  - `contacts.html`
  - `collections/collection-1.html`
  - `collections/collection-2.html`
  - `collections/collection-3.html`
  - `collections/collection-4.html`
  - `collections/collection-5.html`
- Implemented sections:
  - `header`
  - `hero`
  - `about`
  - `about-hero`
  - `about-content`
  - `contacts-main`
  - `contacts-details`
  - `collection-hero`
  - `collection-content`
  - `footer`
  - mobile menu
- Mobile coverage:
  - `header`
  - mobile menu
  - `hero`
  - `about`
  - `about.html`
  - `contacts.html`
  - `collections/*.html`
- Missing sections:
  - `systems` content
  - `service` content

## Layout System
- Container max width: `--grid-max: 1440px`
- Spacing:
  - `--space-xs: 8px`
  - `--space-sm: 16px`
  - `--space-md: 32px`
  - `--space-lg: 64px`
  - `--space-xl: 120px`
- Global container: `max-width: 1440px; padding-left/right: 120px`
- Mobile container: `padding-left/right: 24px`
- Hero/About vertical spacing: `60px 0` desktop, `64px 0` mobile
- Page template: `body.page-template` with smoke background
- Inner pages main wrapper: `.page-template__main`

## Project Structure
- Root:
  - `index.html`
  - `about.html`
  - `contacts.html`
- CSS:
  - `css/tokens.css`
  - `css/base.css`
  - `css/layout.css`
  - `css/components.css`
  - `css/animations.css`
- JavaScript:
  - `js/main.js`
- Partials:
  - `partials/header.html`
  - `partials/footer.html`
- Collections:
  - `collections/collection-1.html`
  - `collections/collection-2.html`
  - `collections/collection-3.html`
  - `collections/collection-4.html`
  - `collections/collection-5.html`
- Main sections in `index.html`:
  - `hero`
  - `about`
  - `systems`
  - `service`
