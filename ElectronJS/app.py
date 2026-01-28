
import os
import json
from flask import Flask, jsonify, request, send_from_directory, abort
from tools.dict_db import init_db, add_dictionary, list_dictionaries as db_list_dictionaries, toggle_dictionary, delete_dictionary
from tools.build_from_csv import build_from_csv
from tools.build_from_lift import build_from_lift
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DICT_DIR = os.path.join(BASE_DIR, 'dictionaries')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
UI_DIR = os.path.join(BASE_DIR, 'ui')

app = Flask(__name__, static_folder=UI_DIR, static_url_path='')
# Serve dictionary JSON files from the dictionaries folder
@app.route('/dictionaries/<filename>')
def serve_dictionary_file(filename):
	resolved_path = os.path.join(DICT_DIR, filename)
	if not os.path.exists(resolved_path):
		return abort(404)
	return send_from_directory(DICT_DIR, filename)


# Toggle enable/disable dictionary
@app.route('/api/dictionaries/toggle/<filename>', methods=['POST'])
def api_toggle_dictionary(filename):
	result = toggle_dictionary(filename)
	if result is not None:
		return jsonify({'success': True, 'enabled': result})
	else:
		return jsonify({'success': False, 'error': 'Dictionary not found'}), 404


# Delete dictionary
@app.route('/api/dictionaries/delete/<filename>', methods=['DELETE'])
def api_delete_dictionary(filename):
	result = delete_dictionary(filename)
	if result:
		return jsonify({'success': True})
	else:
		return jsonify({'success': False, 'error': 'Delete failed'}), 500


# Upload dictionary file (save to uploads folder)
@app.route('/api/dictionaries/upload', methods=['POST'])
def api_upload_dictionary():
	data = request.get_json()
	file_path = data.get('filePath')
	content = data.get('content')
	print(f"[UPLOAD] Received upload for: {file_path}")
	if not file_path or not content:
		print("[UPLOAD][ERROR] Missing filePath or content")
		return jsonify({'error': 'Missing filePath or content'}), 400
	try:
		rel_path = file_path.replace('uploads/', '').replace('uploads\\', '')
		full_path = os.path.join(UPLOADS_DIR, rel_path)
		print(f"[UPLOAD] Saving to: {full_path}")
		os.makedirs(os.path.dirname(full_path), exist_ok=True)
		with open(full_path, 'w', encoding='utf-8') as f:
			f.write(content)
		print(f"[UPLOAD] File saved successfully: {full_path}")
		return jsonify({'success': True, 'message': 'File uploaded'})
	except Exception as e:
		import traceback
		print(f"[UPLOAD][ERROR] {e}\n{traceback.format_exc()}")
		return jsonify({'error': str(e)}), 500



