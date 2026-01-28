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

        if (!window.pywebview || !window.pywebview.api) {
            throw new Error("PyWebView API not available");
        }

        console.log("Saving file to:", filePath);
        await window.pywebview.api.save_file(filePath, content);
        
        // Pass new fields to API
        const result = await window.pywebview.api.build_dictionary(filePath, languageName, bcpCode, script, region);
        
        console.log("API Result:", result);
        console.log("Result type:", typeof result);
        console.log("Result.success:", result.success);
        
        // Hide overlay first
        overlay.classList.add("d-none");
        
        // Give the browser time to update before showing alert
        setTimeout(() => {
            if (result && result.success === true) {
                console.log("Showing success message:", result.message);
                showAlert(result.message, "success", 6000);
                
                // Clear file input
                fileInput.value = "";
                updateFileName();
            } else if (result && result.error) {
                console.log("Showing error message:", result.error);
                showAlert(result.error, "danger", 5000);
            } else {
                console.log("Unexpected result:", result);
                showAlert("Dictionary merge completed but response was unexpected", "info", 5000);
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

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const buildBtn = document.getElementById("buildBtn");
    if (fileInput) {
        fileInput.addEventListener("change", updateFileName);
    }
    if (buildBtn) {
        buildBtn.addEventListener("click", build);
    }
    // Drag and drop
    const fileLabel = document.querySelector(".file-input-label");
    if (fileLabel) {
        fileLabel.addEventListener("dragover", (e) => {
            e.preventDefault();
            fileLabel.style.background = "#e7f1ff";
        });
        fileLabel.addEventListener("dragleave", () => {
            fileLabel.style.background = "#f8f9fa";
        });
        fileLabel.addEventListener("drop", (e) => {
            e.preventDefault();
            fileLabel.style.background = "#f8f9fa";
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                updateFileName();
            }
        });
    }
});

