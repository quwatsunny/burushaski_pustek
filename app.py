import webview
import os
import json
import base64

from tools.build_from_csv import build_from_csv
from tools.build_from_lift import build_from_lift


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DICTS_DIR = os.path.join(BASE_DIR, 'dictionaries')


class API:
    def export_pdf(self, book_title, data_url):
        """
        Save PDF file sent from JS (data_url is a base64 data URL)
        """
        try:
            # Extract base64 from data URL
            if data_url.startswith('data:application/pdf;base64,'):
                data_base64 = data_url.split(',', 1)[1]
            else:
                return {"success": False, "error": "Invalid PDF data format"}

            filename = f"{book_title or 'Book'}.pdf"
            return self.save_export_file(filename, data_base64, 'pdf')
        except Exception as e:
            print(f"[API] Error exporting PDF: {e}")
            return {"success": False, "error": str(e)}

    def export_word(self, book_title, chapters):
        try:
            from tools.export_backend import export_word_py
            data_base64 = export_word_py(book_title, chapters)
            filename = f"{book_title or 'Book'}.docx"
            return self.save_export_file(filename, data_base64, 'docx')
        except Exception as e:
            print(f"[API] Error exporting Word: {e}")
            return {"success": False, "error": str(e)}

    def export_epub(self, book_title, chapters):
        try:
            from tools.export_backend import export_epub_py
            data_base64 = export_epub_py(book_title, chapters)
            filename = f"{book_title or 'Book'}.epub"
            # Save file using the same dialog logic
            return self.save_export_file(filename, data_base64, 'epub')
        except Exception as e:
            print(f"[API] Error exporting EPUB: {e}")
            return {"success": False, "error": str(e)}

    def test_api(self):
        print("test_api called")
        return "API is working"

    def __init__(self):
        self._window = None
    
    def set_window(self, window):
        """Set the window reference for file dialogs"""
        self._window = window
    
    def save_file(self, path, content):
        print("Saving file:", path)
        # If path is not absolute, save to Documents
        if not os.path.isabs(path):
            docs_folder = os.path.join(os.path.expanduser('~'), 'Documents')
            os.makedirs(docs_folder, exist_ok=True)
            path = os.path.join(docs_folder, path)
        else:
            os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return "saved"

    def build_dictionary(self, file_path, dialect):
        """
        Build dictionary from file and MERGE with existing dictionary.
        Returns count of new entries added.
        """
        print(f"\n{'='*60}")
        print(f"Building dictionary from {file_path} for dialect: {dialect}")
        print(f"{'='*60}")
        
        ext = file_path.split(".")[-1].lower()
        
        # Convert source file to word list
        try:
            if ext == "csv":
                new_words_path = build_from_csv(file_path, dialect)
            elif ext == "lift":
                new_words_path = build_from_lift(file_path, dialect)
            else:
                return {"error": "Unsupported file type (use CSV or LIFT)"}
            
            # Load the newly built words from the JSON file
            with open(new_words_path, "r", encoding="utf-8") as f:
                new_words = json.load(f)
            
            if not isinstance(new_words, list):
                return {"error": "Failed to extract words from file"}
            
            print(f"Extracted {len(new_words)} entries from file")
            print(f"First 5 entries: {new_words[:5]}")
        except Exception as e:
            print(f"Error building from file: {e}")
            return {"error": f"Error processing file: {str(e)}"}
        
        # Load existing dictionary
        dict_file = os.path.join(DICTS_DIR, f"{dialect}.json")
        existing_words = []
        existing_count = 0
        
        if os.path.exists(dict_file):
            with open(dict_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            existing_words = data if isinstance(data, list) else data.get("words", [])
            existing_count = len(existing_words)
            print(f"Existing dictionary has {existing_count} entries")
            print(f"First 5 existing: {existing_words[:5]}")
        
        # Find truly new entries
        existing_set = set(existing_words)
        new_set = set(new_words)
        truly_new = new_set - existing_set
        duplicates = new_set & existing_set
        
        print(f"\nMerge Analysis:")
        print(f"  New entries in file: {len(new_words)}")
        print(f"  Existing entries: {existing_count}")
        print(f"  Duplicates (already in dict): {len(duplicates)}")
        print(f"  Truly new entries: {len(truly_new)}")
        
        if truly_new:
            print(f"  First 5 new: {list(truly_new)[:5]}")
        
        # Merge: keep existing words and add new ones (avoid duplicates)
        merged_words = list(existing_set | new_set)
        merged_words.sort()  # Sort for consistency
        
        # Save merged dictionary
        with open(dict_file, "w", encoding="utf-8") as f:
            json.dump(merged_words, f, ensure_ascii=False, indent=2)
        
        print(f"\n✓ Dictionary saved with {len(merged_words)} total entries")
        print(f"{'='*60}\n")
        
        # Build user-friendly message
        if len(truly_new) == 0 and len(duplicates) > 0:
            message = f"✓ No new entries added ({len(duplicates)} entries were already in dictionary). Total: {len(merged_words)} words"
        elif len(truly_new) > 0 and len(duplicates) == 0:
            message = f"✓ Success! {len(truly_new)} new entries added. Total: {len(merged_words)} words"
        elif len(truly_new) > 0 and len(duplicates) > 0:
            message = f"✓ Success! {len(truly_new)} new entries added, {len(duplicates)} entries already in dictionary. Total: {len(merged_words)} words"
        else:
            message = f"Merge complete. Total: {len(merged_words)} words"
        
        return {
            "success": True,
            "total_words": len(merged_words),
            "new_entries": len(truly_new),
            "duplicates": len(duplicates),
            "existing_entries": existing_count,
            "extracted_from_file": len(new_words),
            "message": message
        }

    def load_dictionary(self, dialect):
        """
        Load dictionary for a given dialect and return as a list.
        This replaces fetch() on the JS side.
        """
        dict_file = os.path.join(DICTS_DIR, f"{dialect}.json")
        print(f"[API] Loading dictionary: {dict_file}")

        if not os.path.exists(dict_file):
            print(f"[API] Dictionary file not found: {dict_file}")
            return []

        try:
            with open(dict_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            print(f"[API] Loaded data type: {type(data)}")

            if isinstance(data, list):
                print(f"[API] Returning {len(data)} words from list")
                return data
            elif isinstance(data, dict) and isinstance(data.get("words"), list):
                print(f"[API] Returning {len(data['words'])} words from dict")
                return data["words"]
            else:
                print(f"[API] Unknown structure, returning empty list")
                return []
        except Exception as e:
            print(f"[API] Error loading dictionary: {e}")
            return []

    def save_export_file(self, filename, data_base64, file_type):
        """
        Save exported file (Word/PDF) with native file save dialog.
        data_base64: Base64-encoded file content
        file_type: 'docx' or 'pdf'
        Returns: path where file was saved, or error
        """
        print(f"[API] save_export_file called: {filename}, type: {file_type}")
        
        try:
            # Set up file type filter
            if file_type == 'docx':
                file_types = ('Word Documents (*.docx)',)
            elif file_type == 'pdf':
                file_types = ('PDF Documents (*.pdf)',)
            else:
                file_types = ('All files (*.*)',)
            
            # Use file dialog if window is available
            save_path = None
            if self._window:
                result = self._window.create_file_dialog(
                    webview.SAVE_DIALOG,
                    save_filename=filename,
                    file_types=file_types
                )
                if result:
                    save_path = result if isinstance(result, str) else result[0]
            
            # If dialog was cancelled or no window, fall back to Documents
            if not save_path:
                docs_folder = os.path.join(os.path.expanduser('~'), 'Documents')
                os.makedirs(docs_folder, exist_ok=True)
                save_path = os.path.join(docs_folder, filename)
                
                # If file exists, add a number suffix
                base_name = filename.rsplit('.', 1)[0]
                extension = filename.rsplit('.', 1)[1] if '.' in filename else file_type
                counter = 1
                while os.path.exists(save_path):
                    save_path = os.path.join(docs_folder, f"{base_name}_{counter}.{extension}")
                    counter += 1
            
            # Decode base64 and write file
            file_bytes = base64.b64decode(data_base64)
            with open(save_path, 'wb') as f:
                f.write(file_bytes)
            
            print(f"[API] File saved to: {save_path}")
            return {"success": True, "path": save_path}
            
        except Exception as e:
            print(f"[API] Error saving export file: {e}")
            return {"error": str(e)}


if __name__ == "__main__":
    api = API()
    
    # Launch with the book editor window
    start_url = "ui/editor.html"

    window = webview.create_window(
        "Girmin",
        start_url,
        js_api=api,
        width=1000,
        height=800
    )

    # Set window reference in API for file dialogs
    api.set_window(window)

    webview.start(debug=True)