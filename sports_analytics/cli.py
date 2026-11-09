#!/usr/bin/env python3
"""
CLI tool for soccer match combinatorics and Poisson scenario analysis.
"""
import sys
from combinatorics import generate_all_combinations, count_combinations
from poisson_model import calculate_match_probabilities, calculate_multimatch_scenario_probability

def main():
    print("=" * 65)
    print("⚽ Sports Analytics: Multi-Match Combinatorics & Poisson Modeling")
    print("=" * 65)

    sample_matches = [
        {"home": "Arsenal", "away": "Chelsea", "lambda_home": 1.85, "lambda_away": 1.10},
        {"home": "Real Madrid", "away": "Barcelona", "lambda_home": 1.70, "lambda_away": 1.55},
        {"home": "Bayern Munich", "away": "Dortmund", "lambda_home": 2.20, "lambda_away": 1.30}
    ]

    print(f"\nAnalyzing {len(sample_matches)} matches:\n")
    match_tuples = []
    match_probabilities_list = []

    for i, m in enumerate(sample_matches, 1):
        probs = calculate_match_probabilities(m["lambda_home"], m["lambda_away"])
        match_tuples.append((m["home"], m["away"]))
        match_probabilities_list.append(probs)

        print(f"Match {i}: {m['home']} vs {m['away']}")
        print(f"  Expected Goals (xG): {m['home']}={m['lambda_home']} | {m['away']}={m['lambda_away']}")
        print(f"  Poisson Probabilities: Home Win={probs['home_win']*100:.1f}%, Draw={probs['draw']*100:.1f}%, Away Win={probs['away_win']*100:.1f}%")
        top_scores_str = ", ".join([f"{s['score']} ({s['probability']*100:.1f}%)" for s in probs['top_scorelines'][:3]])
        print(f"  Most Likely Scorelines: {top_scores_str}\n")

    total_scenarios = count_combinations(len(sample_matches))
    print(f"Total possible combinatorial outcomes (3^{len(sample_matches)}): {total_scenarios} scenarios.\n")

    all_combos = generate_all_combinations(match_tuples)

    # Calculate scenario joint probabilities and rank them
    ranked_scenarios = []
    for combo in all_combos:
        codes = [item["code"] for item in combo]
        joint_p = calculate_multimatch_scenario_probability(match_probabilities_list, codes)
        summary = " | ".join([f"{item['home']} ({item['code']})" for item in combo])
        ranked_scenarios.append({
            "codes": "".join(codes),
            "summary": summary,
            "probability": joint_p,
            "pct": joint_p * 100
        })

    ranked_scenarios.sort(key=lambda s: s["probability"], reverse=True)

    print("Top 5 Most Mathematically Probable Outcome Scenarios:")
    print("-" * 65)
    for rank, s in enumerate(ranked_scenarios[:5], 1):
        print(f"Rank {rank} [{s['codes']}]: {s['pct']:.2f}% chance")
        print(f"       {s['summary']}")
    print("-" * 65)

    print("\nNote on Sports Analytics:")
    print("Soccer involves high random variance and low event counts. Poisson and")
    print("xG models evaluate theoretical probability distributions, not guaranteed")
    print("outcomes. Single match outcomes remain subject to substantial entropy.")

if __name__ == "__main__":
    main()
