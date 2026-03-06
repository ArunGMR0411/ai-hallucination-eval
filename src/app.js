/**
 * AI Hallucination Evaluation — Application Logic
 *
 * Dual-mode evaluation framework:
 *   Mode 1 — Python code execution via Piston API sandbox
 *   Mode 2 — Knowledge-based factual accuracy via string comparison
 *
 * Models: Google Gemini 2.5 Flash, Cohere Command R7B
 *
 * @author  Arun Narayanan
 * @license MIT
 */

"use strict";

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const PISTON_URL  = "https://emkc.org/api/v2/piston/execute";
const MAX_RETRIES = 2;

/* ================================================================== */
/*  Application State                                                  */
/* ================================================================== */

let geminiApiKey = "";
let cohereApiKey = "";
let currentMode  = "python"; // "python" | "knowledge"
let questionScored = false;

let testResults = {
  gemini: { correct: 0, hallucination: 0, format_violation: 0, refused: 0, total: 0 },
  cohere: { correct: 0, hallucination: 0, format_violation: 0, refused: 0, total: 0 },
};

let currentResponses = { gemini: "", cohere: "", expectedOutput: "", question: "" };
let tempScores       = { gemini: "", cohere: "" };
let executionResults = { gemini: null, cohere: null };

/* ================================================================== */
/*  DOM Helpers                                                        */
/* ================================================================== */

/** Shorthand for getElementById. */
const $ = (id) => document.getElementById(id);

/** Safely set textContent on an element. */
const setText = (id, text) => { $(id).textContent = text; };

/** Safely set innerHTML on an element. */
const setHTML = (id, html) => { $(id).innerHTML = html; };

/** Escape a string for safe HTML insertion. */
const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
};

/* ================================================================== */
/*  Piston API — Code Execution with Retry                             */
/* ================================================================== */

/**
 * Execute Python code in the Piston sandbox and compare against expected output.
 *
 * @param {string} pythonCode     - The Python source to execute.
 * @param {string} expectedOutput - The expected stdout output.
 * @returns {Promise<object>}     - Structured execution result.
 */
async function executeCode(pythonCode, expectedOutput) {
  return _executeWithRetry(pythonCode, expectedOutput, 0);
}

async function _executeWithRetry(pythonCode, expectedOutput, attempt) {
  const payload = {
    language: "python",
    version:  "3.10.0",
    files:    [{ content: pythonCode }],
    stdin:    "",
    args:     [],
    compile_timeout: 10000,
    run_timeout:     5000,
  };

  try {
    const res    = await fetch(PISTON_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const result = await res.json();

    // Compile errors
    if (result.compile?.stderr) {
      return {
        status: "syntax_error", error: result.compile.stderr,
        score: "hallucination", message: "Syntax Error",
        exitCode: result.compile.code, stdout: "", stderr: result.compile.stderr,
        execTime: null,
      };
    }

    // Runtime errors
    if (result.run?.stderr) {
      return {
        status: "runtime_error", error: result.run.stderr,
        score: "hallucination", message: "Runtime Error",
        exitCode: result.run.code, stdout: result.run.stdout ?? "",
        stderr: result.run.stderr, execTime: null,
      };
    }

    const actual = result.run?.stdout?.trim() ?? "";

    // Retry on empty output (transient Piston issue)
    if (actual === "" && attempt < MAX_RETRIES) {
      await _delay(500);
      return _executeWithRetry(pythonCode, expectedOutput, attempt + 1);
    }

    const display  = actual || "(empty)";
    const expected = expectedOutput.trim();

    // Exact match
    if (actual === expected) {
      return _pistonResult("correct", display, "correct", "Correct Output", result);
    }

    // Format violation: correct answer embedded in extra text
    if (_containsAnswer(actual, expected)) {
      return _pistonResult("format_issue", display, "format_violation",
        "Format Violation — correct answer with extra text", result);
    }

    // Wrong output
    return {
      status: "wrong_output", expected, actual: display,
      score: "hallucination", message: "Incorrect Output",
      exitCode: result.run?.code ?? null, stdout: actual, stderr: "",
      execTime: null,
    };
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      await _delay(500);
      return _executeWithRetry(pythonCode, expectedOutput, attempt + 1);
    }
    return {
      status: "execution_failed", error: err.message,
      score: "hallucination", message: "Execution Failed",
      exitCode: null, stdout: "", stderr: err.message, execTime: null,
    };
  }
}

