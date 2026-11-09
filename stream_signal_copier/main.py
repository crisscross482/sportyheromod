import os
import sys
import argparse
import logging
from .config import CopierConfig
from .stream_monitor import StreamSignalMonitor
from .ocr_reader import StreamOCRReader
from .screen_capture import ScreenCapture

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Main")

def main():
    parser = argparse.ArgumentParser(description="YouTube Live Stream Signal Copier for MT5")
    parser.add_argument("--image", type=str, help="Process a single chart screenshot file", default=None)
    parser.add_argument("--text", type=str, help="Process a direct text signal string", default=None)
    parser.add_argument("--monitor", action="store_true", help="Start live screen monitoring loop")
    parser.add_argument("--symbol", type=str, default=os.getenv("COPIER_SYMBOL", "XAUUSD"))
    parser.add_argument("--lot-size", type=float, default=float(os.getenv("COPIER_LOT_SIZE", "0.01")))
    parser.add_argument("--max-slippage", type=float, default=float(os.getenv("COPIER_MAX_SLIPPAGE", "3.0")))
    parser.add_argument("--tp", type=str, default=os.getenv("COPIER_TARGET_TP", "TP1"))
    parser.add_argument("--simulate", action="store_true", help="Force simulated execution")
    args = parser.parse_args()

    config = CopierConfig(
        symbol=args.symbol,
        lot_size=args.lot_size,
        max_slippage=args.max_slippage,
        target_tp=args.tp,
        simulation_mode=args.simulate or os.getenv("COPIER_SIMULATION_MODE", "true").lower() in ("true", "1", "yes")
    )

    monitor = StreamSignalMonitor(config=config)
    monitor.executor.initialize()

    ocr = StreamOCRReader()

    if args.text:
        logger.info("Processing signal from command line text...")
        res = monitor.process_raw_text(args.text)
        print("Result:", res)
        return

    if args.image:
        logger.info(f"Processing signal from image: {args.image}")
        extracted_text = ocr.extract_text(args.image)
        logger.info(f"Extracted Text:\n{extracted_text}")
        res = monitor.process_raw_text(extracted_text)
        print("Result:", res)
        return

    if args.monitor:
        logger.info("Starting live screen monitoring...")
        cap = ScreenCapture()
        def get_frame_text() -> str:
            frame = cap.capture_frame()
            if frame:
                return ocr.extract_text(frame)
            return ""

        monitor.start_polling(get_frame_text, poll_interval=2.0)
    else:
        logger.info("No action specified. Use --image <file>, --text '<signal>', or --monitor.")

if __name__ == "__main__":
    main()
