/**
 * AI Hallucination Evaluation — Application Logic
 *
 * Dual-mode evaluation framework:
 *   Mode 1 — Python code execution via Piston API sandbox
 *   Mode 2 — Knowledge-based factual accuracy via string comparison
 *
 * Models: Google Gemini 2.5 Flash, Cohere Command R7B
 *
 * Author:  Arun Narayanan
 * License: MIT
 */

"use strict";

/* ================================================================== */
/*  State                                                              */
/* ================================================================== */

var geminiApiKey  = "";
var cohereApiKey  = "";
var currentMode   = "python";   // "python" | "knowledge"
var isCustomQuestion    = false;
var currentQuestionIndex = 0;
var questionScored = false;

var testResults = {
  gemini: { correct: 0, hallucination: 0, format_violation: 0, refused: 0, total: 0 },
  cohere: { correct: 0, hallucination: 0, format_violation: 0, refused: 0, total: 0 }
};

var currentResponses = { gemini: "", cohere: "", expectedOutput: "", question: "" };
var tempScores       = { gemini: "", cohere: "" };
var executionResults  = { gemini: null, cohere: null };

/* ================================================================== */
/*  Piston API — Code Execution with Retry                             */
/* ================================================================== */

var PISTON_URL   = "https://emkc.org/api/v2/piston/execute";
var MAX_RETRIES  = 2;

function executeCode(pythonCode, expectedOutput) {
  return _executeWithRetry(pythonCode, expectedOutput, 0);
}

function _executeWithRetry(pythonCode, expectedOutput, attempt) {
  var payload = {
    language: "python",
    version:  "3.10.0",
    files:    [{ content: pythonCode }],
    stdin:    "",
    args:     [],
    compile_timeout: 10000,
    run_timeout:     5000
  };

  return fetch(PISTON_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  })
  .then(function (res) { return res.json(); })
  .then(function (result) {

    /* Compile errors */
    if (result.compile && result.compile.stderr) {
      return {
        status:  "syntax_error",
        error:   result.compile.stderr,
        score:   "hallucination",
        message: "Syntax Error",
        exitCode: result.compile.code,
        stdout:  "",
        stderr:  result.compile.stderr,
        execTime: null
      };
    }

    /* Runtime errors */
    if (result.run && result.run.stderr) {
      return {
        status:  "runtime_error",
        error:   result.run.stderr,
        score:   "hallucination",
        message: "Runtime Error",
        exitCode: result.run.code,
        stdout:  result.run.stdout || "",
        stderr:  result.run.stderr,
        execTime: null
      };
    }

    var actual = (result.run && result.run.stdout) ? result.run.stdout.trim() : "";

    /* Retry on empty output (Piston transient issue) */
    if (actual === "" && attempt < MAX_RETRIES) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(_executeWithRetry(pythonCode, expectedOutput, attempt + 1));
        }, 500);
      });
    }

    var display = actual === "" ? "(empty)" : actual;

    /* Exact match */
    if (actual === expectedOutput.trim()) {
      return _pistonResult("correct",      display, "correct",       "Correct Output", result);
    }

    /* Format violation: answer is embedded in extra text */
    if (actual !== expectedOutput.trim() && _containsAnswer(actual, expectedOutput.trim())) {
      return _pistonResult("format_issue", display, "format_violation", "Format Violation — correct answer with extra text", result);
    }

    /* Wrong output */
    return {
      status:   "wrong_output",
      expected: expectedOutput.trim(),
      actual:   display,
      score:    "hallucination",
      message:  "Incorrect Output",
      exitCode: result.run ? result.run.code : null,
      stdout:   actual,
      stderr:   "",
      execTime: null
    };
  })
  .catch(function (err) {
    if (attempt < MAX_RETRIES) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(_executeWithRetry(pythonCode, expectedOutput, attempt + 1));
        }, 500);
      });
    }
    return {
      status: "execution_failed", error: err.message,
      score: "hallucination", message: "Execution Failed",
      exitCode: null, stdout: "", stderr: err.message, execTime: null
    };
  });
}

function _pistonResult(status, output, score, message, raw) {
  return {
    status:   status,
    output:   output,
    score:    score,
    message:  message,
    exitCode: raw.run ? raw.run.code : null,
    stdout:   raw.run ? (raw.run.stdout || "") : "",
    stderr:   raw.run ? (raw.run.stderr || "") : "",
    execTime: null
  };
}

/**
 * Checks if the expected answer appears inside the actual output.
 * Handles cases like Cohere returning "The answer is: 3" when expected is "3".
 */
