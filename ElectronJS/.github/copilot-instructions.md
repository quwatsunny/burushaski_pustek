# Copilot Instructions for Burushaski Pustek (ElectronJS + Flask)

## Project Overview
- **Purpose:** Desktop app for writing books in minority languages, with custom dictionary support and IPA conversion.
- **Architecture:**
  - **Flask backend** (`app.py`): Serves API and static files from `ui/`.
  - **Electron frontend** (`main.js`): Loads Flask UI as a desktop app, enables native features.
  - **UI** (`ui/`): HTML/JS/CSS for book editing, dictionary management, and export.
  - **Dictionary tools** (`tools/`): Scripts for building and exporting dictionaries.

## Key Workflows
- **Start backend:** `python app.py` (serves at http://localhost:5000)
- **Install frontend deps:** `npm install`
- **Start Electron app:** `npm start` (loads Flask UI in desktop window)
- **Build Python app:** PyInstaller spec in `app.spec` (output in `build/`)

## Project-Specific Patterns
- **Custom dictionaries:** Place JSON files in `dictionaries/`. Managed via UI and `tools/` scripts.
- **UI assets:** All JS/CSS in `ui/assets/`. Main editor logic in `editor.js`.
- **Electron integration:** `main.js` can be extended for native menus/dialogs. Default loads Flask at `localhost:5000`.
- **Export features:** Book export (PDF, EPUB) handled by scripts in `tools/` and UI JS.
- **Dialect rules:** Extendable via `tools/dialect_rules/` (e.g., `hunza.py`, `nagar.py`).

## Conventions & Tips
- **Backend/frontend separation:** Communicate via HTTP (no direct imports).
- **Add new language/dialect:** Add rules in `tools/dialect_rules/` and dictionary JSON in `dictionaries/`.
- **UI changes:** Edit HTML in `ui/`, JS in `ui/assets/js/`, CSS in `ui/assets/css/`.
- **Debug Electron:** Use DevTools (Ctrl+Shift+I in app window).
- **Reset codebase:** See README for git reset instructions.

## Key Files/Dirs
- `app.py`, `main.js`, `ui/`, `tools/`, `dictionaries/`, `build/`

For more, see README.md or code comments in each major file.
