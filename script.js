(() => {
  const tabList = document.querySelector('[role="tablist"]');
  if (!tabList) return;

  const tabs = [...tabList.querySelectorAll('[role="tab"]')];

  const activateTab = (tab, moveFocus = false) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      const panel = document.getElementById(item.getAttribute('aria-controls'));
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      if (panel) panel.hidden = !selected;
    });
    if (moveFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      let nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex !== index || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        activateTab(tabs[nextIndex], true);
      }
    });
  });

  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const chatStatus = document.getElementById('chat-status');
  if (!chatForm || !chatInput || !chatMessages || !chatStatus) return;

  const stopWords = new Set(['about', 'after', 'and', 'are', 'can', 'did', 'does', 'how', 'into', 'jay', 'what', 'when', 'where', 'which', 'with', 'work', 'your']);
  let historySections = [];

  const tokenize = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((word) => word.length > 2 && !stopWords.has(word));

  const parseHistory = (text) => {
    const sections = [];
    let current = { title: 'Professional history', body: '' };
    text.split(/\r?\n/).forEach((line) => {
      const heading = line.match(/^##\s+(.+)/);
      if (heading) {
        if (current.body.trim()) sections.push(current);
        current = { title: heading[1].trim(), body: '' };
      } else {
        current.body += `${line}\n`;
      }
    });
    if (current.body.trim()) sections.push(current);
    return sections;
  };

  const addMessage = (role, text, source = '') => {
    const message = document.createElement('div');
    message.className = `chat-message chat-message-${role}`;
    const label = document.createElement('strong');
    label.textContent = role === 'user' ? 'You' : 'Assistant';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    message.append(label, paragraph);
    if (source) {
      const citation = document.createElement('span');
      citation.className = 'chat-source';
      citation.textContent = `Source: ${source}`;
      message.append(citation);
    }
    chatMessages.append(message);
    message.scrollIntoView({ block: 'nearest' });
  };

  const answerQuestion = (question) => {
    const terms = tokenize(question);
    const ranked = historySections.map((section) => {
      const titleTerms = tokenize(section.title);
      const bodyTerms = tokenize(section.body);
      const score = terms.reduce((total, term) => total + (titleTerms.includes(term) ? 4 : bodyTerms.includes(term) ? 1 : 0), 0);
      return { section, score };
    }).sort((a, b) => b.score - a.score);
    const match = ranked[0];
    if (!match || match.score === 0) return { text: 'I could not find that information in Jay\'s professional history. Try asking about technology, the Army, Cognizant, Zinnia, automation, Python, education, or career development.' };
    const excerpt = match.section.body.replace(/\s+/g, ' ').trim();
    const shortened = excerpt.length > 620 ? `${excerpt.slice(0, 617).replace(/\s+\S*$/, '')}...` : excerpt;
    return { text: shortened, source: match.section.title };
  };

  const loadHistory = fetch('data/history.txt').then((response) => {
    if (!response.ok) throw new Error('History document unavailable');
    return response.text();
  }).then((text) => {
    historySections = parseHistory(text);
    chatStatus.textContent = 'Ready. Answers are limited to the published history document.';
  }).catch(() => {
    chatStatus.textContent = 'The history document could not be loaded. Open this site through GitHub Pages or a local web server.';
  });

  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = chatInput.value.trim();
    if (!question) return;
    addMessage('user', question);
    chatInput.value = '';
    chatInput.disabled = true;
    chatStatus.textContent = 'Searching the history document...';
    await loadHistory;
    if (historySections.length) {
      const answer = answerQuestion(question);
      addMessage('bot', answer.text, answer.source);
    } else {
      addMessage('bot', 'I cannot answer yet because the history document is unavailable. Please try again when the site is being served over HTTP or HTTPS.');
    }
    chatInput.disabled = false;
    chatInput.focus();
    chatStatus.textContent = 'Ready. Answers are limited to the published history document.';
  });
})();