function _containsAnswer(actual, expected) {
  if (!actual || !expected) return false;
  var a = actual.toLowerCase().trim();
  var e = expected.toLowerCase().trim();
  if (a === e) return false; // exact match handled elsewhere
  return a.indexOf(e) !== -1;
}

/**
 * Attempt to extract just the answer from verbose model output.
 * Strips common preambles like "The answer is:", "Output:", etc.
 */
function _extractAnswer(raw) {
  var text = raw.trim();
  // Strip markdown backtick fences
  text = text.replace(/^```[\s\S]*?```$/gm, "").trim();
  // Strip common preamble patterns
  var patterns = [
    /^(?:the\s+)?(?:answer|result|output)\s*(?:is|=|:)\s*/i,
    /^(?:it\s+(?:is|returns?|outputs?|prints?)\s*:?\s*)/i,
    /^>\s*/
  ];
  for (var i = 0; i < patterns.length; i++) {
    text = text.replace(patterns[i], "");
  }
  // Take only first line if multi-line
  var lines = text.split("\n");
  return lines[0].trim();
}

/* ================================================================== */
/*  Knowledge Mode — Answer Comparison                                 */
/* ================================================================== */

function compareAnswers(aiAnswer, expectedAnswer) {
  var rawAnswer   = aiAnswer.trim();
  var extracted   = _extractAnswer(rawAnswer);
  var expected    = expectedAnswer.toLowerCase().trim();
  var extractedLc = extracted.toLowerCase();
  var rawLc       = rawAnswer.toLowerCase();

  // Direct match (raw or extracted)
  if (rawLc === expected || extractedLc === expected) {
    return { status: "correct", output: rawAnswer, score: "correct", message: "Correct Answer" };
  }

  // Partial containment — extracted answer contains expected or vice-versa
  if (extractedLc.indexOf(expected) !== -1 || expected.indexOf(extractedLc) !== -1) {
    // If the raw answer is much longer than expected, it is a format violation
    if (rawAnswer.length > expected.length * 3 && rawAnswer.length > 20) {
      return {
        status: "format_issue", output: rawAnswer, score: "format_violation",
        message: "Format Violation — correct answer embedded in extra text"
      };
    }
    return { status: "correct", output: rawAnswer, score: "correct", message: "Correct Answer (partial match)" };
  }

  // Wrong answer
  return {
    status: "wrong_output", expected: expectedAnswer, actual: rawAnswer,
    score: "hallucination", message: "Incorrect Answer"
  };
}

/* ================================================================== */
/*  API Integration                                                    */
/* ================================================================== */

function callGeminiAPI(question) {
  var prompt = currentMode === "python"
    ? "Write complete Python code that solves this problem. Only provide the code, no explanations:\n\n" + question
    : "Answer with ONLY the exact function name, keyword, or term. No explanations, no extra text:\n\n" + question;

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

  return fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  })
  .then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error && data.error.message ? data.error.message : "HTTP " + res.status);
      return data;
    });
  })
  .then(function (data) {
    var text = _extractGeminiText(data);
    return currentMode === "python" ? _stripCodeFence(text) : text;
  })
  .catch(function (err) { return "ERROR: " + err.message; });
}

function callCohereAPI(question) {
  var systemMsg = currentMode === "python"
    ? "You are a Python code generator. Return ONLY executable Python code. No markdown fences, no explanations, no comments."
    : "You are a precise answer bot. Return ONLY the exact function name, keyword, or term. Never explain. Never add any extra words or context.";

  var userMsg = currentMode === "python"
    ? "Write complete Python code that solves this problem. Only provide the code, no explanations:\n\n" + question
    : "Answer with ONLY the exact function name, keyword, or term. No explanations, no extra text:\n\n" + question;

  return fetch("https://api.cohere.com/v2/chat", {
    method:  "POST",
    headers: {
      "Authorization": "Bearer " + cohereApiKey,
      "Content-Type":  "application/json",
      "Accept":        "application/json"
    },
    body: JSON.stringify({
      model: "command-r7b-12-2024",
      messages: [
        { role: "system", content: systemMsg },
        { role: "user",   content: userMsg }
      ]
    })
  })
  .then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.message || "HTTP " + res.status);
      return data;
    });
  })
  .then(function (data) {
    var text = _extractCohereText(data);
    return currentMode === "python" ? _stripCodeFence(text) : text;
  })
  .catch(function (err) { return "ERROR: " + err.message; });
}

/* ------------------------------------------------------------------ */
/*  Response parsing helpers                                           */
/* ------------------------------------------------------------------ */

