# AI Hallucination Evaluation

**Empirical Evaluation of Hallucination Rates in Large Language Models: A Comparative Study of Code Generation and Technical Knowledge Tasks**

*MSc Foundations of AI — Assignment Project, Dublin City University (November 2025)*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen)](https://ArunGMR0411.github.io/ai-hallucination-eval/)
[![Grade](https://img.shields.io/badge/Grade-95%25-gold?style=for-the-badge&labelColor=1e3a5f)](report/report.pdf)

---

> ### **Result: 95%**
> This project received a grade of **95 / 100** for the MSc Foundations of AI module at Dublin City University.

---

## Overview

A dual-mode evaluation framework for measuring hallucination rates in state-of-the-art Large Language Models. This project compares **Google Gemini 2.5 Flash** and **Cohere Command R7B** across 100 carefully curated test cases spanning code generation and specialized technical knowledge domains.

### Key Findings

| Metric | Gemini 2.5 Flash | Cohere Command R7B |
|--------|------------------|--------------------|
| **Overall Accuracy** | 89% | 64% |
| Python Code Execution | 96% | 84% |
| Knowledge Tasks | 82% | 44% |
| Lowest Domain (Snowflake) | 70% | 10% |

> Hallucination rates correlate strongly with domain specialization.
> Snowflake queries achieved only 40% average accuracy across both models.

## Live Demo

**[Try the interactive evaluation tool →](https://ArunGMR0411.github.io/ai-hallucination-eval/)**

Users provide their own API keys (Gemini + Cohere) and can test any of the 100 built-in questions or create custom ones.

> [!IMPORTANT]
> **The Piston public API was shut down in February 2026.**
> **Mode 2 (Knowledge-Based Questions) works perfectly** — no changes needed.
> **Mode 1 (Python Code Execution) will fail** unless you self-host Piston or use an alternative sandbox.
> See the [Piston API Alternatives](#piston-api-alternatives) section below for step-by-step instructions.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────────┐  │
│  │ Question │───>│   API Layer  │───>│  Evaluation Engine     │  │
│  │ Selector │    │              │    │                        │  │
│  └──────────┘    │ Gemini API   │    │  Mode 1: Piston Exec   │  │
│                  │ Cohere API   │    │  Mode 2: String Match  │  │
│  ┌──────────┐    └──────────────┘    │  + Format Detection    │  │
│  │ Results  │<───────────────────────│                        │  │
│  │ Dashboard│                        └────────────────────────┘  │
│  └──────────┘                                                    │
└──────────────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   Piston API           Gemini / Cohere
   (Code Sandbox)        (LLM APIs)
```

## Evaluation Modes

### Mode 1: Python Code Execution (50 questions)

LLMs generate Python code which is transmitted to a [Piston API](https://github.com/engineer-man/piston) sandbox for compilation and execution. A response is marked correct only if the code compiles, executes without errors, and the output exactly matches the expected result.

> **Status (March 2026):** The public Piston endpoint (`emkc.org`) is no longer available. You must self-host Piston or swap in another sandbox to use this mode. See [Piston API Alternatives](#piston-api-alternatives).

**Categories:** EdgeCase (15), StringTrick (10), Algorithm (15), DataStructure (10)

### Mode 2: Knowledge-Based Questions (50 questions)

LLMs answer technical questions with brief, precise answers. Responses are compared against ground truth using exact matching with partial-match fallback and format-violation detection.

**Categories:** Polars (15), SQL (15), Spark (10), Snowflake (10)

## Error Taxonomy

The evaluation distinguishes between four outcome types:

| Type | Description | Example |
|------|-------------|---------|
| **Correct** | Output matches expected answer | Asked for `scan_csv`, returned `scan_csv` |
| **Hallucination** | Factually incorrect answer | Asked about `QUALIFY`, returned `ROW_NUMBER()` |
| **Format Violation** | Correct answer embedded in extra text | Expected `3`, returned `"The count is: 3"` |
| **Refused** | Model declined to answer | Error or empty response |

## Getting Started

### Prerequisites

- A modern web browser
- [Google Gemini API key](https://aistudio.google.com)
- [Cohere API key](https://dashboard.cohere.com)

### Run Locally

```bash
git clone https://github.com/ArunGMR0411/ai-hallucination-eval.git
cd ai-hallucination-eval

# Using npm (requires Node.js):
npm install
npm run dev
# Visit http://localhost:8080

# Or serve directly:
cd src
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Deploy

The project is configured for GitHub Pages deployment from the `src/` directory via GitHub Actions. Push to `main` to trigger automatic deployment.

### Piston API Alternatives

The public Piston API at `https://emkc.org/api/v2/piston/execute` was **discontinued in February 2026**. If you want to use **Mode 1 (Python Code Execution)**, you have two options:

#### Option A: Self-Host Piston (Recommended)

Piston is open-source and can be run locally with Docker.

```bash
# 1. Clone and start Piston
git clone https://github.com/engineer-man/piston.git
cd piston
docker-compose up -d

# 2. Install the Python 3.10 runtime inside Piston
docker exec -it piston_api /bin/bash
piston install python 3.10.0
exit

# 3. Verify it is running
curl -X POST http://localhost:2000/api/v2/execute \
  -H "Content-Type: application/json" \
  -d '{"language": "python", "version": "3.10.0", "files": [{"content": "print(42)"}]}'
# Should return: {"run": {"stdout": "42\n", ...}}
```

Then update the `PISTON_URL` constant in [`src/app.js`](src/app.js) (line 20):

```javascript
// Before (defunct)
const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// After (local instance)
const PISTON_URL = "http://localhost:2000/api/v2/execute";
```

#### Option B: Use an Alternative Sandbox API

If you prefer not to run Docker, you can substitute any code execution API that accepts Python source and returns stdout. Popular alternatives:

| Service | URL | Notes |
|---------|-----|-------|
| [Judge0](https://judge0.com/) | `https://judge0-ce.p.rapidapi.com` | Free tier via RapidAPI; requires API key |
| [Glot.io](https://glot.io/) | `https://glot.io/api/run/python/latest` | Free, no key required, rate-limited |
| Self-hosted Judge0 | `http://localhost:2358` | Open-source, Docker-based |

Using a different API will require modifying the `executeCode()` function in [`src/app.js`](src/app.js) to match that API's request/response format. The key fields to map are:
- **Request:** language, version, source code
- **Response:** stdout, stderr, exit code

#### What Works Without Piston

**Mode 2 (Knowledge-Based Questions) is completely unaffected** — it uses direct string comparison and requires no code execution backend. You can use all 50 knowledge questions (Polars, SQL, Spark, Snowflake) with zero additional setup.

## Project Structure

```
ai-hallucination-eval/
├── src/                     # Application source (GitHub Pages root)
│   ├── index.html           # Application entry point
│   ├── style.css            # Stylesheet (CSS custom properties)
│   ├── app.js               # Application logic (async/await, ES2020+)
│   └── questions.js         # 100-question evaluation dataset
├── report/                  # Assignment report
│   ├── report.tex           # LaTeX source
│   └── references.bib       # Bibliography
├── data/                    # Machine-readable datasets
│   ├── python_questions.json
│   ├── knowledge_questions.json
│   └── results/             # Raw evaluation results
│       ├── gemini_results.json
│       └── cohere_results.json
├── .github/workflows/       # CI/CD
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── CHANGELOG.md
```

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **LLM APIs:** [Google Gemini API](https://ai.google.dev/), [Cohere API](https://docs.cohere.com/)
- **Code Execution:** [Piston API](https://github.com/engineer-man/piston) (sandboxed Python 3.10) — *public API discontinued Feb 2026*
- **Hosting:** GitHub Pages

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Author

**Arun Narayanan**
MSc Computing (Artificial Intelligence), Dublin City University
[arun.narayanan2@mail.dcu.ie](mailto:arun.narayanan2@mail.dcu.ie)
