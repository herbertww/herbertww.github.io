# herbertww.github.io

Personal site for Herbert Eng — Chief Growth Officer at QPin, founder of CounterBank and Tukang.

Static HTML/CSS/JS, no build step. Served by GitHub Pages from the `main` branch root.

```
index.html          the whole page
assets/styles.css   light + dark, editorial layout
assets/main.js      theme toggle, scroll reveal
```

## Local preview

Open `index.html` directly, or:

```
python -m http.server 8080
```

## Deploy

Push to `main`. GitHub Pages rebuilds within a minute.

## Custom domain

Add a `CNAME` file at the repo root containing the bare domain, then point the DNS
`ALIAS`/`A` records at GitHub Pages.
