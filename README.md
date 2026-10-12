# TaskFlow

A frontend-only task manager built with HTML, CSS and vanilla JavaScript. Fictional demo user and sample tasks are shown on first visit and labelled as demo data.

## Features
- Overview dashboard: greeting, stats, Today's Focus, upcoming deadlines, real activity feed, weekly completion chart
- Tasks: add/edit/delete (with confirmation), search by title, filter by status/priority/category, sort, clear filters
- Kanban board with drag-and-drop and a status `<select>` as the accessible alternative
- Monthly calendar with today highlight, month navigation, clickable tasks
- Completed view with search and restore to To Do / In Progress
- Settings: light/dark theme, default priority, first day of week, restore demo data (with confirmation)
- Accessibility: semantic HTML, native `<dialog>` modals, labelled fields, visible focus, reduced-motion support, status shown as text as well as colour

## Technologies
HTML5, CSS3 (custom properties for theming), vanilla JavaScript. Icons are inline SVGs in Lucide style, so no CDN is needed.

## File structure
```
index.html   markup, modals
style.css    design tokens, layout, dark theme, responsive rules
script.js    state, rendering, event handling, storage
README.md
```

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit http://localhost:8000.

## Publish on GitHub Pages
1. Push the four files to a GitHub repository.
2. Settings → Pages → Source: Deploy from a branch → `main` / root.
3. Visit the URL GitHub shows after the build finishes.

## How localStorage works
Keys `taskflow.tasks`, `taskflow.settings` and `taskflow.activity` store JSON in your browser. Data is validated on load; malformed entries are dropped or reset to defaults. Dates are stored as local `YYYY-MM-DD` strings to avoid timezone shifts.

## Limitations
Data lives only in one browser on one device: no sync, accounts or backup, and clearing site data erases it. No real notifications. Drag-and-drop is for mouse devices; touch users use the status menu.
