# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.0.0] — 2026-03-02

### Changed
- Complete UI overhaul: professional, minimal design replacing emoji-heavy interface
- Separated monolithic `main.js` into modular files (`app.js`, `questions.js`, `style.css`, `index.html`)
- Expanded error taxonomy: distinguished **Format Violations** from **Hallucinations** (professor feedback)
- Improved Cohere prompt engineering: added system message for stricter output control
- Code display now uses horizontal scrolling instead of wrapping (professor feedback)
- Enhanced Piston execution result display: shows stdout, stderr, and exit code
- Fixed knowledge mode category labels (Polars/Snowflake, not Pandas/Database)
- Fixed implicit `event` global in score selection handler

### Added
- Format violation detection with answer extraction from verbose model outputs
- GitHub Actions workflow for automatic GitHub Pages deployment
- Comprehensive `README.md` with architecture diagram, results table, and setup instructions
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`
- Machine-readable JSON datasets in `data/` directory
- Loading spinner animations during API calls

## [1.0.0] — 2025-11-01

### Added
- Initial dual-mode evaluation framework
- 50 Python code execution questions across 4 categories
- 50 knowledge-based questions across 4 domains (Polars, SQL, Spark, Snowflake)
- Google Gemini and Cohere API integration
- Piston API sandbox for secure code execution
- Manual score override capability
- Live statistics and leaderboard
- Custom question support
- Scored 95/100 in MSc Foundations of AI course at DCU
