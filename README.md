# AI Hallucination Evaluation

**Empirical Evaluation of Hallucination Rates in Large Language Models: A Comparative Study of Code Generation and Technical Knowledge Tasks**

*MSc Foundations of AI — Assignment Project, Dublin City University (November 2025)*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen)](https://ArunGMR0411.github.io/ai-hallucination-eval/)

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

> **Note:** The Piston public API (used for Python code execution) was shut down in February 2026. The Knowledge-Based Questions mode remains fully functional. Python code execution requires a self-hosted Piston instance or alternative sandbox.

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

LLMs generate Python code which is transmitted to the Piston API sandbox for compilation and execution. A response is marked correct only if the code compiles, executes without errors, and the output exactly matches the expected result.

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
cd ai-hallucination-eval/docs
# Open index.html in your browser, or serve it:
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Deploy

The project is configured for GitHub Pages deployment from the `docs/` directory. Push to `main` and enable GitHub Pages in repository settings.

## Project Structure

```
ai-hallucination-eval/
├── docs/                    # GitHub Pages root
│   ├── index.html           # Application entry point
│   ├── style.css            # Professional stylesheet
│   ├── app.js               # Application logic
│   ├── questions.js         # 100-question evaluation dataset
│   └── screenshots/         # Application screenshots
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
