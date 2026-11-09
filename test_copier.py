import unittest
from stream_signal_copier.parser import parse_signal_text, analyze_trade_signal
from stream_signal_copier.config import CopierConfig
from stream_signal_copier.mt5_executor import MT5Executor
from stream_signal_copier.stream_monitor import StreamSignalMonitor
from stream_signal_copier.ocr_reader import StreamOCRReader
from stream_signal_copier.screen_capture import ScreenCapture

class TestStreamSignalCopier(unittest.TestCase):
    def setUp(self):
        self.screenshot_text = """
        TP3 (4125.720)
        TP2 (4121.720)
        TP1 (4115.720)
        Entry (4112.720)
        SL (4104.720)
        """

    def test_parse_exact_labels(self):
        parsed = parse_signal_text(self.screenshot_text)
        self.assertEqual(parsed['entry'], 4112.720)
        self.assertEqual(parsed['sl'], 4104.720)
        self.assertEqual(parsed['tp1'], 4115.720)
        self.assertEqual(parsed['tp2'], 4121.720)
        self.assertEqual(parsed['tp3'], 4125.720)

    def test_direction_and_validation(self):
        # Case 1: Long trade from screenshot (Entry > SL)
        parsed = parse_signal_text(self.screenshot_text)
        analysis = analyze_trade_signal(parsed, chosen_tp="TP1")
        self.assertTrue(analysis['valid'])
        self.assertEqual(analysis['direction'], 'BUY')
        self.assertEqual(analysis['entry'], 4112.720)
        self.assertEqual(analysis['sl'], 4104.720)
        self.assertEqual(analysis['tp'], 4115.720)
        self.assertEqual(analysis['risk_distance'], 8.0)
        self.assertEqual(analysis['reward_distance'], 3.0)

        # Case 2: Short trade (Entry < SL)
        sell_text = """
        Entry (4110.00)
        SL (4115.00)
        TP1 (4100.00)
        """
        parsed_sell = parse_signal_text(sell_text)
        analysis_sell = analyze_trade_signal(parsed_sell, chosen_tp="TP1")
        self.assertTrue(analysis_sell['valid'])
        self.assertEqual(analysis_sell['direction'], 'SELL')
        self.assertEqual(analysis_sell['risk_distance'], 5.0)
        self.assertEqual(analysis_sell['reward_distance'], 10.0)

        # Case 3: Invalid trade (BUY where TP is below entry)
        invalid_text = "Entry: 4100 SL: 4090 TP1: 4080"
        parsed_invalid = parse_signal_text(invalid_text)
        analysis_invalid = analyze_trade_signal(parsed_invalid)
        self.assertFalse(analysis_invalid['valid'])

    def test_slippage_check(self):
        config = CopierConfig(symbol="XAUUSD", max_slippage=2.0, simulation_mode=True)
        executor = MT5Executor(config)
        executor.initialize()

        signal = {
            'direction': 'BUY',
            'entry': 4112.72,
            'sl': 4104.72,
            'tp': 4115.72
        }

        # Current price within slippage (+1.0 distance) -> should succeed
        res_ok = executor.execute_order(signal, current_price=4113.72)
        self.assertTrue(res_ok['success'])

        # Positive slippage for BUY (price is lower than entry, e.g. 4111.00) -> should succeed
        res_positive_slip = executor.execute_order(signal, current_price=4111.00)
        self.assertTrue(res_positive_slip['success'])

        # Adverse slippage for BUY (+6.0 higher) -> should reject
        res_slippage = executor.execute_order(signal, current_price=4118.72)
        self.assertFalse(res_slippage['success'])
        self.assertTrue(res_slippage.get('rejected'))

    def test_simulated_execution(self):
        config = CopierConfig(symbol="XAUUSD", lot_size=0.01, simulation_mode=True)
        monitor = StreamSignalMonitor(config=config)
        monitor.executor.initialize()

        # First encounter -> executes
        res1 = monitor.process_raw_text(self.screenshot_text, current_market_price=4113.00)
        self.assertEqual(res1['status'], 'EXECUTED')
        self.assertIn('ticket', res1['order'])
        self.assertEqual(res1['order']['direction'], 'BUY')

        # Duplicate feed frame -> skips
        res2 = monitor.process_raw_text(self.screenshot_text, current_market_price=4113.00)
        self.assertEqual(res2['status'], 'DUPLICATE')

    def test_ocr_and_capture_instantiation(self):
        ocr = StreamOCRReader()
        # Even without easyocr/pytesseract installed, should instantiate and handle empty cleanly
        text = ocr.extract_text("/tmp/nonexistent.png")
        self.assertIsInstance(text, str)

        cap = ScreenCapture(region={"top": 0, "left": 0, "width": 100, "height": 100})
        self.assertIsNotNone(cap)

if __name__ == '__main__':
    unittest.main()
