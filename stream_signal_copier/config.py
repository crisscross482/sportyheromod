import os
from dataclasses import dataclass

@dataclass
class CopierConfig:
    symbol: str = os.getenv("COPIER_SYMBOL", "XAUUSD")
    lot_size: float = float(os.getenv("COPIER_LOT_SIZE", "0.01"))
    max_slippage: float = float(os.getenv("COPIER_MAX_SLIPPAGE", "3.0"))  # Max allowed price distance from entry
    target_tp: str = os.getenv("COPIER_TARGET_TP", "TP1")  # TP1, TP2, or TP3
    simulation_mode: bool = os.getenv("COPIER_SIMULATION_MODE", "true").lower() in ("true", "1", "yes")

    # MT5 Demo Account credentials (optional if MT5 terminal is already logged in)
    mt5_account: int = int(os.getenv("MT5_ACCOUNT", "0"))
    mt5_password: str = os.getenv("MT5_PASSWORD", "")
    mt5_server: str = os.getenv("MT5_SERVER", "")
    mt5_path: str = os.getenv("MT5_PATH", "")

default_config = CopierConfig()
