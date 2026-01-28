import csv
import json
import os
import tempfile
from tools.dialect_rules import hunza, nagar, yasin

def build_from_csv(path, dialect):
    """
    Convert CSV file to word list for a specific dialect.
    Returns path to temporary JSON file with extracted words.
    Does NOT overwrite the actual dictionary file - that's done by merge logic.
    """
    words = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and row[0].strip():
                words.append(row[0].strip())

    transform = {
        "hunza": hunza.transform,
        "nagar": nagar.transform,
        "yasin": yasin.transform
    }[dialect]

    final_words = transform(words)

    # Create temporary file to store extracted words
    # The actual dictionary merge happens in app.py
    fd, out_path = tempfile.mkstemp(suffix='.json', prefix=f'build_{dialect}_')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(final_words, f, ensure_ascii=False, indent=2)

    return out_path