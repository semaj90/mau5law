#!/usr/bin/env python3
"""
Docling Analysis Script for SvelteKit Frontend
Processes documents using Granite-Docling for OCR + layout extraction
"""

import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
import tempfile
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
    DOCLING_AVAILABLE = True
except ImportError:
    DOCLING_AVAILABLE = False
    logger.warning("Granite-Docling not installed. Install with: pip install docling")

def analyze_document(input_path: str, output_path: str, mime_type: str) -> Dict:
    """
    Analyze document using Granite-Docling
    Returns structured JSON with text blocks, layout info, and metadata
    """

    if not DOCLING_AVAILABLE:
        # Fallback mock processing
        logger.warning("Using mock Docling processing (library not available)")
        return {
            "fullText": "Mock processing - Docling not available",
            "blocks": [{
                "type": "paragraph",
                "text": "Mock processing - Docling not available",
                "page": 1
            }],
            "pageCount": 1,
            "processingTimeMs": 100
        }

    try:
        # Initialize converter with optimized settings
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True
        pipeline_options.do_table_structure = True

        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: pipeline_options,
                InputFormat.IMAGE: pipeline_options
            }
        )

        # Convert document
        logger.info(f"Processing document: {input_path}")
        result = converter.convert(input_path)

        # Extract structured data
        blocks = []
        full_text = ""
        page_count = len(result.document.pages)

        for page_no, page in enumerate(result.document.pages, 1):
            for item in page.items:
                block = {
                    "type": item.item_type.value if hasattr(item.item_type, 'value') else str(item.item_type),
                    "text": item.text,
                    "page": page_no
                }

                # Add bounding box if available
                if hasattr(item, 'prov') and item.prov:
                    try:
                        bbox = item.prov[0].bbox
                        if bbox:
                            block["bbox"] = [bbox.l, bbox.t, bbox.r, bbox.b]
                    except:
                        pass

                blocks.append(block)
                full_text += item.text + "\n"

        # Create result structure
        docling_result = {
            "fullText": full_text.strip(),
            "blocks": blocks,
            "pageCount": page_count,
            "processingTimeMs": 0  # Will be set by caller
        }

        logger.info(f"Successfully processed {page_count} pages with {len(blocks)} blocks")
        return docling_result

    except Exception as e:
        logger.error(f"Docling processing failed: {e}")
        raise

def main():
    if len(sys.argv) != 4:
        print("Usage: python docling_analyze.py <input_file> <output_json> <mime_type>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    mime_type = sys.argv[3]

    try:
        # Validate input file exists
        if not Path(input_path).exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        # Process document
        result = analyze_document(input_path, output_path, mime_type)

        # Write result to output file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        logger.info(f"Results written to: {output_path}")

    except Exception as e:
        logger.error(f"Processing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()