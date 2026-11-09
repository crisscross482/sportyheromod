# YouTube Live Stream Signal Copier (XAUUSD -> MetaTrader 5)

This system monitors live stream trading signals (such as YouTube live charts showing Entry, Stop Loss, and Take Profit levels) and executes trades on a MetaTrader 5 (MT5) demo account with built-in slippage guard, risk management, and deduplication.

---

## 1. How It Works

1. **Signal Parsing (`parser.py`):**
   - Extracts labels: `Entry (4112.720)`, `SL (4104.720)`, `TP1 (4115.720)`, `TP2 (4121.720)`, `TP3 (4125.720)`.
   - Determines trade direction automatically:
     - If `Entry > SL` -> **BUY** order.
     - If `Entry < SL` -> **SELL** order.
   - Calculates Risk, Reward, and Risk/Reward ratio.

2. **Execution & Slippage Guard (`mt5_executor.py`):**
   - Connects to your MetaTrader 5 terminal via the official `MetaTrader5` Python library.
   - Compares the stream's entry price against the live broker market price.
   - **Slippage Guard:** If the price has already moved past `COPIER_MAX_SLIPPAGE` (due to YouTube stream delay), the order is rejected to prevent entering at a disadvantage.
   - **Simulation Mode:** If running on macOS/Linux or without an active MT5 terminal, runs in safe simulation mode with full audit logging.

3. **Stream Pipeline (`stream_monitor.py`):**
   - Deduplicates setups so the same trade is not entered repeatedly.
   - Implements a cooldown period between trades.

---

## 2. Setup & Installation

### Requirements
- Python 3.10+
- Windows (for native MetaTrader 5 terminal automation) or any OS (for simulation mode)

### Configuration
Copy the example environment file:
```bash
cp stream_signal_copier/.env.example stream_signal_copier/.env
```

Edit your settings in `stream_signal_copier/.env`:
* `COPIER_SYMBOL=XAUUSD`
* `COPIER_LOT_SIZE=0.01` (micro-lot for demo testing)
* `COPIER_MAX_SLIPPAGE=3.0` (maximum points away from entry price)
* `COPIER_TARGET_TP=TP1` (choice of TP1, TP2, or TP3)
* `COPIER_SIMULATION_MODE=false` (set to `true` to dry run without MT5 terminal)

---

## 3. Connecting to MetaTrader 5 (MT5)

1. Open MetaTrader 5 and log into your **Demo Account**.
2. Enable algorithmic trading in MT5:
   - Go to **Tools** -> **Options** -> **Expert Advisors**.
   - Check **"Allow algorithmic trading"**.
3. Install the MetaTrader 5 Python package:
   ```bash
   pip install MetaTrader5
   ```
4. If you wish to capture screen frames directly from YouTube:
   ```bash
   pip install mss easyocr pillow
   ```

---

## 4. Running the Copier

### A. Quick Test with Sample Stream Text:
```python
from stream_signal_copier.stream_monitor import StreamSignalMonitor
from stream_signal_copier.config import default_config

monitor = StreamSignalMonitor(config=default_config)

# Example text captured from the YouTube live chart:
sample_text = """
TP3 (4125.720)
TP2 (4121.720)
TP1 (4115.720)
Entry (4112.720)
SL (4104.720)
"""

result = monitor.process_raw_text(sample_text)
print("Result:", result)
```

---

## 5. Critical Notes on Stream Latency & Risk

- **Stream Delay:** YouTube livestreams have an inherent 5 to 30 second delay. On Gold (`XAUUSD`), price moves fast; always keep `COPIER_MAX_SLIPPAGE` enabled to prevent entering trades after the price has already hit TP1.
- **Demo Account First:** Always run in demo mode to evaluate signal accuracy, broker spread impact, and execution speed before considering any live capital.
