# Educational Provably Fair Crash Simulator & Sports Analytics Engine

An educational research repository exploring:
1. **Cryptographic Randomness & Provably Fair Game Engines**: Why future crash game outcomes cannot be forecasted or predicted.
2. **Interactive Crash Game Simulator & Verifier**: A clean-room HTML5 Canvas flight simulator with real-time SSE streaming, particle animations, and an independent round verification tool.
3. **Sports Analytics Combinatorics & Poisson Modeling**: Educational tools for calculating all possible multi-match scenario outcomes ($3^N$) and bivariate Poisson expected goal distributions.

---

## 🚀 Part 1: Provably Fair Crash Game Simulator

### Architectural Overview
- **Hash Chain Generation (`provablyFair.js`)**: Generates an initial seed and hashes it repeatedly using SHA-256 ($H_n = \text{SHA256}(H_{n-1})$). Games are played in reverse order so players receive proof of commitment without being able to reverse the one-way function.
- **Deterministic Multiplier Calculation**:
  $$\text{Signature} = \text{HMAC-SHA256}(\text{Server Seed}, \text{Client Seed})$$
  The first 52 bits are converted into a uniform float $r \in [0, 1)$, mapped to an inverse probability curve with a 1% house edge:
  $$\text{Multiplier} = \max\left(1.00, \left\lfloor \frac{0.99}{1 - r} \times 100 \right\rfloor \div 100\right)$$
- **Real-Time Game Loop (`server.js`)**: Server-Sent Events (SSE) broadcast multiplier ticks ($m(t) = e^{0.15 \cdot t}$), countdowns, and crash events.
- **Interactive UI (`public/`)**:
  - Animated hero flight curve with particle smoke and starry background.
  - Demo credits balance, bet amount, and auto-cashout controls.
  - Interactive verification form allowing retrospective validation of any round's hash and multiplier.

### Running the Simulator
```bash
# Start the simulation server
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## ⚽ Part 2: Sports Analytics & Match Combinatorics

Located in `sports_analytics/`:

### 1. Combinatorial Outcomes ($3^N$)
In a 3-way soccer match market (Home Win, Draw, Away Win), selecting $N$ matches yields $3^N$ possible outcome combinations:
* 3 matches: $3^3 = 27$ scenarios
* 4 matches: $3^4 = 81$ scenarios
* 5 matches: $3^5 = 243$ scenarios

### 2. Bivariate Poisson Goal Distribution
Goal scoring events are modeled as independent Poisson processes:
$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}$$
Where $\lambda$ represents the expected goals ($xG$). The joint probability of an exact score $(h, a)$ is $P(H = h) \times P(A = a)$.

### Running the Sports Analytics CLI
```bash
python3 sports_analytics/cli.py
```

---

## 🧪 Testing

### Running Node.js Tests
Runs unit tests for the cryptographic hash chain, deterministic crash point calculation, distribution bounds, and HTTP API endpoints:
```bash
npm test
```

### Running Python Tests
Runs unit tests for combinatorics permutations, Poisson probability mass functions, scoreline matrices, and multi-match joint probabilities:
```bash
python3 sports_analytics/test_analytics.py
```

---

## 🔬 Mathematical Notes: Why Predictors Cannot Work
- **SHA-256 Pre-Image Resistance**: Knowing round $k$'s hash gives zero mathematical advantage to compute round $k+1$'s hash, as inverting SHA-256 requires $2^{256}$ operations.
- **Markov Property (Zero Memory)**: Each round is statistically independent. Patterns in past multipliers or matches are subject to the Gambler's Fallacy.
- **Auditing vs. Forecasting**: Provably fair algorithms are engineered exclusively for *retrospective verification* (proving that the server did not cheat after the round ends), never *prospective prediction*.
