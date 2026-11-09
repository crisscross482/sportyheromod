import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("ScreenCapture")

class ScreenCapture:
    """
    Handles capturing a screen region (such as the right-hand side of a YouTube chart)
    using mss or PIL ImageGrab.
    """
    def __init__(self, region: Optional[Dict[str, int]] = None):
        """
        region format: {"top": 100, "left": 1200, "width": 720, "height": 900}
        """
        self.region = region
        self.sct = None
        try:
            import mss
            self.sct = mss.mss()
        except ImportError:
            pass

    def capture_frame(self) -> Any:
        try:
            from PIL import Image
            if self.sct:
                monitor = self.region if self.region else self.sct.monitors[1]
                sct_img = self.sct.grab(monitor)
                return Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

            from PIL import ImageGrab
            if self.region:
                bbox = (
                    self.region['left'],
                    self.region['top'],
                    self.region['left'] + self.region['width'],
                    self.region['top'] + self.region['height']
                )
                return ImageGrab.grab(bbox=bbox)
            return ImageGrab.grab()
        except Exception as e:
            logger.error(f"Failed to capture screen (requires pillow or mss): {e}")
            return None
