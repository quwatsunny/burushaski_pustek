# Burushaski Pustek -Software

This project was initiated for the Burusho Community to write books in the Burushaski language. It has now been expanded to other languages. Any minority language can use it to write books. The two unique things about this project are:

You can upload a custom dictionary of the minority language for spelling checks and auto completion of words which ensures speeed and accuracy.
You can select any text and convert to IPA

## How to Run

### 1. Start the Flask Backend

Open a terminal and run:

```
python app.py
```

This should start your Flask server at http://localhost:5000 (adjust if your port is different).

### 2. Install Node.js Dependencies

Open another terminal in this folder and run:

```
npm install
```

### 3. Start the Electron App

After installing dependencies, run:

```
npm start
```

This will open the Electron desktop window, loading your Flask app UI.

## Notes
- The Electron app loads http://localhost:5000 by default. Change this in main.js if your Flask server uses a different port.
- All your UI files in the ui/ folder are still served by Flask.
- You can use Electron features (menus, dialogs, etc.) by extending main.js.
