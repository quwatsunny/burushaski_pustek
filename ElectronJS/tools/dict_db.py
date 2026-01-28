# Toggle enable/disable state for a dictionary
def toggle_dictionary(filename):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT enabled FROM dictionaries WHERE filename = ?', (filename,))
    row = c.fetchone()
    if row is not None:
        new_state = 0 if row[0] else 1
        c.execute('UPDATE dictionaries SET enabled = ? WHERE filename = ?', (new_state, filename))
        conn.commit()
        conn.close()
        return bool(new_state)
    conn.close()
    return None

# Delete a dictionary record and (optionally) the file
def delete_dictionary(filename):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('DELETE FROM dictionaries WHERE filename = ?', (filename,))
    conn.commit()
    conn.close()
    # Optionally, delete the file from disk
    dict_path = os.path.join(os.path.dirname(BASE_DIR), 'dictionaries', filename)
    if os.path.exists(dict_path):
        try:
            os.remove(dict_path)
        except Exception:
            pass
    return True
import sqlite3
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'dictionaries.db')

# Initialize the database and create the table if it doesn't exist
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS dictionaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            language TEXT,
            code TEXT,
            region TEXT,
            script TEXT,
            filename TEXT UNIQUE,
            enabled INTEGER DEFAULT 1
        )
    ''')
    conn.commit()
    conn.close()

# Example function to add a dictionary metadata record
def add_dictionary(language, code, region, script, filename, enabled=True):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT OR REPLACE INTO dictionaries (language, code, region, script, filename, enabled)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (language, code, region, script, filename, int(enabled)))
    conn.commit()
    conn.close()

# Example function to list all dictionaries
def list_dictionaries():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT language, code, region, script, filename, enabled FROM dictionaries')
    rows = c.fetchall()
    conn.close()
    return [
        {
            'language': row[0],
            'code': row[1],
            'region': row[2],
            'script': row[3],
            'filename': row[4],
            'enabled': bool(row[5])
        } for row in rows
    ]

if __name__ == "__main__":
    init_db()
    # Example usage
    add_dictionary('Burushaski', 'bsk', 'Hunza', 'Arab', 'Burushaski-bsk_Hunza.json', True)
    print(list_dictionaries())
