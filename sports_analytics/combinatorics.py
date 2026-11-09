"""
Combinatorial match outcome generator.
Calculates Cartesian products (3^N outcomes: Home Win, Draw, Away Win)
across any number of matches.
"""
import itertools
from typing import List, Tuple, Dict, Any

OUTCOMES = ["Home Win", "Draw", "Away Win"]
SHORT_CODES = {"Home Win": "H", "Draw": "D", "Away Win": "A"}

def generate_all_combinations(matches: List[Tuple[str, str]]) -> List[List[Dict[str, str]]]:
    """
    Given a list of matches [("HomeTeam", "AwayTeam"), ...],
    returns all 3^N outcome scenarios.
    """
    if not matches:
        return []

    combos = list(itertools.product(OUTCOMES, repeat=len(matches)))
    scenarios = []

    for combo in combos:
        scenario = []
        for (home, away), outcome in zip(matches, combo):
            scenario.append({
                "match": f"{home} vs {away}",
                "home": home,
                "away": away,
                "outcome": outcome,
                "code": SHORT_CODES[outcome]
            })
        scenarios.append(scenario)

    return scenarios

def count_combinations(match_count: int) -> int:
    """Returns 3^N."""
    if match_count < 0:
        return 0
    return 3 ** match_count
