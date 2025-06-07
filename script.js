const surveyFolder = 'surveys/';

/* Hardcoded list of files (since GitHub Pages can’t list directory contents) */
const surveyFiles = [
  'test_survey.json',
  'vanderbilt_parent.json'
];

async function loadSurveys() {
  const list = document.getElementById('surveyList');
  list.innerHTML = ''; // clear "Loading..."

  for (const file of surveyFiles) {
    try {
      const response = await fetch(surveyFolder + file);
      const data = await response.json();
      const name = data.name || '(Unnamed survey)';

      const li = document.createElement('li');

      // Create survey info block
      const title = document.createElement('strong');
      title.textContent = name;

      const filename = document.createElement('span');
      filename.style.fontSize = '0.9em';
      filename.style.marginLeft = '0.5em';
      filename.style.color = '#888';
      filename.textContent = `(${file})`;

      // Create a button to "select" the survey
      const button = document.createElement('button');
      button.textContent = 'Select';
      button.style.marginLeft = '1em';
      button.onclick = () => {
        window.location.href = `survey.html?file=${encodeURIComponent(file)}`;
      };


      li.appendChild(title);
      li.appendChild(filename);
      li.appendChild(button);

      list.appendChild(li);
    } catch (err) {
      console.error(`Failed to load ${file}:`, err);
      const errorLi = document.createElement('li');
      errorLi.textContent = `❌ Failed to load ${file}`;
      errorLi.style.color = 'red';
      list.appendChild(errorLi);
    }
  }
}

loadSurveys();
