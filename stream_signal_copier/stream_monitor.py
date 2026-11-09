import time
import logging
from typing import Optional, Dict, Any, Callable
from .parser import parse_signal_text, analyze_trade_signal
from .mt5_executor import MT5Executor
from .config import CopierConfig, default_config

logger = logging.getLogger("StreamMonitor")

class StreamSignalMonitor:
    """
    Coordinates detection of trading signals, validates them against slippage / risk,
    and executes orders through MT5Executor.
    """
    def __init__(self, config: CopierConfig = default_config, executor: Optional[MT5Executor] = None):
        self.config = config
        self.executor = executor or MT5Executor(config)
        self.last_signal_signature: Optional[str] = None
        self.last_order_time: float = 0
        self.cooldown_seconds: float = 60.0  # Avoid rapid re-triggering on same trade setup

    def process_raw_text(self, text: str, current_market_price: Optional[float] = None) -> Dict[str, Any]:
        """
        Processes OCR or scraped stream text, detects Entry/SL/TP,
        deduplicates repeated signals, and triggers execution.
        """
        parsed = parse_signal_text(text)
        analysis = analyze_trade_signal(parsed, chosen_tp=self.config.target_tp)

        if not analysis.get('valid'):
            return {
                'status': 'SKIPPED',
                'reason': analysis.get('reason', 'Invalid signal structure'),
                'parsed': parsed
            }

        # Create unique signature for this trade setup (e.g. BUY_4112.72_4104.72)
        signature = f"{analysis['direction']}_{analysis['entry']}_{analysis['sl']}_{analysis.get('tp')}"

        # Deduplication check
        if signature == self.last_signal_signature:
            return {
                'status': 'DUPLICATE',
                'reason': 'Signal already processed previously',
                'signature': signature
            }

        # Cooldown check
        now = time.time()
        if now - self.last_order_time < self.cooldown_seconds:
            return {
                'status': 'COOLDOWN',
                'reason': f'System in cooldown ({self.cooldown_seconds}s)',
                'signature': signature
            }

        # Execute
        exec_result = self.executor.execute_order(analysis, current_price=current_market_price)

        if exec_result.get('success'):
            self.last_signal_signature = signature
            self.last_order_time = now
            return {
                'status': 'EXECUTED',
                'signal': analysis,
                'order': exec_result.get('order')
            }
        else:
            return {
                'status': 'REJECTED',
                'signal': analysis,
                'reason': exec_result.get('reason') or exec_result.get('error')
            }

    def start_polling(self, text_provider_fn: Callable[[], str], poll_interval: float = 3.0, max_iterations: Optional[int] = None):
        """
        Polls OCR provider periodically to monitor video feed.
        """
        logger.info("Starting Stream Monitor polling loop...")
        self.executor.initialize()

        count = 0
        while True:
            try:
                raw_text = text_provider_fn()
                result = self.process_raw_text(raw_text)
                if result['status'] == 'EXECUTED':
                    logger.info(f"Signal executed successfully: {result['order']}")
                elif result['status'] == 'REJECTED':
                    logger.warning(f"Signal rejected: {result['reason']}")
            except Exception as e:
                logger.error(f"Error in monitor loop: {e}")

            count += 1
            if max_iterations and count >= max_iterations:
                break
            time.sleep(poll_interval)
