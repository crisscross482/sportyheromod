import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger("MT5Executor")

class MT5Executor:
    """
    Handles trade execution on MetaTrader 5 demo/live accounts.
    If MetaTrader5 package is unavailable or simulation_mode is enabled,
    runs in safe Simulated Mode with complete logging.
    """
    def __init__(self, config=None):
        self.config = config
        self.connected = False
        self.is_simulated = True
        self.mt5 = None
        self.executed_orders = []

        if config and not config.simulation_mode:
            try:
                import MetaTrader5 as mt5_lib
                self.mt5 = mt5_lib
                self.is_simulated = False
            except ImportError:
                logger.warning("MetaTrader5 python package not installed. Falling back to Simulation Mode.")
                self.is_simulated = True

    def initialize(self) -> bool:
        if self.is_simulated:
            logger.info("[SIMULATION] MT5 Executor initialized in Simulation Mode.")
            self.connected = True
            return True

        if not self.mt5:
            return False

        init_args = {}
        if self.config and self.config.mt5_path:
            init_args["path"] = self.config.mt5_path

        if not self.mt5.initialize(**init_args):
            logger.error(f"MT5 initialize() failed, error code = {self.mt5.last_error()}")
            return False

        if self.config and self.config.mt5_account > 0:
            authorized = self.mt5.login(
                login=self.config.mt5_account,
                password=self.config.mt5_password,
                server=self.config.mt5_server
            )
            if not authorized:
                logger.error(f"Failed to connect to MT5 account {self.config.mt5_account}")
                return False

        account_info = self.mt5.account_info()
        if account_info:
            logger.info(f"Connected to MT5 account #{account_info.login} on {account_info.server}")
        self.connected = True
        return True

    def get_current_price(self, symbol: str) -> Optional[Dict[str, float]]:
        if self.is_simulated or not self.mt5:
            return {'bid': 4112.50, 'ask': 4112.90}

        symbol_info_tick = self.mt5.symbol_info_tick(symbol)
        if symbol_info_tick is None:
            return None
        return {'bid': symbol_info_tick.bid, 'ask': symbol_info_tick.ask}

    def _determine_filling_mode(self, symbol: str) -> int:
        if not self.mt5:
            return 0
        symbol_info = self.mt5.symbol_info(symbol)
        if symbol_info is None:
            return self.mt5.ORDER_FILLING_IOC

        filling_mode = symbol_info.filling_mode
        # Bitmask check for supported filling mode
        if filling_mode & 1:  # FOK
            return self.mt5.ORDER_FILLING_FOK
        elif filling_mode & 2:  # IOC
            return self.mt5.ORDER_FILLING_IOC
        return self.mt5.ORDER_FILLING_RETURN

    def execute_order(self, signal: Dict[str, Any], current_price: Optional[float] = None) -> Dict[str, Any]:
        """
        Executes market BUY or SELL order with specified SL and TP.
        Checks adverse slippage before submitting (positive slippage is allowed).
        """
        if not self.connected:
            return {'success': False, 'error': 'Executor not initialized'}

        symbol = self.config.symbol if self.config else "XAUUSD"
        lot_size = self.config.lot_size if self.config else 0.01
        direction = signal['direction']
        entry_price = signal['entry']
        sl = signal['sl']
        tp = signal.get('tp')

        # Check market price & adverse slippage
        price_info = self.get_current_price(symbol)
        actual_price = current_price
        if actual_price is None:
            if price_info:
                actual_price = price_info['ask'] if direction == "BUY" else price_info['bid']
            else:
                actual_price = entry_price

        # Adverse slippage calculation:
        # BUY: paying more than entry price hurts the trade
        # SELL: selling for less than entry price hurts the trade
        if direction == "BUY":
            adverse_slippage = max(0.0, actual_price - entry_price)
        else:
            adverse_slippage = max(0.0, entry_price - actual_price)

        max_allowed_slippage = self.config.max_slippage if self.config else 3.0

        if adverse_slippage > max_allowed_slippage:
            msg = f"Adverse slippage too high: {adverse_slippage:.2f} > max {max_allowed_slippage:.2f} (Entry: {entry_price}, Actual: {actual_price})"
            logger.warning(msg)
            return {
                'success': False,
                'rejected': True,
                'reason': msg,
                'slippage': adverse_slippage
            }

        order_record = {
            'timestamp': time.time(),
            'symbol': symbol,
            'direction': direction,
            'lot_size': lot_size,
            'signal_entry': entry_price,
            'execution_price': actual_price,
            'sl': sl,
            'tp': tp,
            'slippage': round(adverse_slippage, 3),
            'simulated': self.is_simulated
        }

        if self.is_simulated:
            order_record['ticket'] = int(time.time() * 1000) % 10000000
            order_record['status'] = 'FILLED_SIMULATED'
            self.executed_orders.append(order_record)
            logger.info(f"[SIMULATION ORDER] Placed {direction} {lot_size} {symbol} @ {actual_price} | SL: {sl} | TP: {tp}")
            return {'success': True, 'order': order_record}

        # Real MT5 Terminal Order Send
        action_type = self.mt5.ORDER_TYPE_BUY if direction == "BUY" else self.mt5.ORDER_TYPE_SELL
        filling_mode = self._determine_filling_mode(symbol)

        request = {
            "action": self.mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": lot_size,
            "type": action_type,
            "price": actual_price,
            "sl": float(sl),
            "tp": float(tp) if tp else 0.0,
            "deviation": int(max_allowed_slippage * 10),
            "magic": 998877,
            "comment": "YouTube Stream Copier",
            "type_time": self.mt5.ORDER_TIME_GTC,
            "type_filling": filling_mode,
        }

        result = self.mt5.order_send(request)
        if result is None or result.retcode != self.mt5.TRADE_RETCODE_DONE:
            error_text = self.mt5.last_error() if result is None else result.comment
            logger.error(f"Order send failed: {error_text}")
            return {'success': False, 'error': error_text, 'retcode': getattr(result, 'retcode', None)}

        order_record['ticket'] = result.order
        order_record['status'] = 'FILLED'
        self.executed_orders.append(order_record)
        logger.info(f"[MT5 LIVE ORDER #{result.order}] {direction} {symbol} placed successfully.")
        return {'success': True, 'order': order_record}

    def shutdown(self):
        if not self.is_simulated and self.mt5:
            self.mt5.shutdown()
        self.connected = False