/** Build a normalised Piston result object. */
function _pistonResult(status, output, score, message, raw) {
  return {
    status, output, score, message,
    exitCode: raw.run?.code ?? null,
    stdout:   raw.run?.stdout ?? "",
    stderr:   raw.run?.stderr ?? "",
    execTime: null,
  };
}

/** Promise-based delay helper. */
const _delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks whether the expected answer appears inside the actual output.
 * Returns false for exact matches (handled separately).
 */
function _containsAnswer(actual, expected) {
  if (!actual || !expected) return false;
  const a = actual.toLowerCase().trim();
  const e = expected.toLowerCase().trim();
  return a !== e && a.includes(e);
}

/**
 * Extract a concise answer by stripping common preambles and markdown fences.
 */
function _extractAnswer(raw) {
  let text = raw.trim();

  // Strip markdown backtick fences
  text = text.replace(/^```[\s\S]*?```$/gm, "").trim();

  // Strip common preamble patterns
  const patterns = [
    /^(?:the\s+)?(?:answer|result|output)\s*(?:is|=|:)\s*/i,
    /^(?:it\s+(?:is|returns?|outputs?|prints?)\s*:?\s*)/i,
    /^>\s*/,
  ];
  for (const pattern of patterns) {
    text = text.replace(pattern, "");
  }

  // Take only first line if multi-line
  return text.split("\n")[0].trim();
}

/* ================================================================== */
/*  Knowledge Mode — Answer Comparison                                 */
/* ================================================================== */

/**
 * Compare an AI model's answer against the expected ground truth.
 *
 * @param {string} aiAnswer       - The raw model response.
 * @param {string} expectedAnswer - The ground-truth answer.
 * @returns {object}              - Structured comparison result.
 */
function compareAnswers(aiAnswer, expectedAnswer) {
  const rawAnswer   = aiAnswer.trim();
  const extracted   = _extractAnswer(rawAnswer);
  const expected    = expectedAnswer.toLowerCase().trim();
  const extractedLc = extracted.toLowerCase();
  const rawLc       = rawAnswer.toLowerCase();

  // Direct match (raw or extracted)
  if (rawLc === expected || extractedLc === expected) {
    return { status: "correct", output: rawAnswer, score: "correct", message: "Correct Answer" };
  }

  // Partial containment
  if (extractedLc.includes(expected) || expected.includes(extractedLc)) {
    if (rawAnswer.length > expected.length * 3 && rawAnswer.length > 20) {
      return {
        status: "format_issue", output: rawAnswer, score: "format_violation",
        message: "Format Violation — correct answer embedded in extra text",
      };
    }
    return { status: "correct", output: rawAnswer, score: "correct", message: "Correct Answer (partial match)" };
  }

  // Wrong answer
  return {
    status: "wrong_output", expected: expectedAnswer, actual: rawAnswer,
    score: "hallucination", message: "Incorrect Answer",
  };
}

/* ================================================================== */
/*  API Integration                                                    */
/* ================================================================== */

/**
 * Call the Google Gemini API and return the model's text response.
 */
async function callGeminiAPI(question) {
  const prompt = currentMode === "python"
    ? `Write complete Python code that solves this problem. Only provide the code, no explanations:\n\n${question}`
    : `Answer with ONLY the exact function name, keyword, or term. No explanations, no extra text:\n\n${question}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

  try {
    const res  = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`);

    const text = _extractGeminiText(data);
    return currentMode === "python" ? _stripCodeFence(text) : text;
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

/**
 * Call the Cohere Chat API and return the model's text response.
 */
