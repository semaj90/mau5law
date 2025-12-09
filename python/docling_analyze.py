#!/usr/bin/env python3
"""
Docling Analysis Script
Wraps Granite-Docling-258M for OCR + layout-aware text extraction
"""

import sys
import json
import traceback
from pathlib import Path

try:
    from docling.document_converter import DocumentConverter
    from docling.models import DoclingModel
except ImportError as e:
    print(f"Error: Docling not installed. {e}", file=sys.stderr)
    sys.exit(1)


def analyze_document(input_path: str, output_path: str, mime_type: str) -> dict:
    """
    Analyze document using Granite-Docling-258M

    Args:
        input_path: Path to input document
        output_path: Path to write JSON output
        mime_type: MIME type of document (e.g., 'application/pdf', 'image/png')

    Returns:
        Dictionary with fullText and blocks
    """
    try:
        # Initialize converter with Granite-Docling model
        print(f"Loading Granite-Docling-258M model...", file=sys.stderr)
        converter = DocumentConverter(
            model=DoclingModel.from_pretrained("ibm-granite/granite-docling-258M")
        )

        # Convert document
        print(f"Converting {input_path}...", file=sys.stderr)
        doc = converter.convert(input_path)

        # Extract blocks and text
        blocks = []
        full_text_parts = []

        for page_idx, page in enumerate(doc.pages):
            for block in page.blocks:
                text = block.to_text().strip()
                if not text:
                    continue

                full_text_parts.append(text)

                # Get block type
                block_type = str(block.category.name).lower() if hasattr(block, 'category') else 'other'

                # Get bounding box if available
                bbox = None
                if hasattr(block, 'bbox') and block.bbox:
                    bbox = [block.bbox.l, block.bbox.t, block.bbox.r, block.bbox.b]

                blocks.append({
                    "type": block_type,
                    "text": text,
                    "page": page_idx + 1,
                    "bbox": bbox,
                })

        # Build result
        result = {
            "fullText": "\n\n".join(full_text_parts),
            "blocks": blocks,
            "pageCount": len(doc.pages),
        }

        # Write output
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"✅ Analysis complete: {len(blocks)} blocks, {len(doc.pages)} pages", file=sys.stderr)
        return result

    except Exception as e:
        print(f"❌ Error analyzing document: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise


def main():
    """Main entry point"""
    if len(sys.argv) < 4:
        print("Usage: docling_analyze.py input_path output_path mime_type", file=sys.stderr)
        sys.exit(1)

    input_path, output_path, mime_type = sys.argv[1:4]

    # Validate input file exists
    if not Path(input_path).exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    try:
        analyze_document(input_path, output_path, mime_type)
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
