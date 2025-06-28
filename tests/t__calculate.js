// —— CONFIGURE YOUR SURVEYS HERE ——
// surveyFile is relative to this HTML; response files must live alongside this HTML
const tests = [
    { name: "Test Survey",    surveyFile: "../surveys/test_survey.json" },
    { name: "Vanderbilt Parent", surveyFile: "../surveys/vanderbilt_parent.json" },
    { name: "Vanderbilt Teacher", surveyFile: "../surveys/vanderbilt_teacher.json" },
    // …add more surveys here…
];

// fetch+parse JSON with better errors
async function loadJson(path) {
    let res;
    try {
    res = await fetch(path);
    } catch (_) {
    throw new Error(`Network error when loading ${path}`);
    }
    if (!res.ok) {
    if (res.status === 404) throw new Error(`File not found: ${path}`);
    else throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}`);
    }
    return res.json();
}

// Given a surveyFile path, look for response files named
// base_0.json, base_1.json, … alongside this HTML.
async function loadAllResponses(surveyFile) {
const base = surveyFile.split("/").pop().replace(/\.json$/, "");
const responses = [];
let i = 0;

for (;; i++) {
    const fname = `${base}_${i}.json`;
    try {
    const data = await loadJson(fname);
    responses.push({ file: fname, data });
    } catch (err) {
    // if the file simply isn't there…
    if (err.message.startsWith("File not found")) {
        // and we haven't loaded ANY yet, report exactly that first missing file
        if (i === 0) {
        throw new Error(`No response file found: ${fname}`);
        }
        // otherwise we've collected at least one – stop scanning
        break;
    }
    // any other error (network, bad JSON) bubble up
    throw err;
    }
}

return responses;
}

async function runTests() {
    const tbody = document.getElementById("resultsBody");
    const frag = document.createDocumentFragment();

    for (const t of tests) {
        let survey;
        // 1️⃣ load the survey definition
        try {
            survey = await loadJson(t.surveyFile);
        } catch (err) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${t.name}</td>
            <td colspan="3" class="fail">⚠️ ${err.message}</td>
            `;
            frag.appendChild(tr);
            continue;
        }

        // 2️⃣ load *all* response files for this survey
        let respList;
        try {
            respList = await loadAllResponses(t.surveyFile);
        } catch (err) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
            <td>${t.name}</td>
            <td colspan="3" class="fail">⚠️ ${err.message}</td>
            `;
            frag.appendChild(tr);
            continue;
        }

        for (const { file, data: responses } of respList) {
            const tr = document.createElement("tr");
            const scores = calculateScores(survey, responses);

            // grab just the boolean flags in order
            const actualFlags = scores
                .filter(s => s.name.startsWith("criteria-"))
                .map(s => s.meets ? 1 : 0);

            // see if they provided an expected-array
            const expectedFlags = Array.isArray(responses.expected)
                ? responses.expected
                : null;

            // only mark pass/fail if expected-array is there
            const passed = expectedFlags
                ? actualFlags.length === expectedFlags.length
                && actualFlags.every((v,i) => v === expectedFlags[i])
                : null;

            // fallback display of raw responses if no expected-array
            const respDisplay = expectedFlags
                ? `<pre>
            Expected: ${JSON.stringify(expectedFlags)}
            Actual:   ${JSON.stringify(actualFlags)}
            Result:   ${ passed ? "✅ PASS" : "❌ FAIL" }
            </pre>`
                : `<pre>${JSON.stringify(responses, null,2)}</pre>`;

            // build the row
            tr.innerHTML = `
                <td>${t.name}<br/><small>(${file})</small></td>
                <td>${respDisplay}</td>
                <td><pre>${JSON.stringify(
                Object.fromEntries(scores.map(s=>[s.name,s.value])), 
                null,2
                )}</pre></td>
                <td><pre>${
                scores
                    .filter(s=>s.name.startsWith("criteria-"))
                    .map(s => `${s.comment}: ${s.meets?"✅":"❌"}`)
                    .join("\n") || "(none)"
                }</pre></td>
            `;
            frag.appendChild(tr);
            }
    }

    tbody.appendChild(frag);
}

runTests();