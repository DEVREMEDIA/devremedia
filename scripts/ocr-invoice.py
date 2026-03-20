#!/usr/bin/env python3
"""
Minimal invoice OCR: PDF → text via pytesseract.
Called as subprocess from Next.js API route.
Usage: python ocr-invoice.py <pdf_path>
Outputs: extracted text to stdout
"""
import sys
from pdf2image import convert_from_path
import pytesseract


def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr-invoice.py <pdf_path>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    images = convert_from_path(pdf_path, dpi=300)

    full_text = ""
    for img in images:
        text = pytesseract.image_to_string(img, lang="ell+eng")
        full_text += text + "\n"

    # Output to stdout for the parent process to read
    print(full_text)


if __name__ == "__main__":
    main()
