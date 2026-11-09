import re
from typing import Optional, Dict, Any

def parse_signal_text(text: str) -> Dict[str, Optional[float]]:
    """
    Extracts Entry, SL, and TP levels from raw text or OCR output.
    Matches formats like:
      - Entry (4112.720) or Entry: 4112.72
      - SL (4104.720) or SL: 4104.72
      - TP1 (4115.720), TP2 (4121.720), TP3 (4125.720)
    """
    patterns = {
        'entry': r'\bEntry\b[^\d\n\r]*([0-9]+(?:\.[0-9]+)?)',
        'sl': r'\bSL\b[^\d\n\r]*([0-9]+(?:\.[0-9]+)?)',
        'tp1': r'\bTP\s*1\b[^\d\n\r]*([0-9]+(?:\.[0-9]+)?)',
        'tp2': r'\bTP\s*2\b[^\d\n\r]*([0-9]+(?:\.[0-9]+)?)',
        'tp3': r'\bTP\s*3\b[^\d\n\r]*([0-9]+(?:\.[0-9]+)?)',
    }

    results: Dict[str, Optional[float]] = {
        'entry': None,
        'sl': None,
        'tp1': None,
        'tp2': None,
        'tp3': None,
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                results[key] = float(match.group(1))
            except ValueError:
                results[key] = None

    return results

def analyze_trade_signal(parsed: Dict[str, Optional[float]], chosen_tp: str = "TP1") -> Dict[str, Any]:
    """
    Validates parsed signal numbers and infers order direction (BUY vs SELL).

    Logic:
      - If Entry > SL, it is a BUY order (expecting price to rise towards TP).
      - If Entry < SL, it is a SELL order (expecting price to drop towards TP).
    """
    entry = parsed.get('entry')
    sl = parsed.get('sl')

    tp_key = chosen_tp.lower()
    tp = parsed.get(tp_key) or parsed.get('tp1')

    if entry is None or sl is None:
        return {
            'valid': False,
            'reason': 'Missing entry or stop-loss level'
        }

    if entry == sl:
        return {
            'valid': False,
            'reason': 'Entry and Stop-Loss cannot be equal'
        }

    direction = "BUY" if entry > sl else "SELL"

    # Validate TP relative to direction
    if tp is not None:
        if direction == "BUY" and tp <= entry:
            return {
                'valid': False,
                'reason': f'For BUY, TP ({tp}) must be greater than Entry ({entry})'
            }
        elif direction == "SELL" and tp >= entry:
            return {
                'valid': False,
                'reason': f'For SELL, TP ({tp}) must be lower than Entry ({entry})'
            }

    risk_distance = abs(entry - sl)
    reward_distance = abs(tp - entry) if tp is not None else None
    rr_ratio = round(reward_distance / risk_distance, 2) if reward_distance and risk_distance > 0 else None

    return {
        'valid': True,
        'direction': direction,
        'entry': entry,
        'sl': sl,
        'tp': tp,
        'tp_level': chosen_tp if parsed.get(tp_key) is not None else 'TP1',
        'risk_distance': round(risk_distance, 3),
        'reward_distance': round(reward_distance, 3) if reward_distance else None,
        'risk_reward_ratio': rr_ratio
    }
