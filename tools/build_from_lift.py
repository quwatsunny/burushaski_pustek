import json
import os
import tempfile
import xml.etree.ElementTree as ET
from tools.dialect_rules import hunza, nagar, yasin

def build_from_lift(path, dialect):
    """
    Extract words from LIFT file for a specific dialect.
    Returns path to temporary JSON file with extracted words.
    Does NOT overwrite the actual dictionary file - that's done by merge logic.
    """
    tree = ET.parse(path)
    root = tree.getroot()

    words = []
    for entry in root.findall("entry"):
        for form in entry.findall("lexical-unit/form"):
            text = form.find("text")
            if text is not None and text.text:
                words.append(text.text.strip())

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