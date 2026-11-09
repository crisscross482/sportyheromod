"""
Educational Bivariate Poisson Match Probability Model.
Models match goal distributions as independent Poisson processes:
P(X = k) = (lambda^k * e^-lambda) / k!
"""
import math
from typing import Dict, Any, List

def poisson_pmf(k: int, lmbda: float) -> float:
    """Computes Poisson probability mass function P(X = k; lambda)."""
    if lmbda <= 0:
        return 1.0 if k == 0 else 0.0
    return (math.pow(lmbda, k) * math.exp(-lmbda)) / math.factorial(k)

def calculate_match_probabilities(lambda_home: float, lambda_away: float, max_goals: int = 10) -> Dict[str, Any]:
    """
    Computes score matrix up to max_goals and aggregates
    Home Win, Draw, and Away Win probabilities.
    """
    home_win_prob = 0.0
    draw_prob = 0.0
    away_win_prob = 0.0
    score_matrix = {}

    for h in range(max_goals + 1):
        p_h = poisson_pmf(h, lambda_home)
        for a in range(max_goals + 1):
            p_a = poisson_pmf(a, lambda_away)
            prob = p_h * p_a
            score_matrix[(h, a)] = prob

            if h > a:
                home_win_prob += prob
            elif h == a:
                draw_prob += prob
            else:
                away_win_prob += prob

    # Normalize across the computed space
    total = home_win_prob + draw_prob + away_win_prob
    if total > 0:
        home_win_prob /= total
        draw_prob /= total
        away_win_prob /= total

    # Find top 3 most likely exact scorelines
    top_scores = sorted(score_matrix.items(), key=lambda item: item[1], reverse=True)[:5]
    formatted_scores = [{"score": f"{h}-{a}", "probability": round(prob, 4)} for (h, a), prob in top_scores]

    return {
        "home_win": round(home_win_prob, 4),
        "draw": round(draw_prob, 4),
        "away_win": round(away_win_prob, 4),
        "top_scorelines": formatted_scores
    }

def calculate_multimatch_scenario_probability(match_probs: List[Dict[str, float]], scenario_codes: List[str]) -> float:
    """
    Computes joint probability of an independent multi-match combination.
    scenario_codes: list of 'H', 'D', or 'A' for each match.
    """
    if len(match_probs) != len(scenario_codes):
        raise ValueError("Match probabilities and scenario codes length mismatch")

    joint_prob = 1.0
    mapping = {"H": "home_win", "D": "draw", "A": "away_win"}

    for probs, code in zip(match_probs, scenario_codes):
        key = mapping.get(code.upper())
        if not key or key not in probs:
            raise ValueError(f"Invalid outcome code: {code}")
        joint_prob *= probs[key]

    return round(joint_prob, 6)
