# Ricci Oriach Website

Static multi-page site for the Dominican artist Riccie Oriach, built with vanilla HTML, CSS, and a sprinkle of JS for background animation and navigation toggles.

## Pages
- **Homepage (`index.html`)**: Hero with Spotify embed, tour callout, and quick links.
- **Music (`music.html`)**: Featured album highlight plus discography grid.
- **Merch (`merch.html`)**: Product gallery with hover zoom and CTA buttons.
- **Blog (`blog.html`)**: Articles list with the FOLCLORE/BITÁCORA hero.
- **Contact (`contact.html`)**: Booking info and social links.

## Visual System
- Palette: Rojo Vino background with Rosa Guayaba accents and Amarillo Sol highlights.
- Typography: `Abril Fatface` for display, `Outfit` for body text.
- Effects: Glassmorphic panels, outlined/filled headings, and a floating particle canvas background on every page.

## Running Locally
Open any HTML file directly in your browser; no build step or server is required.

## Customizing
- **Brand colors**: Adjust CSS variables (`--color-primary`, `--color-secondary`, `--color-accent`, etc.) in the `<style>` blocks near the top of each HTML file.
- **Background animation**: The particle canvas script sits before each page’s closing `</body>` tag; tweak particle counts or speeds there.
- **Navigation**: Update header links in the `<nav>` element if you add or rename pages.

## Assets
Key images live in the `assets/` folder and can be swapped for new art or photography as desired.
