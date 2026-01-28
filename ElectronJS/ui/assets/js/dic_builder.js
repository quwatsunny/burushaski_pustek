console.log("[DEBUG] dic_builder.js loaded: 2026-01-25");
function showAlert(message, type = "success", duration = 5000) {
    const container = document.getElementById("alertContainer");
    
    console.log("showAlert called with:", { message, type, duration });
    console.log("Container element:", container);
    
    if (!container) {
        console.error("Alert container not found!");
        alert("Alert: " + message); // Fallback
        return;
    }
    
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type}`;
    alertDiv.role = "alert";
    alertDiv.style.marginBottom = "16px";
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close">×</button>
    `;
    
    console.log("Created alert div:", alertDiv);
    container.insertBefore(alertDiv, container.firstChild);
    console.log("Alert appended to container");
    
    if (duration > 0) {
        setTimeout(() => {
            console.log("Removing alert after duration");
            alertDiv.remove();
        }, duration);
    }
}

function updateFileName() {
    const fileInput = document.getElementById("fileInput");
    const fileNameDiv = document.getElementById("fileName");
    
    if (fileInput.files.length > 0) {
        fileNameDiv.textContent = "✓ " + fileInput.files[0].name;
        fileNameDiv.classList.add("show");
    } else {
        fileNameDiv.classList.remove("show");
    }
}

async function build() {
    const overlay = document.getElementById("overlay");
    const fileInput = document.getElementById("fileInput");
    const languageName = document.getElementById("languageName").value;
    const bcpCode = document.getElementById("bcpCode").value;
    const script = document.getElementById("script").value;
    const region = document.getElementById("region").value;

    if (!fileInput.files.length) {
        showAlert("Please select a file", "danger");
        return;
    }
    // Optionally validate new fields here
    // Example: if (!languageName || !bcpCode) { ... }

    // Show overlay
    overlay.classList.remove("d-none");

    try {
        const file = fileInput.files[0];
        // Log new fields for now
        console.log("Language Name:", languageName);
        console.log("BCP 47 Code:", bcpCode);
        console.log("Script:", script);
        console.log("Region:", region);

        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `uploads/${safeName}`;

        const content = await file.text();

        // Save file via backend API
        console.log("Saving file to:", filePath);
        await fetch('/api/dictionaries/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, content })
        });

        // Build/merge dictionary via backend API
        const buildRes = await fetch('/api/dictionaries/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, language: languageName, code: bcpCode, script, region })
        });
        let result;
        let isJson = false;
        try {
            result = await buildRes.json();
            isJson = true;
        } catch (jsonErr) {
            // Not JSON, likely an error page
            result = null;
        }

        // Hide overlay first
        overlay.classList.add("d-none");

        setTimeout(() => {
            if (isJson && result && result.success === true) {
                console.log("Showing success message:", result.message);
                showAlert(result.message, "success", 6000);
                fileInput.value = "";
                updateFileName();
            } else if (isJson && result && result.error) {
                console.log("Showing error message:", result.error);
                showAlert(result.error, "danger", 5000);
            } else {
                // Not JSON or unexpected response
                console.log("Unexpected or non-JSON result:", result);
                showAlert("Server error: Unexpected response. Please check your input or try again later.", "danger", 5000);
            }
        }, 300);
        
    } catch (err) {
        overlay.classList.add("d-none");
        console.error("Build error:", err);
        
        setTimeout(() => {
            showAlert("Error: " + err.message, "danger", 5000);
        }, 300);
    }
    }

    window.build = build;


