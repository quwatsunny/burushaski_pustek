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
    html2pdf().from(editorContainer).set(opt).save();
}
