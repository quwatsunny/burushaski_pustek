

function loadDictionaries(retries = 10) {
    const dictList = document.getElementById('dictList');
    if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.list_dictionaries) {
        if (retries > 0) {
            setTimeout(() => loadDictionaries(retries - 1), 500);
        } else {
            dictList.innerHTML = '<div class="no-dictionaries">Dictionary API not available. Please reload the app.</div>';
        }
        return;
    }
    window.pywebview.api.list_dictionaries().then(dicts => {
        console.log('Dictionaries returned from backend:', dicts);
        dictList.innerHTML = '';
        if (!dicts || dicts.length === 0) {
            dictList.innerHTML = '<div class="no-dictionaries">No dictionaries found. Please import or create a dictionary.</div>';
            return;
        }
        // Create table
        const table = document.createElement('table');
        table.className = 'dict-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="padding:8px 6px; border-bottom:1px solid #eee; text-align:left;">Language</th>
                    <th style="padding:8px 6px; border-bottom:1px solid #eee; text-align:left;">Code</th>
                    <th style="padding:8px 6px; border-bottom:1px solid #eee; text-align:left;">Region</th>
                    <th style="padding:8px 6px; border-bottom:1px solid #eee; text-align:left;">Script</th>
                    <th style="padding:8px 6px; border-bottom:1px solid #eee; text-align:left;">Filename</th>
                    <th style="padding:8px 6px; border-bottom:1px solid #eee; text-align:left;">Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        dicts.forEach(d => {
            const tr = document.createElement('tr');
            if (!d.enabled) tr.classList.add('disabled');
            tr.innerHTML = `
                <td style="padding:7px 6px;">${d.language || ''}</td>
                <td style="padding:7px 6px;">${d.code || ''}</td>
                <td style="padding:7px 6px;">${d.region || ''}</td>
                <td style="padding:7px 6px;">${d.script || ''}</td>
                <td style="padding:7px 6px; color:#888; font-size:13px;">${d.filename}</td>
                <td style="padding:7px 6px; display:flex; gap:6px;">
                    <button class="dict-toggle-btn ${d.enabled ? 'enabled' : 'disabled'}">${d.enabled ? 'Disable' : 'Enable'}</button>
                    <button class="dict-update-btn">Update</button>
                    <button class="dict-delete-btn">Delete</button>
                </td>
            `;
            const [toggle, updateBtn, deleteBtn] = tr.querySelectorAll('button');
            toggle.onclick = () => {
                window.pywebview.api.toggle_dictionary(d.filename).then(newState => {
                    // After toggling, reload the dictionary list to reflect the new state
                    loadDictionaries();
                });
            };
                        updateBtn.onclick = () => {
                                // Create a modal dialog for metadata and file upload
                                const modal = document.createElement('div');
                                modal.style.position = 'fixed';
                                modal.style.top = '0';
                                modal.style.left = '0';
                                modal.style.width = '100vw';
                                modal.style.height = '100vh';
                                modal.style.background = 'rgba(0,0,0,0.35)';
                                modal.style.display = 'flex';
                                modal.style.alignItems = 'center';
                                modal.style.justifyContent = 'center';
                                modal.style.zIndex = '9999';
                                modal.innerHTML = `
                                    <div style="background:#fff; padding:28px 24px 18px 24px; border-radius:10px; min-width:340px; max-width:95vw; box-shadow:0 4px 32px rgba(0,0,0,0.18); position:relative;">
                                        <h2 style='margin-top:0;margin-bottom:10px;font-size:1.2em;'>Update Dictionary</h2>
                                        <div style='margin-bottom:10px; color:#444;'>Update the dictionary file and metadata below:</div>
                                        <form id='updateDictForm'>
                                            <label>Language:<br><input type='text' name='language' value="${d.language||''}" required style='width:100%;margin-bottom:8px;'></label><br>
                                            <label>BCP 47 Code:<br><input type='text' name='code' value="${d.code||''}" required style='width:100%;margin-bottom:8px;'></label><br>
                                            <label>Script:<br><input type='text' name='script' value="${d.script||''}" style='width:100%;margin-bottom:8px;'></label><br>
                                            <label>Region:<br><input type='text' name='region' value="${d.region||''}" style='width:100%;margin-bottom:8px;'></label><br>
                                            <label>Dictionary File:<br><input type='file' name='file' accept='.csv,.lift,.json' required style='width:100%;margin-bottom:12px;'></label><br>
                                            <div style='display:flex;justify-content:flex-end;gap:10px;'>
                                                <button type='button' id='cancelUpdateBtn' style='padding:7px 18px;border-radius:6px;background:#eee;color:#444;border:none;font-size:14px;'>Cancel</button>
                                                <button type='submit' style='padding:7px 18px;border-radius:6px;background:#0071e3;color:#fff;border:none;font-size:14px;'>Update</button>
                                            </div>
                                        </form>
                                    </div>
                                `;
                                document.body.appendChild(modal);
                                const form = modal.querySelector('#updateDictForm');
                                const cancelBtn = modal.querySelector('#cancelUpdateBtn');
                                cancelBtn.onclick = () => { document.body.removeChild(modal); };
                                form.onsubmit = async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(form);
                                    const language = formData.get('language');
                                    const code = formData.get('code');
                                    const script = formData.get('script');
                                    const region = formData.get('region');
                                    const file = formData.get('file');
                                    if (!file) { alert('Please select a file.'); return; }
                                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                                    const filePath = `uploads/${safeName}`;
                                    const content = await file.text();
                                    if (!window.pywebview || !window.pywebview.api) {
                                        alert('PyWebView API not available');
                                        return;
                                    }
                                    await window.pywebview.api.save_file(filePath, content);
                                    const result = await window.pywebview.api.build_dictionary(
                                        filePath,
                                        language,
                                        code,
                                        script,
                                        region
                                    );
                                    if (result && result.success) {
                                        alert('Dictionary updated successfully!');
                                        document.body.removeChild(modal);
                                        loadDictionaries();
                                    } else {
                                        alert('Update failed: ' + (result && result.message ? result.message : 'Unknown error'));
                                    }
                                };
                        };
            deleteBtn.onclick = () => {
                if (confirm('Are you sure you want to delete this dictionary?')) {
                    if (window.pywebview && window.pywebview.api && window.pywebview.api.delete_dictionary) {
                        window.pywebview.api.delete_dictionary(d.filename).then(() => loadDictionaries());
                    } else {
                        alert('Delete API not available.');
                    }
                }
            };
            tbody.appendChild(tr);
        });
        dictList.appendChild(table);
    });
}

document.addEventListener('DOMContentLoaded', () => loadDictionaries(10));