def build_dictionary(file_path, language_name=None, bcp_code=None, script=None, region=None):
	print(f"\n{'='*60}")
	print(f"[BUILD_DICTIONARY] Building dictionary from {file_path}")
	print(f"[BUILD_DICTIONARY] Language: {language_name}, Code: {bcp_code}, Script: {script}, Region: {region}")
	print(f"{'='*60}")
	ext = file_path.split(".")[-1].lower()
	if not language_name or not bcp_code:
		print("[ERROR] Missing language name or BCP code")
		return {"error": "Language name and BCP code are required"}
	# Normalize all parts: lowercase, replace spaces/underscores with dashes, remove other non-alphanum except dash
	def normalize(s):
		import re
		return re.sub(r'[^a-z0-9-]', '', str(s).lower().replace(' ', '-').replace('_', '-'))
	lang = normalize(language_name)
	code = normalize(bcp_code)
	scr = normalize(script) if script else ''
	reg = normalize(region) if region else ''
	# Compose filename
	parts = [lang, code]
	if reg: parts.append(reg)
	if scr: parts.append(scr)
	filename = '-'.join(parts) + '.json'
	dict_file = os.path.join(DICT_DIR, filename)
	# Extract new words from uploaded file
	ext = file_path.split('.')[-1].lower()
	try:
		if ext == 'csv':
			print(f"[BUILD_DICTIONARY] Using build_from_csv for {file_path}")
			new_words_path = build_from_csv(os.path.join(UPLOADS_DIR, os.path.basename(file_path)))
		elif ext == 'lift':
			print(f"[BUILD_DICTIONARY] Using build_from_lift for {file_path}")
			new_words_path = build_from_lift(os.path.join(UPLOADS_DIR, os.path.basename(file_path)), lang)
		else:
			print(f"[BUILD_DICTIONARY][ERROR] Unsupported file type: {ext}")
			return {"error": f"Unsupported file type: {ext}"}
		print(f"[BUILD_DICTIONARY] New words path: {new_words_path}")
		with open(new_words_path, 'r', encoding='utf-8') as f:
			new_words = json.load(f)
		print(f"[BUILD_DICTIONARY] Loaded {len(new_words)} words from file")
	except Exception as e:
		import traceback
		print(f"[BUILD_DICTIONARY][ERROR] {e}\n{traceback.format_exc()}")
		return {"error": str(e)}
	# Merge with existing dictionary if exists
	merged_words = []
	if os.path.exists(dict_file):
		try:
			with open(dict_file, 'r', encoding='utf-8') as f:
				existing = json.load(f)
			existing_words = existing.get('words', [])
			existing_count = len(existing_words)
			print(f"[BUILD_DICTIONARY] Loaded {existing_count} existing words from {dict_file}")
			merged_words = list(sorted(set(existing_words + new_words)))
		except Exception as e:
			import traceback
			print(f"[BUILD_DICTIONARY][ERROR] Failed to load existing dictionary: {e}\n{traceback.format_exc()}")
			merged_words = new_words
	else:
		merged_words = new_words
	# Write merged dictionary
	with open(dict_file, 'w', encoding='utf-8') as f:
		json.dump({
			'language': language_name,
			'code': bcp_code,
			'region': region,
			'script': script,
			'words': merged_words
		}, f, ensure_ascii=False, indent=2)
	print(f"[BUILD_DICTIONARY] Wrote merged dictionary to {dict_file}")
	print(f"[BUILD_DICTIONARY] File exists after write: {os.path.exists(dict_file)}")
	print(f"[BUILD_DICTIONARY] Merged words count: {len(merged_words)}")
	print(f"[BUILD_DICTIONARY] Sample words: {merged_words[:10]}")
	# Add to database
	add_dictionary(language_name, bcp_code, region, script, filename, True)
	return {'success': True, 'filename': filename, 'words': len(merged_words)}

# Build/merge dictionary from uploaded file
@app.route('/api/dictionaries/build', methods=['POST'])
def api_build_dictionary():
	try:
		data = request.get_json()
		file_path = data.get('filePath')
		language = data.get('language')
		code = data.get('code')
		script = data.get('script')
		region = data.get('region')
		print(f"[BUILD] Received build request: file_path={file_path}, language={language}, code={code}, script={script}, region={region}")
		if not file_path or not language or not code:
			print("[BUILD][ERROR] Missing required fields")
			return jsonify({'error': 'Missing required fields'}), 400
		result = build_dictionary(file_path, language, code, script, region)
		print(f"[BUILD] build_dictionary result: {result}")
		return jsonify(result)
	except Exception as e:
		import traceback
		print(f"[BUILD][ERROR] {e}\n{traceback.format_exc()}")
		return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500
@app.route('/api/dictionaries', methods=['GET'])
def api_list_dictionaries():
	dicts = db_list_dictionaries()
	return jsonify(dicts)

# Serve main editor UI
@app.route('/')
def index():
	return send_from_directory(UI_DIR, 'editor.html')

@app.route('/<path:filename>')
def serve_ui(filename):
	if os.path.exists(os.path.join(UI_DIR, filename)):
		return send_from_directory(UI_DIR, filename)
	abort(404)