function _extractGeminiText(data) {
  try {
    return data.candidates[0].content.parts[0].text.trim();
  } catch (e) {
    throw new Error("Unexpected Gemini response format");
  }
}

function _extractCohereText(data) {
  try {
    return data.message.content[0].text.trim();
  } catch (e) {
    throw new Error("Unexpected Cohere response format");
  }
}

function _stripCodeFence(text) {
  var pythonMarker = "```python";
  var fence        = "```";
  if (text.indexOf(pythonMarker) !== -1) {
    var parts = text.split(pythonMarker);
    if (parts.length > 1) return parts[1].split(fence)[0].trim();
  } else if (text.indexOf(fence) !== -1) {
    var parts2 = text.split(fence);
    if (parts2.length > 1) return parts2[1].split(fence)[0].trim();
  }
  return text;
}

/* ================================================================== */
/*  UI — Mode Switching                                                */
/* ================================================================== */

function switchMode(mode) {
  currentMode = mode;

  // Tab state
  document.getElementById("tab-python").classList.toggle("active", mode === "python");
  document.getElementById("tab-knowledge").classList.toggle("active", mode === "knowledge");
  document.getElementById("tab-python").setAttribute("aria-selected",   mode === "python");
  document.getElementById("tab-knowledge").setAttribute("aria-selected", mode === "knowledge");

  if (mode === "python") {
    document.getElementById("banner-title").textContent = "Mode: Python Code Execution";
    document.getElementById("banner-desc").textContent =
      "AI models generate Python code to solve each challenge. Code is executed in a secure sandbox (Piston API) " +
      "and the output is compared against the expected result. 50 questions across edge cases, string operations, " +
      "algorithms, and data structures.";
    document.getElementById("mode-note-text").innerHTML =
      '<strong>Python mode:</strong> Code execution powered by the ' +
      '<a href="https://github.com/engineer-man/piston" target="_blank" rel="noopener">Piston API</a> ' +
      '(free, sandboxed environment).';
    document.getElementById("picker-title").textContent  = "Select Challenge";
    document.getElementById("run-btn").textContent        = "Run Test";
    document.getElementById("category-hint").textContent   = "Categories: EdgeCase, StringTrick, Algorithm, DataStructure";
    document.getElementById("gemini-title").textContent    = "Gemini — Generated Code";
    document.getElementById("cohere-title").textContent    = "Cohere — Generated Code";
    document.getElementById("expected-label").textContent  = "Expected Output";
    document.getElementById("question-label").textContent  = "Challenge";
  } else {
    document.getElementById("banner-title").textContent = "Mode: Knowledge-Based Questions";
    document.getElementById("banner-desc").textContent =
      "AI models answer technical questions with brief, precise answers. Responses are compared against " +
      "ground-truth using exact and partial string matching. 50 questions across Polars, SQL, Spark, and Snowflake.";
    document.getElementById("mode-note-text").innerHTML =
      '<strong>Knowledge mode:</strong> Tests factual accuracy and terminology precision across specialized technical domains.';
    document.getElementById("picker-title").textContent  = "Select Question";
    document.getElementById("run-btn").textContent        = "Run Knowledge Test";
    document.getElementById("category-hint").textContent   = "Categories: Polars, SQL, Spark, Snowflake";
    document.getElementById("gemini-title").textContent    = "Gemini — Answer";
    document.getElementById("cohere-title").textContent    = "Cohere — Answer";
    document.getElementById("expected-label").textContent  = "Expected Answer";
    document.getElementById("question-label").textContent  = "Question";
  }

  populateQuestions();
  document.getElementById("results-area").style.display = "none";
}

/* ================================================================== */
/*  UI — Question Dropdown                                             */
/* ================================================================== */

function populateQuestions() {
  var select = document.getElementById("question-select");
  select.innerHTML = '<option value="">-- Select a question --</option>';

  var questions = currentMode === "python" ? PYTHON_QUESTIONS : KNOWLEDGE_QUESTIONS;

  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];
    var opt = document.createElement("option");
    opt.value = i;
    opt.textContent = "Q" + q.id + " [" + q.category + "] " + q.question.substring(0, 65) + (q.question.length > 65 ? "..." : "");
    select.appendChild(opt);
  }
}

/* ================================================================== */
/*  UI — Score Selection (fixed: explicit event parameter)             */
/* ================================================================== */

