/* Global Vars */

let currentQuestion = 0;
let surveyData = null;
const responses = {};
let viewingResults = false;

/* DECLARE FUNCS */

function getQueryParam(param) {
  const url = new URL(window.location.href);
  return url.searchParams.get(param);
}

async function loadSurvey() {
  const file = getQueryParam('file');
  const titleEl = document.getElementById('surveyTitle');

  if (!file) {
    titleEl.textContent = 'No survey file provided.';
    return;
  }

  try {
    const response = await fetch(`surveys/${file}`);
    surveyData = await response.json();

    titleEl.textContent = surveyData.name || 'Unnamed Survey';

    populateSidebar();
    renderCurrentQuestion();
  } catch (err) {
    titleEl.textContent = 'Failed to load survey.';
    console.error(err);
  }
}

function renderCurrentQuestion() {
    document.getElementById('surveyContent').style.display = 'block';
    const q = surveyData.questions[currentQuestion];
    const container = document.getElementById('questionContainer');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    const question = document.createElement('p');
    question.innerHTML = `<strong>${q.number}.</strong> ${q.text}`;
    wrapper.appendChild(question);

    // Find the relevant values mapping
    const methodWithValues = surveyData.scoring?.methods.find(m => m.values && (m.questions === undefined || m.questions.includes(q.number)));
    const values = methodWithValues?.values || q.options.map((_, i) => i); // default fallback

    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      const scoreValue = values[idx];

      btn.textContent = `${scoreValue} :  ${opt}`;
      btn.className = 'optionBtn';

      btn.onclick = () => {
        // store the real scoreValue, not the idx
        responses[q.number] = scoreValue; 
        if (currentQuestion < surveyData.questions.length - 1) currentQuestion++;
        renderCurrentQuestion();
        populateSidebar();
      };

      if (responses[q.number] === scoreValue) {
          btn.classList.add('selected');
      }

      wrapper.appendChild(btn);
    });

    container.appendChild(wrapper);

    document.getElementById('prevBtn').disabled = currentQuestion === 0;
    document.getElementById('nextBtn').disabled = currentQuestion === surveyData.questions.length - 1;
    document.getElementById('navControls').style.display = 'flex';
}

function generateScoreLabel(method) {
  const qCount = method.questions?.length;
  const qRange = method.questions ? ` (Q${method.questions[0]}–${method.questions[method.questions.length - 1]})` : '';

  switch (method.type) {
    case "sum":
      return `Total Score${qRange}`;
    case "average":
      return `Average Rating${qRange}`;
    case "countAbove":
      return `Numer of answers ≥${method.threshold}${qRange}`;
    case "criteria":
      return `Criteria Met: ${method.name}`;
    default:
      return method.name;
  }
}

function renderResults() {
  const scores = calculateScores(surveyData, responses);
  const container = document.getElementById('questionContainer');
  const resultsDiv = document.getElementById('resultsContainer');

  container.innerHTML = '';
  resultsDiv.innerHTML = '<h3>📊 Results:</h3>';

  scores.forEach(score => {
    const method = surveyData.scoring.methods.find(m => m.name === score.name);
    const label = method ? generateScoreLabel(method) : score.name;

    const div = document.createElement('div');
    div.className = 'resultItem';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'resultLabel';
    labelSpan.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'resultValue';
    valueSpan.textContent = score.value;

    div.appendChild(labelSpan);
    div.appendChild(valueSpan);
    resultsDiv.appendChild(div);
  });

  document.getElementById('surveyContent').style.display = 'none';
}

