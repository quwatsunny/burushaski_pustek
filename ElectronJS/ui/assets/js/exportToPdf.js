// Export editor content to PDF using html2pdf.js
function exportToPdf() {
    const editorContainer = document.getElementById('richEditor');
    if (!editorContainer || !editorContainer.innerHTML.trim()) {
        alert('No content to export. Please write something first.');
        return;
    }
    // Get book title for filename
    const titleEl = document.getElementById('sidebarBookTitle');
    const bookTitle = titleEl ? titleEl.textContent : 'Untitled_Book';
    const opt = {
        margin:       0.5,
        filename:     `${bookTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    if (window.pywebview && window.pywebview.api && window.pywebview.api.export_pdf) {
        html2pdf().from(editorContainer).set(opt).outputPdf('blob').then(function(pdfBlob) {
            const reader = new FileReader();
            reader.onloadend = function() {
                window.pywebview.api.export_pdf(bookTitle, reader.result)
                    .then(res => {
                        if (res && res.success) {
                            alert('PDF exported successfully!');
                        } else {
                            alert('PDF export failed: ' + (res && res.error ? res.error : 'Unknown error'));
                        }
                    });
            };
            reader.readAsDataURL(pdfBlob);
        });
    } else {
        html2pdf().from(editorContainer).set(opt).save();
    }
}
