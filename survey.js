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

    q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.className = 'optionBtn';
    btn.onclick = () => {
        responses[q.number] = idx;
        if (currentQuestion < surveyData.questions.length - 1) currentQuestion++;
        renderCurrentQuestion(); // refresh for highlight
        populateSidebar();
    };

    if (responses[q.number] === idx) {
        btn.classList.add('selected');
    }

    wrapper.appendChild(btn);
    });

    container.appendChild(wrapper);

    document.getElementById('prevBtn').disabled = currentQuestion === 0;
    document.getElementById('nextBtn').disabled = currentQuestion === surveyData.questions.length - 1;
    document.getElementById('navControls').style.display = 'flex';
}

function renderResults() {
  const scores = calculateScores(surveyData, responses);
  const container = document.getElementById('questionContainer');
  const resultsDiv = document.getElementById('resultsContainer');

  container.innerHTML = '';
  resultsDiv.innerHTML = '<h3>📊 Results:</h3>';

  scores.forEach(score => {
    const p = document.createElement('p');
    p.textContent = `${score.name}: ${score.value}`;
    resultsDiv.appendChild(p);
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

  surveyData.questions.forEach((q, i) => {
    const li = document.createElement('li');
    const answer = responses[q.number];
    const status = answer !== undefined ? answer : 'x';

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
    if (method.type === 'sum') {
      let total = 0;
      data.questions.forEach(q => {
        const answer = responses[q.number];
        if (answer !== undefined) total += method.values[answer];
      });
      scores.push({ name: method.name, value: total });

    } else if (method.type === 'countAbove') {
      let count = 0;
      data.questions.forEach(q => {
        const answer = responses[q.number];
        if (answer !== undefined && method.values[answer] >= method.threshold) {
          count++;
        }
      });
      scores.push({ name: method.name, value: count });

    } else if (method.type === 'criteria') {
      const passed = method.require.every(rule => {
        const values = rule.questions.map(qNum => responses[qNum]);

        if (rule.type === 'countInRange') {
          const count = values.filter(v => v >= rule.range[0] && v <= rule.range[1]).length;
          return count >= rule.minCount;
        }

        if (rule.type === 'anyInRange') {
          return values.some(v => v >= rule.range[0] && v <= rule.range[1]);
        }

        return false;
      });

      scores.push({
        name: method.name,
        value: passed ? '✅ met' : '❌ not met'
      });
    }
  });

  return scores;
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