function navigateTo(target) {
  const container = document.getElementById('questionContainer');
  const results = document.getElementById('resultsContainer');

  if (target === "results") {
    viewingResults = true;
    currentQuestion = null;
    renderResults();
    results.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  viewingResults = false;
  currentQuestion = target;
  results.innerHTML = '';
  renderCurrentQuestion();
}

function populateSidebar() {
    const list = document.getElementById('questionList');
    list.innerHTML = '';

    // 🏠 Home link
    const homeLi = document.createElement('li');
    homeLi.textContent = '🏠 Home';
    homeLi.style.fontWeight = 'bold';
    homeLi.onclick = () => {
    window.location.href = 'index.html';
    };
    list.appendChild(homeLi);

  surveyData.questions.forEach((q, i) => {
    const li = document.createElement('li');
    const answer = responses[q.number];
    const answerIndex = responses[q.number];
    let status = 'x';

    // This is where I get the answer *value* from json, so index 0 might actually be a 1 and we need to reflect that.
    if (answerIndex !== undefined) {
      const method = surveyData.scoring.methods.find(m =>
        m.values && (!m.questions || m.questions.includes(q.number))
      );

      const value = method?.values?.[answerIndex];
      status = value !== undefined ? value : answerIndex;
    }

    li.textContent = `${q.number}. ${q.text.slice(0, 20)}... : ${status}`;
    li.onclick = () => {
      navigateTo(i);
      document.getElementById('sideMenu').classList.remove('visible');
    };

    li.className = answer !== undefined ? 'green' : 'gray';
    list.appendChild(li);
  });

  // Add results nav item if available
  if (viewingResults) {
    const li = document.createElement('li');
    li.textContent = 'Calculated Results';
    li.onclick = () => {
      navigateTo("results");
      document.getElementById('sideMenu').classList.remove('visible');
    };
    li.style.fontWeight = 'bold';
    list.appendChild(li);
  }
}

function calculateScores(data, responses) {
  const scores = [];

  data.scoring.methods.forEach(method => {
    console.log(`\n🔍 Calculating "${method.name}" (${method.type})`);

    if (method.type === 'sum') {
      let total = 0;
      const qList = method.questions || data.questions.map(q => q.number);

      qList.forEach(qNum => {
        const answer = responses[qNum];
        // if answer is already a number, use it; otherwise map via values[]
        const val = typeof answer === 'number'
          ? answer
          : method.values?.[answer];
        if (val !== undefined) total += val;
      });

      scores.push({ name: method.name, value: total });
    }
    else if (method.type === 'countAbove') {
      let count = 0;
      const qList = method.questions || data.questions.map(q => q.number);

      qList.forEach(qNum => {
        const answer = responses[qNum];
        const val = typeof answer === 'number'
          ? answer
          : method.values?.[answer];
        if (val !== undefined && val >= method.threshold) {
          count++;
        }
      });

      scores.push({ name: method.name, value: count });
    }
    else if (method.type === 'criteria') {
      const passed = method.require.every(rule => {
        const values = rule.questions.map(qNum => responses[qNum]);

        if (rule.type === 'countInRange') {
          const count = values.filter(v => v >= rule.range[0] && v <= rule.range[1]).length;
          console.log(`📐 countInRange: ${count} in range ${rule.range}`);
          return count >= rule.minCount;
        }

        if (rule.type === 'anyInRange') {
          const pass = values.some(v => v >= rule.range[0] && v <= rule.range[1]);
          console.log(`📐 anyInRange passed? ${pass}`);
          return pass;
        }

        return false;
      });

      console.log(`➡️ Criteria ${method.name}: ${passed ? '✅' : '❌'}`);
      scores.push({
        name: method.name,
        value: passed ? '✅ met' : '❌ not met',
        meets: passed
      });

    } else if (method.type === 'average') {
      let total = 0;
      let count = 0;

      method.questions.forEach(qNum => {
        const answer = responses[qNum];
        const val = typeof answer === 'number'
          ? answer
          : method.values?.[answer];
        if (answer !== undefined && val !== undefined) {
          total += val;
          count++;
        }
      });

      const avg = count > 0 ? (total / count).toFixed(2) : "N/A";
      console.log(`➡️ Average for ${method.name}: ${avg}`);
      scores.push({ name: method.name, value: avg });
    }
  });

  const criteria = data.scoring.criteria || [];
  const methodScores = Object.fromEntries(scores.map(s => [s.name, s.value]));

  criteria.forEach(flag => {
    let result = evaluateCriteria(flag, methodScores);

    scores.push({
      name: `criteria-${flag.comment}`,
      value: result ? '✅ met' : '❌ not met',
      meets: result,
      comment: flag.comment
    });
  });

  return scores;
}

function evaluateCriteria(flag, methodScores) {
  const logicType = '&&' in flag ? '&&' : '||' in flag ? '||' : null;
  if (!logicType || !Array.isArray(flag[logicType])) return false;

  const checks = flag[logicType].map(cond => {
    const methodValue = methodScores[cond.method];
    if (methodValue === undefined) return false;

    // Simple match like ">=6", "<4", etc.
    const match = cond.meets.match(/(>=|<=|>|<|==|=|!=)\s*(\d+)/);
    if (!match) return false;

    const [_, op, numStr] = match;
    const num = parseFloat(numStr);

    switch (op) {
      case '>': return methodValue > num;
      case '>=': return methodValue >= num;
      case '<': return methodValue < num;
      case '<=': return methodValue <= num;
      case '!=': return methodValue != num;
      case '=':
      case '==': return methodValue == num;
      default: return false;
    }
  });

  return logicType === '&&' ? checks.every(Boolean) : checks.some(Boolean);
}


/* RUNNTINGS */

document.getElementById('menuToggle').onclick = () => {
  document.getElementById('sideMenu').classList.toggle('visible');
};

document.getElementById('prevBtn').onclick = () => {
  if (currentQuestion > 0) {
    currentQuestion--;
    renderCurrentQuestion();
  }
};

document.getElementById('nextBtn').onclick = () => {
  if (currentQuestion < surveyData.questions.length - 1) {
    currentQuestion++;
    renderCurrentQuestion();
  }
};

// Load the survey
loadSurvey();
// After loading the survey, set up submit onclick
document.getElementById('submitBtn').onclick = () => {
  // Check for unanswered questions
  const unanswered = surveyData.questions.find(q => responses[q.number] === undefined);

  if (unanswered) {
    alert(`❗ Please answer Question ${unanswered.number} before submitting.`);
    currentQuestion = surveyData.questions.indexOf(unanswered);
    navigateTo(currentQuestion);
    return;
  }

  // All answered, score it!
  const scores = calculateScores(surveyData, responses);
  const resultsDiv = document.getElementById('resultsContainer');
  resultsDiv.innerHTML = '<h3>Results:</h3>';

  scores.forEach(score => {
    const p = document.createElement('p');
    p.textContent = `${score.name}: ${score.value}`;
    resultsDiv.appendChild(p);
  });

  navigateTo("results");
  populateSidebar();
};

document.addEventListener("keydown", (e) => {
  // don’t intercept typing
  if (document.activeElement.tagName === "INPUT") return;

  const key = e.key;
  const optionButtons = document.querySelectorAll("#questionContainer .optionBtn");

  // ------------ NUMBER KEYS ------------
  const raw = parseInt(key, 10);
  if (!isNaN(raw)) {
    // Derive this question's values[]
    const q      = surveyData.questions[currentQuestion];
    const method = surveyData.scoring.methods.find(m =>
      m.values && (!m.questions || m.questions.includes(q.number))
    );
    const values = method?.values || q.options.map((_, i) => i);

    // Map the pressed key directly to the scoreValue array
    const idx = values.indexOf(raw);
    if (idx >= 0 && idx < optionButtons.length) {
      optionButtons[idx].click();
    }
    return;
  }

  // ------------ ARROW KEYS ------------
  if (key === "ArrowRight") {
    document.getElementById("nextBtn")?.click();
  } else if (key === "ArrowLeft") {
    document.getElementById("prevBtn")?.click();
  }

  // ------------ ENTER KEY ------------
  else if (key === "Enter") {
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
    }
  }
});

document.addEventListener('click', (e) => {
  const sideMenu = document.getElementById('sideMenu');
  const menuToggle = document.getElementById('menuToggle');

  // If menu is open AND click is outside both menu and toggle
  if (
    sideMenu.classList.contains('visible') &&
    !sideMenu.contains(e.target) &&
    !menuToggle.contains(e.target)
  ) {
    sideMenu.classList.remove('visible');
  }
});

