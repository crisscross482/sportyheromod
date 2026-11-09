# Sports Analytics: Match Combinatorics & Poisson Distribution

Educational module demonstrating statistical modeling and combinatorial scenario generation for multi-match sports analysis.

## Key Concepts

### 1. Combinatorial Complexity ($3^N$)
In a 3-way soccer market (Home Win, Draw, Away Win), selecting $N$ matches yields $3^N$ possible outcome combinations:
* 3 matches: $3^3 = 27$ scenarios
* 5 matches: $3^5 = 243$ scenarios
* 10 matches: $3^{10} = 59,049$ scenarios

### 2. Bivariate Poisson Distribution
Goal scoring events are modeled as Poisson distributed random variables:
$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}$$
Where $\lambda$ represents the expected goals ($xG$) calculated from team attack strength, defensive conceding rate, and home advantage.

### 3. Usage

Run the CLI demonstration:
```bash
python3 sports_analytics/cli.py
```

Run test suite:
```bash
python3 -m unittest sports_analytics/test_analytics.py
```
