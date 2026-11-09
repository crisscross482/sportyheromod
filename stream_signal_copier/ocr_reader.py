import os
import logging
from typing import Optional, Union, Any

logger = logging.getLogger("OCRReader")

class StreamOCRReader:
    """
    Handles image preprocessing and text extraction from chart screenshots or screen frames.
    Supports EasyOCR and pytesseract if installed, or falls back gracefully.
    """
    def __init__(self, use_gpu: bool = False):
        self.reader = None
        self.engine = None

        # 1. Try EasyOCR
        try:
            import easyocr
            self.reader = easyocr.Reader(['en'], gpu=use_gpu)
            self.engine = "easyocr"
            logger.info("Initialized EasyOCR engine.")
            return
        except ImportError:
            pass

        # 2. Try pytesseract
        try:
            import pytesseract
            self.reader = pytesseract
            self.engine = "tesseract"
            logger.info("Initialized Tesseract OCR engine.")
            return
        except ImportError:
            pass

        logger.info("No external OCR engine found (easyocr / pytesseract not installed).")

    def extract_text(self, image_source: Union[str, bytes, Any]) -> str:
        """
        Extracts raw text from an image filepath, bytes, or numpy/PIL image object.
        """
        if self.engine == "easyocr":
            # easyocr returns list of (bbox, text, prob)
            results = self.reader.readtext(image_source)
            text_lines = [res[1] for res in results]
            return "\n".join(text_lines)

        elif self.engine == "tesseract":
            return self.reader.image_to_string(image_source)

        else:
            logger.warning("OCR engine not available. Cannot extract text from image.")
            return ""