def build_dictionary(file_path, language_name=None, bcp_code=None, script=None, region=None):
	print(f"\n{'='*60}")
	print(f"[BUILD_DICTIONARY] Building dictionary from {file_path}")
	print(f"[BUILD_DICTIONARY] Language: {language_name}, Code: {bcp_code}, Script: {script}, Region: {region}")
	print(f"{'='*60}")
	ext = file_path.split(".")[-1].lower()
	if not language_name or not bcp_code:
		print("[ERROR] Missing language name or BCP code")
		return {"error": "Language name and BCP code are required"}
	# Normalize all parts: lowercase, replace spaces/underscores with dashes, remove other non-alphanum except dash
	def normalize(s):
		import re
		return re.sub(r'[^a-z0-9-]', '', re.sub(r'[ _]+', '-', s.strip().lower()))
	base_filename = f"{normalize(language_name)}-{normalize(bcp_code)}"
	region_part = f"-{normalize(region)}" if region else ''
	script_part = f"-{normalize(script)}" if script else ''
	dict_filename = f"{base_filename}{region_part}{script_part}.json"
	dicts_dir = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'dictionaries')
	dict_file = os.path.join(dicts_dir, dict_filename)
	try:
		dialect = "yasin"
		print(f"[BUILD_DICTIONARY] File extension: {ext}")
		if ext == "csv":
			print(f"[BUILD_DICTIONARY] Using build_from_csv for {file_path}")
			new_words_path = build_from_csv(file_path, dialect)
		elif ext == "lift":
			print(f"[BUILD_DICTIONARY] Using build_from_lift for {file_path}")
			new_words_path = build_from_lift(file_path, dialect)
		else:
			print(f"[BUILD_DICTIONARY][ERROR] Unsupported file type: {ext}")
			return {"error": "Unsupported file type (use CSV or LIFT)"}
		print(f"[BUILD_DICTIONARY] New words path: {new_words_path}")
		with open(new_words_path, "r", encoding="utf-8") as f:
			new_words = json.load(f)
		print(f"[BUILD_DICTIONARY] Loaded {len(new_words)} words from file")
		if not isinstance(new_words, list):
			print(f"[BUILD_DICTIONARY][ERROR] Failed to extract words from file")
			return {"error": "Failed to extract words from file"}
	except Exception as e:
		import traceback
		print(f"[BUILD_DICTIONARY][ERROR] {e}\n{traceback.format_exc()}")
		return {"error": f"Error processing file: {str(e)}"}

	existing_words = []
	existing_count = 0
	if os.path.exists(dict_file):
		try:
			with open(dict_file, "r", encoding="utf-8") as f:
				data = json.load(f)
			existing_words = data if isinstance(data, list) else data.get("words", [])
			existing_count = len(existing_words)
			print(f"[BUILD_DICTIONARY] Loaded {existing_count} existing words from {dict_file}")
		except Exception as e:
			import traceback
			print(f"[BUILD_DICTIONARY][ERROR] Failed to load existing dictionary: {e}\n{traceback.format_exc()}")

	existing_set = set(existing_words)
	new_set = set(new_words)
	truly_new = new_set - existing_set
	duplicates = new_set & existing_set
	merged_words = list(existing_set | new_set)
	merged_words.sort()
	dict_data = {
		"language": language_name,
		"code": bcp_code,
		"region": region,
		"script": script,
		"words": merged_words
	}
	try:
		with open(dict_file, "w", encoding="utf-8") as f:
			json.dump(dict_data, f, ensure_ascii=False, indent=2)
		print(f"[BUILD_DICTIONARY] Wrote merged dictionary to {dict_file}")
		print(f"[BUILD_DICTIONARY] File exists after write: {os.path.exists(dict_file)}")
		print(f"[BUILD_DICTIONARY] Merged words count: {len(merged_words)}")
		print(f"[BUILD_DICTIONARY] Sample words: {merged_words[:10]}")
	except Exception as e:
		import traceback
		print(f"[BUILD_DICTIONARY][ERROR] Failed to write dictionary file: {e}\n{traceback.format_exc()}")
		return {"error": f"Failed to write dictionary file: {e}"}

	try:
		add_dictionary(language_name, bcp_code, region, script, dict_filename, True)
		print(f"[BUILD_DICTIONARY] Added/updated dictionary metadata in DB: {dict_filename}")
	except Exception as e:
		print(f"[DB][ERROR] Error adding dictionary metadata: {e}")

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

if __name__ == "__main__":
	init_db()
	app.run(host='0.0.0.0', port=5000, debug=True)



