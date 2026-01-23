import os
from ebooklib import epub

def export_epub(book_title, chapters, output_path):
    book = epub.EpubBook()
    book.set_title(book_title)
    book.set_language('en')

    # Add chapters
    epub_chapters = []
    for idx, chapter in enumerate(chapters):
        c = epub.EpubHtml(title=chapter['title'], file_name=f'chap_{idx+1}.xhtml', content=chapter['content'])
        book.add_item(c)
        epub_chapters.append(c)

    # Define Table of Contents and Spine
    book.toc = tuple(epub_chapters)
    book.spine = ['nav'] + epub_chapters

    # Add navigation files
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # Write to file
    epub.write_epub(output_path, book)
    return output_path

# Example usage:
# chapters = [
#     {'title': 'Chapter 1', 'content': '<h1>Chapter 1</h1><p>Text...</p>'},
#     {'title': 'Chapter 2', 'content': '<h1>Chapter 2</h1><p>More text...</p>'}
# ]
# export_epub('My Book', chapters, 'output.epub')