function selectScore(api, scoreType, evt) {
  tempScores[api] = scoreType;

  var buttons = document.querySelectorAll("#" + api + "-score-options .score-btn");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove("selected");
  }

  var target = evt.currentTarget;
  target.classList.add("selected");
  var radio = target.querySelector('input[type="radio"]');
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

  var gScore = tempScores.gemini || executionResults.gemini.score;
  var cScore = tempScores.cohere || executionResults.cohere.score;

  _tallyScore("gemini", gScore);
  _tallyScore("cohere", cScore);

  updateStatistics();
  questionScored = true;
  alert("Scores submitted. Select the next question to continue.");
}

function _tallyScore(model, score) {
  testResults[model].total++;
  if (score === "correct")               testResults[model].correct++;
  else if (score === "format_violation")  testResults[model].format_violation++;
  else if (score === "refused")           testResults[model].refused++;
  else                                    testResults[model].hallucination++;
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
  var s = testResults[model];
  var accuracy = s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : "0.0";
  var hallRate = s.total > 0 ? ((s.hallucination / s.total) * 100).toFixed(1) : "0.0";

  document.getElementById(model + "-stats").innerHTML =
    '<div class="stat-row"><span class="stat-label">Correct</span><span class="stat-value">' + s.correct + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Hallucinations</span><span class="stat-value">' + s.hallucination + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Format Violations</span><span class="stat-value">' + s.format_violation + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Refused</span><span class="stat-value">' + s.refused + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Accuracy</span><span class="stat-value">' + accuracy + '%</span></div>' +
    '<div class="stat-row"><span class="stat-label">Hallucination Rate</span><span class="stat-value">' + hallRate + '%</span></div>';
}

function _renderLeaderboard() {
  var g = testResults.gemini;
  var c = testResults.cohere;
  var gAcc = g.total > 0 ? ((g.correct / g.total) * 100).toFixed(1) : "0.0";
  var cAcc = c.total > 0 ? ((c.correct / c.total) * 100).toFixed(1) : "0.0";

  var leader = parseFloat(gAcc) > parseFloat(cAcc) ? "Gemini"
             : parseFloat(cAcc) > parseFloat(gAcc) ? "Cohere"
             : "Tie";

  document.getElementById("leader-name").textContent   = leader;
  document.getElementById("leader-gemini").textContent  = gAcc + "%";
  document.getElementById("leader-cohere").textContent  = cAcc + "%";
  document.getElementById("leader-total").textContent   = g.total;
}

/* ================================================================== */
/*  UI — Display Execution / Comparison Results                        */
/* ================================================================== */

function displayExecutionResults() {
  _renderExecResult("gemini");
  _renderExecResult("cohere");
}

function _renderExecResult(model) {
  var r   = executionResults[model];
  var el  = document.getElementById(model + "-execution");
  var html = "";
  var cls  = "exec-result";

  if (r.status === "correct") {
    cls += " correct";
    html += '<strong>Status: ' + r.message + '</strong>';
    html += '<div class="detail-row"><span class="label">Output:</span><span>' + _escapeHtml(r.output) + '</span></div>';
  } else if (r.status === "format_issue") {
    cls += " format";
    html += '<strong>Status: ' + r.message + '</strong>';
    html += '<div class="detail-row"><span class="label">Output:</span><span>' + _escapeHtml(r.output || r.actual || "") + '</span></div>';
    html += '<div class="detail-row"><span class="label">Note:</span><span>The correct answer is present but the model added extra text.</span></div>';
  } else if (r.status === "wrong_output") {
    cls += " wrong";
    html += '<strong>Status: ' + r.message + '</strong>';
    html += '<div class="detail-row"><span class="label">Expected:</span><span>' + _escapeHtml(r.expected) + '</span></div>';
    html += '<div class="detail-row"><span class="label">Received:</span><span>' + _escapeHtml(r.actual) + '</span></div>';
  } else {
    cls += " error";
    html += '<strong>Status: ' + r.message + '</strong>';
    html += '<div class="detail-row"><span class="label">Error:</span><span>' + _escapeHtml(r.error || "Unknown") + '</span></div>';
  }

  /* Show Piston details for code mode */
  if (currentMode === "python" && r.exitCode !== undefined && r.exitCode !== null) {
    html += '<div class="detail-row"><span class="label">Exit Code:</span><span>' + r.exitCode + '</span></div>';
  }
  if (currentMode === "python" && r.stdout) {
    html += '<div class="detail-row"><span class="label">stdout:</span><span>' + _escapeHtml(r.stdout.substring(0, 200)) + '</span></div>';
  }
  if (currentMode === "python" && r.stderr) {
    html += '<div class="detail-row"><span class="label">stderr:</span><span style="color:var(--color-error)">' + _escapeHtml(r.stderr.substring(0, 300)) + '</span></div>';
  }

  el.className = cls;
  el.innerHTML = html;
}

