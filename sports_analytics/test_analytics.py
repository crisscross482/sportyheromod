import os
import sys
import unittest

# Ensure module path resolves whether run directly or via discover
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sports_analytics.combinatorics import generate_all_combinations, count_combinations
from sports_analytics.poisson_model import poisson_pmf, calculate_match_probabilities, calculate_multimatch_scenario_probability

class TestSportsAnalytics(unittest.TestCase):

    def test_count_combinations(self):
        self.assertEqual(count_combinations(0), 1)
        self.assertEqual(count_combinations(1), 3)
        self.assertEqual(count_combinations(3), 27)
        self.assertEqual(count_combinations(5), 243)

    def test_generate_all_combinations(self):
        matches = [("Arsenal", "Chelsea"), ("Liverpool", "Man City")]
        scenarios = generate_all_combinations(matches)
        self.assertEqual(len(scenarios), 9)  # 3^2 = 9

        # Verify structure
        first_scenario = scenarios[0]
        self.assertEqual(len(first_scenario), 2)
        self.assertIn("home", first_scenario[0])
        self.assertIn("outcome", first_scenario[0])

    def test_poisson_pmf(self):
        # lambda = 1.0, k = 0 => e^-1 ~= 0.367879
        p0 = poisson_pmf(0, 1.0)
        self.assertAlmostEqual(p0, 0.367879, places=5)

        # sum of probabilities for lambda = 1.5 across 0 to 10 should be close to 1
        total = sum(poisson_pmf(k, 1.5) for k in range(15))
        self.assertAlmostEqual(total, 1.0, places=4)

    def test_calculate_match_probabilities(self):
        # Equal attack strength
        probs = calculate_match_probabilities(1.5, 1.5)
        # Home Win and Away Win should be roughly equal
        self.assertAlmostEqual(probs["home_win"], probs["away_win"], places=2)

        # Probabilities should sum to approximately 1.0
        prob_sum = probs["home_win"] + probs["draw"] + probs["away_win"]
        self.assertAlmostEqual(prob_sum, 1.0, places=3)
        self.assertTrue(len(probs["top_scorelines"]) > 0)

    def test_multimatch_scenario_probability(self):
        match_probs = [
            {"home_win": 0.5, "draw": 0.3, "away_win": 0.2},
            {"home_win": 0.4, "draw": 0.4, "away_win": 0.2}
        ]
        # H and H: 0.5 * 0.4 = 0.2
        joint_p = calculate_multimatch_scenario_probability(match_probs, ["H", "H"])
        self.assertAlmostEqual(joint_p, 0.2, places=4)

if __name__ == '__main__':
    unittest.main()