async function callCohereAPI(question) {
  const systemMsg = currentMode === "python"
    ? "You are a Python code generator. Return ONLY executable Python code. No markdown fences, no explanations, no comments."
    : "You are a precise answer bot. Return ONLY the exact function name, keyword, or term. Never explain. Never add any extra words or context.";

  const userMsg = currentMode === "python"
    ? `Write complete Python code that solves this problem. Only provide the code, no explanations:\n\n${question}`
    : `Answer with ONLY the exact function name, keyword, or term. No explanations, no extra text:\n\n${question}`;

  try {
    const res  = await fetch("https://api.cohere.com/v2/chat", {
      method:  "POST",
      headers: {
        Authorization: `Bearer ${cohereApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: "command-r7b-12-2024",
        messages: [
          { role: "system", content: systemMsg },
          { role: "user",   content: userMsg },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);

    const text = _extractCohereText(data);
    return currentMode === "python" ? _stripCodeFence(text) : text;
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

/* ------------------------------------------------------------------ */
/*  Response Parsing Helpers                                           */
/* ------------------------------------------------------------------ */

function _extractGeminiText(data) {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Unexpected Gemini response format");
  return text.trim();
}

function _extractCohereText(data) {
  const text = data.message?.content?.[0]?.text;
  if (!text) throw new Error("Unexpected Cohere response format");
  return text.trim();
}

/** Remove markdown code fences from LLM output. */
function _stripCodeFence(text) {
  if (text.includes("```python")) {
    return text.split("```python")[1]?.split("```")[0]?.trim() ?? text;
  }
  if (text.includes("```")) {
    return text.split("```")[1]?.split("```")[0]?.trim() ?? text;
  }
  return text;
}

/* ================================================================== */
/*  UI — Mode Switching                                                */
/* ================================================================== */

function switchMode(mode) {
  currentMode = mode;

  // Tab state
  const isPython = mode === "python";
  $("tab-python").classList.toggle("active", isPython);
  $("tab-knowledge").classList.toggle("active", !isPython);
  $("tab-python").setAttribute("aria-selected", String(isPython));
  $("tab-knowledge").setAttribute("aria-selected", String(!isPython));

  if (isPython) {
    setText("banner-title", "Mode: Python Code Execution");
    setText("banner-desc",
      "AI models generate Python code to solve each challenge. Code is executed in a secure sandbox (Piston API) " +
      "and the output is compared against the expected result. 50 questions across edge cases, string operations, " +
      "algorithms, and data structures.");
    setHTML("mode-note-text",
      '<strong>Python mode:</strong> Code execution powered by the ' +
      '<a href="https://github.com/engineer-man/piston" target="_blank" rel="noopener">Piston API</a> ' +
      '(free, sandboxed environment).');
    setText("picker-title", "Select Challenge");
    setText("run-btn", "Run Test");
    setText("category-hint", "Categories: EdgeCase, StringTrick, Algorithm, DataStructure");
    setText("gemini-title", "Gemini — Generated Code");
    setText("cohere-title", "Cohere — Generated Code");
    setText("expected-label", "Expected Output");
    setText("question-label", "Challenge");
  } else {
    setText("banner-title", "Mode: Knowledge-Based Questions");
    setText("banner-desc",
      "AI models answer technical questions with brief, precise answers. Responses are compared against " +
      "ground-truth using exact and partial string matching. 50 questions across Polars, SQL, Spark, and Snowflake.");
    setHTML("mode-note-text",
      '<strong>Knowledge mode:</strong> Tests factual accuracy and terminology precision across specialized technical domains.');
    setText("picker-title", "Select Question");
    setText("run-btn", "Run Knowledge Test");
    setText("category-hint", "Categories: Polars, SQL, Spark, Snowflake");
    setText("gemini-title", "Gemini — Answer");
    setText("cohere-title", "Cohere — Answer");
    setText("expected-label", "Expected Answer");
    setText("question-label", "Question");
  }

  populateQuestions();
  $("results-area").style.display = "none";
}

/* ================================================================== */
/*  UI — Question Dropdown                                             */
/* ================================================================== */

function populateQuestions() {
  const select    = $("question-select");
  const questions = currentMode === "python" ? PYTHON_QUESTIONS : KNOWLEDGE_QUESTIONS;

  select.innerHTML = '<option value="">-- Select a question --</option>';

  for (const q of questions) {
    const opt = document.createElement("option");
    opt.value = q.id - 1; // 0-based index
    const truncated = q.question.length > 65 ? `${q.question.substring(0, 65)}...` : q.question;
    opt.textContent = `Q${q.id} [${q.category}] ${truncated}`;
    select.appendChild(opt);
  }
}

/* ================================================================== */
/*  UI — Score Selection (event-delegated)                             */
/* ================================================================== */

function handleScoreClick(event) {
  const btn = event.target.closest(".score-btn");
  if (!btn) return;

  const api       = btn.dataset.api;
  const scoreType = btn.dataset.score;
  if (!api || !scoreType) return;

  tempScores[api] = scoreType;

  // Clear previous selections within this model's options
  const container = btn.closest(".score-options");
  container.querySelectorAll(".score-btn").forEach((b) => b.classList.remove("selected"));

  btn.classList.add("selected");
  const radio = btn.querySelector('input[type="radio"]');
  if (radio) radio.checked = true;
}

/* ================================================================== */
/*  UI — Submit Scores                                                 */
/* ================================================================== */

function submitScores() {
  if (!executionResults.gemini || !executionResults.cohere) {
    alert("Please wait for both models to complete.");
    return;
  }
  if (questionScored) {
    alert("This question has already been scored. Select a new question.");
    return;
  }

  const gScore = tempScores.gemini || executionResults.gemini.score;
  const cScore = tempScores.cohere || executionResults.cohere.score;

  _tallyScore("gemini", gScore);
  _tallyScore("cohere", cScore);

  updateStatistics();
  questionScored = true;
  alert("Scores submitted. Select the next question to continue.");
}

function _tallyScore(model, score) {
  testResults[model].total++;
  if (score === "correct")              testResults[model].correct++;
  else if (score === "format_violation") testResults[model].format_violation++;
  else if (score === "refused")          testResults[model].refused++;
  else                                   testResults[model].hallucination++;
}

/* ================================================================== */
/*  UI — Statistics                                                    */
/* ================================================================== */

function updateStatistics() {
  _renderStats("gemini");
  _renderStats("cohere");
  _renderLeaderboard();
}

function _renderStats(model) {
  const s        = testResults[model];
  const accuracy = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : "0.0";
  const hallRate = s.total > 0 ? ((s.hallucination / s.total) * 100).toFixed(1) : "0.0";

  setHTML(`${model}-stats`,
    `<div class="stat-row"><span class="stat-label">Correct</span><span class="stat-value">${s.correct}</span></div>` +
    `<div class="stat-row"><span class="stat-label">Hallucinations</span><span class="stat-value">${s.hallucination}</span></div>` +
    `<div class="stat-row"><span class="stat-label">Format Violations</span><span class="stat-value">${s.format_violation}</span></div>` +
    `<div class="stat-row"><span class="stat-label">Refused</span><span class="stat-value">${s.refused}</span></div>` +
    `<div class="stat-row"><span class="stat-label">Accuracy</span><span class="stat-value">${accuracy}%</span></div>` +
    `<div class="stat-row"><span class="stat-label">Hallucination Rate</span><span class="stat-value">${hallRate}%</span></div>`);
}

function _renderLeaderboard() {
  const g    = testResults.gemini;
  const c    = testResults.cohere;
  const gAcc = g.total > 0 ? ((g.correct / g.total) * 100).toFixed(1) : "0.0";
  const cAcc = c.total > 0 ? ((c.correct / c.total) * 100).toFixed(1) : "0.0";

  const leader = parseFloat(gAcc) > parseFloat(cAcc) ? "Gemini"
               : parseFloat(cAcc) > parseFloat(gAcc) ? "Cohere"
               : "Tie";

  setText("leader-name",   leader);
  setText("leader-gemini", `${gAcc}%`);
  setText("leader-cohere", `${cAcc}%`);
  setText("leader-total",  String(g.total));
}

/* ================================================================== */
/*  UI — Display Execution / Comparison Results                        */
/* ================================================================== */

function displayExecutionResults() {
  _renderExecResult("gemini");
  _renderExecResult("cohere");
}

function _renderExecResult(model) {
  const r   = executionResults[model];
  const el  = $(`${model}-execution`);
  let html  = "";
  let cls   = "exec-result";

  if (r.status === "correct") {
    cls  += " correct";
    html += `<strong>Status: ${r.message}</strong>`;
    html += `<div class="detail-row"><span class="label">Output:</span><span>${escapeHtml(r.output)}</span></div>`;
  } else if (r.status === "format_issue") {
    cls  += " format";
    html += `<strong>Status: ${r.message}</strong>`;
    html += `<div class="detail-row"><span class="label">Output:</span><span>${escapeHtml(r.output || r.actual || "")}</span></div>`;
    html += '<div class="detail-row"><span class="label">Note:</span><span>The correct answer is present but the model added extra text.</span></div>';
  } else if (r.status === "wrong_output") {
    cls  += " wrong";
    html += `<strong>Status: ${r.message}</strong>`;
    html += `<div class="detail-row"><span class="label">Expected:</span><span>${escapeHtml(r.expected)}</span></div>`;
    html += `<div class="detail-row"><span class="label">Received:</span><span>${escapeHtml(r.actual)}</span></div>`;
  } else {
    cls  += " error";
    html += `<strong>Status: ${r.message}</strong>`;
    html += `<div class="detail-row"><span class="label">Error:</span><span>${escapeHtml(r.error || "Unknown")}</span></div>`;
  }

  // Piston-specific details for code mode
  if (currentMode === "python" && r.exitCode != null) {
    html += `<div class="detail-row"><span class="label">Exit Code:</span><span>${r.exitCode}</span></div>`;
  }
  if (currentMode === "python" && r.stdout) {
    html += `<div class="detail-row"><span class="label">stdout:</span><span>${escapeHtml(r.stdout.substring(0, 200))}</span></div>`;
  }
  if (currentMode === "python" && r.stderr) {
    html += `<div class="detail-row"><span class="label">stderr:</span><span style="color:var(--color-error)">${escapeHtml(r.stderr.substring(0, 300))}</span></div>`;
  }

  el.className = cls;
  el.innerHTML = html;
}

/* ================================================================== */
/*  Core Flow — Run Tests                                              */
/* ================================================================== */

function runTest() {
  geminiApiKey = $("gemini-key").value.trim();
  cohereApiKey = $("cohere-key").value.trim();
  if (!geminiApiKey || !cohereApiKey) {
    alert("Please enter both API keys.");
    return;
  }
  _handlePresetQuestion();
}

function runCustomTest() {
  geminiApiKey = $("gemini-key").value.trim();
  cohereApiKey = $("cohere-key").value.trim();
  if (!geminiApiKey || !cohereApiKey) {
    alert("Please enter both API keys.");
    return;
  }

  const q = $("custom-question").value.trim();
  const o = $("custom-output").value.trim();
  if (!q || !o) {
    alert("Please enter both a custom question and expected output.");
    return;
  }
  _runQuestion(q, o);
}

function _handlePresetQuestion() {
  const idx       = parseInt($("question-select").value, 10);
  const questions = currentMode === "python" ? PYTHON_QUESTIONS : KNOWLEDGE_QUESTIONS;

  if (isNaN(idx) || idx < 0 || idx >= questions.length) {
    alert("Please select a valid question.");
    return;
  }

  const qObj = questions[idx];
  _runQuestion(qObj.question, qObj.expectedOutput);
}

async function _runQuestion(question, expectedOutput) {
  // Reset state
  questionScored   = false;
  executionResults = { gemini: null, cohere: null };
  tempScores       = { gemini: "", cohere: "" };
  _clearScoreSelections();

  currentResponses.question       = question;
  currentResponses.expectedOutput = expectedOutput;

  // Show results area
  $("results-area").style.display = "block";
  setText("question-display", question);
  setText("expected-output", expectedOutput);
  setText("gemini-code", "Generating response...");
  setText("cohere-code", "Generating response...");

  const spinnerHTML = '<span class="spinner"></span>';
  setHTML("gemini-execution", `${spinnerHTML} Waiting for model...`);
  setHTML("cohere-execution", `${spinnerHTML} Waiting for model...`);
  $("gemini-execution").className = "exec-result";
  $("cohere-execution").className = "exec-result";

  // Scroll to results
  $("results-area").scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    // Call both APIs in parallel
    const [geminiResp, cohereResp] = await Promise.all([
      callGeminiAPI(question),
      callCohereAPI(question),
    ]);

    currentResponses.gemini = geminiResp;
    currentResponses.cohere = cohereResp;

    setText("gemini-code", geminiResp);
    setText("cohere-code", cohereResp);

    if (currentMode === "python") {
      setHTML("gemini-execution", `${spinnerHTML} Executing in Piston sandbox...`);
      setHTML("cohere-execution", `${spinnerHTML} Executing in Piston sandbox...`);

      // Skip execution if API returned an error
      const geminiExec = geminiResp.startsWith("ERROR:")
        ? { status: "execution_failed", error: geminiResp, score: "hallucination", message: "API Error", exitCode: null, stdout: "", stderr: geminiResp, execTime: null }
        : await executeCode(geminiResp, expectedOutput);

      const cohereExec = cohereResp.startsWith("ERROR:")
        ? { status: "execution_failed", error: cohereResp, score: "hallucination", message: "API Error", exitCode: null, stdout: "", stderr: cohereResp, execTime: null }
        : await executeCode(cohereResp, expectedOutput);

      executionResults.gemini = geminiExec;
      executionResults.cohere = cohereExec;
    } else {
      setHTML("gemini-execution", `${spinnerHTML} Comparing answer...`);
      setHTML("cohere-execution", `${spinnerHTML} Comparing answer...`);

      executionResults.gemini = compareAnswers(geminiResp, expectedOutput);
      executionResults.cohere = compareAnswers(cohereResp, expectedOutput);
    }

    displayExecutionResults();
  } catch (err) {
    console.error("Test execution failed:", err);
    setHTML("gemini-execution", `<strong>Error:</strong> ${escapeHtml(err.message)}`);
    setHTML("cohere-execution", `<strong>Error:</strong> ${escapeHtml(err.message)}`);
  }
}

function _clearScoreSelections() {
  document.querySelectorAll(".score-btn").forEach((btn) => btn.classList.remove("selected"));
  document.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = false; });
}

/* ================================================================== */
/*  Initialization                                                     */
/* ================================================================== */

function initApp() {
  populateQuestions();

  // Bind event listeners (replaces inline onclick handlers)
  $("run-btn").addEventListener("click", runTest);
  $("run-custom-btn").addEventListener("click", runCustomTest);
  $("submit-scores-btn").addEventListener("click", submitScores);

  // Mode tabs — event delegation
  document.querySelector(".mode-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".mode-tab");
    if (tab?.dataset.mode) switchMode(tab.dataset.mode);
  });

  // Score buttons — event delegation
  $("gemini-score-options").addEventListener("click", handleScoreClick);
  $("cohere-score-options").addEventListener("click", handleScoreClick);

  console.log("AI Hallucination Evaluation initialized");
  console.log("Mode 1: Python Code Execution (Piston API sandbox)");
  console.log("Mode 2: Knowledge-Based Questions (Polars, SQL, Spark, Snowflake)");
  console.log("Dataset: 100 questions total");
}

document.addEventListener("DOMContentLoaded", initApp);