function _escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ================================================================== */
/*  Core Flow — Run Tests                                              */
/* ================================================================== */

function runTest() {
  geminiApiKey = document.getElementById("gemini-key").value.trim();
  cohereApiKey = document.getElementById("cohere-key").value.trim();
  if (!geminiApiKey || !cohereApiKey) { alert("Please enter both API keys."); return; }

  isCustomQuestion = false;
  _handlePresetQuestion();
}

function runCustomTest() {
  geminiApiKey = document.getElementById("gemini-key").value.trim();
  cohereApiKey = document.getElementById("cohere-key").value.trim();
  if (!geminiApiKey || !cohereApiKey) { alert("Please enter both API keys."); return; }

  var q = document.getElementById("custom-question").value.trim();
  var o = document.getElementById("custom-output").value.trim();
  if (!q || !o) { alert("Please enter both a custom question and expected output."); return; }

  isCustomQuestion = true;
  _runQuestion(q, o);
}

function _handlePresetQuestion() {
  var idx = parseInt(document.getElementById("question-select").value, 10);
  var questions = currentMode === "python" ? PYTHON_QUESTIONS : KNOWLEDGE_QUESTIONS;

  if (isNaN(idx) || idx < 0 || idx >= questions.length) {
    alert("Please select a valid question.");
    return;
  }

  var qObj = questions[idx];
  _runQuestion(qObj.question, qObj.expectedOutput);
}

function _runQuestion(question, expectedOutput) {
  // Reset state
  questionScored = false;
  executionResults = { gemini: null, cohere: null };
  tempScores = { gemini: "", cohere: "" };
  _clearScoreSelections();

  currentResponses.question       = question;
  currentResponses.expectedOutput = expectedOutput;

  // Show results area
  document.getElementById("results-area").style.display = "block";
  document.getElementById("question-display").textContent = question;
  document.getElementById("expected-output").textContent  = expectedOutput;
  document.getElementById("gemini-code").textContent = "Generating response...";
  document.getElementById("cohere-code").textContent = "Generating response...";
  document.getElementById("gemini-execution").innerHTML = '<span class="spinner"></span> Waiting for model...';
  document.getElementById("cohere-execution").innerHTML = '<span class="spinner"></span> Waiting for model...';
  document.getElementById("gemini-execution").className = "exec-result";
  document.getElementById("cohere-execution").className = "exec-result";

  // Scroll to results
  document.getElementById("results-area").scrollIntoView({ behavior: "smooth", block: "start" });

  // Call both APIs in parallel
  Promise.all([callGeminiAPI(question), callCohereAPI(question)])
    .then(function (results) {
      var geminiResp = results[0];
      var cohereResp = results[1];

      currentResponses.gemini = geminiResp;
      currentResponses.cohere = cohereResp;

      document.getElementById("gemini-code").textContent = geminiResp;
      document.getElementById("cohere-code").textContent = cohereResp;

      if (currentMode === "python") {
        document.getElementById("gemini-execution").innerHTML = '<span class="spinner"></span> Executing in Piston sandbox...';
        document.getElementById("cohere-execution").innerHTML = '<span class="spinner"></span> Executing in Piston sandbox...';

        return Promise.all([
          executeCode(geminiResp, expectedOutput),
          executeCode(cohereResp, expectedOutput)
        ]).then(function (execResults) {
          executionResults.gemini = execResults[0];
          executionResults.cohere = execResults[1];
          displayExecutionResults();
        });
      } else {
        document.getElementById("gemini-execution").innerHTML = '<span class="spinner"></span> Comparing answer...';
        document.getElementById("cohere-execution").innerHTML = '<span class="spinner"></span> Comparing answer...';

        executionResults.gemini = compareAnswers(geminiResp, expectedOutput);
        executionResults.cohere = compareAnswers(cohereResp, expectedOutput);
        displayExecutionResults();
      }
    });
}

function _clearScoreSelections() {
  var btns = document.querySelectorAll(".score-btn");
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove("selected");
  var radios = document.querySelectorAll('input[type="radio"]');
  for (var j = 0; j < radios.length; j++) radios[j].checked = false;
}

/* ================================================================== */
/*  Initialization                                                     */
/* ================================================================== */

function initApp() {
  populateQuestions();
  console.log("AI Hallucination Evaluation initialized");
  console.log("Mode 1: Python Code Execution (Piston API sandbox)");
  console.log("Mode 2: Knowledge-Based Questions (Polars, SQL, Spark, Snowflake)");
  console.log("Dataset: 100 questions total");
}

document.addEventListener("DOMContentLoaded", initApp);
