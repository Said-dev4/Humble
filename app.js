// HUMBLE Web Application - Client-Side Controller (app.js)

// --- STATE MANAGEMENT ---
let currentUser = null;
let stories = [];
let journals = [];
let currentQuizQuestionIndex = 0;
let quizScore = 0;
let selectedJournalMood = null;

// Initialize data from localStorage or fallback to data.js templates
function initAppState() {
  // Load session
  const savedSession = localStorage.getItem('humble_session');
  if (savedSession) {
    currentUser = JSON.parse(savedSession);
  }

  // Load users (initialize empty array if none exist)
  if (!localStorage.getItem('humble_users')) {
    localStorage.setItem('humble_users', JSON.stringify([]));
  }

  // Load stories
  const savedStories = localStorage.getItem('humble_stories');
  if (savedStories) {
    stories = JSON.parse(savedStories);
  } else {
    // Populate with default mock stories
    stories = [...HumbleData.stories];
    localStorage.setItem('humble_stories', JSON.stringify(stories));
  }

  // Load journals
  const savedJournals = localStorage.getItem('humble_journals');
  if (savedJournals) {
    journals = JSON.parse(savedJournals);
  } else {
    journals = [];
    localStorage.setItem('humble_journals', JSON.stringify([]));
  }
}

// Save helpers
function saveStories() {
  localStorage.setItem('humble_stories', JSON.stringify(stories));
}

function saveJournals() {
  localStorage.setItem('humble_journals', JSON.stringify(journals));
}

// --- ROUTER & VIEW CONTROLLER ---
const routes = {
  '#/': 'view-landing',
  '#/login': 'view-login',
  '#/signup': 'view-signup',
  '#/feed': 'view-feed',
  '#/quiz': 'view-quiz',
  '#/journal': 'view-journal',
  '#/helplines': 'view-helplines'
};

function handleRoute() {
  const hash = window.location.hash || '#/';
  let targetViewId = routes[hash] || 'view-landing';

  // --- ROUTE GUARDS ---
  // Restrict journal to logged-in users
  if (hash === '#/journal' && !currentUser) {
    alert('Please log in or sign up to access your private journal.');
    window.location.hash = '#/login';
    return;
  }

  // Update nav link active states
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Toggle active view sections
  document.querySelectorAll('.view-section').forEach(section => {
    if (section.id === targetViewId) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });

  // Render content depending on active view
  if (targetViewId === 'view-feed') {
    renderFeed();
    updatePublisherFormState();
  } else if (targetViewId === 'view-journal') {
    renderJournal();
  } else if (targetViewId === 'view-helplines') {
    renderHelplines();
  } else if (targetViewId === 'view-quiz') {
    resetQuiz();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// Update navbar elements based on auth state
function updateNavbar() {
  const authNavContainer = document.getElementById('auth-nav-container');
  if (!authNavContainer) return;

  if (currentUser) {
    // Show logged-in profile and log out option
    const firstLetter = currentUser.username.charAt(0).toUpperCase();
    const avatarColor = currentUser.avatarColor || '#6366F1';
    
    authNavContainer.innerHTML = `
      <div class="user-profile-nav">
        <div class="nav-avatar" style="background-color: ${avatarColor}">${firstLetter}</div>
        <span class="nav-username">${currentUser.username}</span>
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-logout-nav">Log Out</button>
    `;
    
    document.getElementById('btn-logout-nav').addEventListener('click', logoutUser);
  } else {
    // Show Login/Signup buttons
    authNavContainer.innerHTML = `
      <a href="#/login" class="nav-link">Log In</a>
      <a href="#/signup" class="btn btn-primary btn-sm">Sign Up</a>
    `;
  }
}

// --- AUTHENTICATION ---
function signupUser(event) {
  event.preventDefault();
  const usernameInput = document.getElementById('signup-username').value.trim();
  const emailInput = document.getElementById('signup-email').value.trim();
  const passwordInput = document.getElementById('signup-password').value;
  const anonDefault = document.getElementById('signup-anon-default').checked;
  const errorAlert = document.getElementById('signup-error');

  errorAlert.style.display = 'none';

  if (!usernameInput || !emailInput || !passwordInput) {
    showAuthError(errorAlert, 'Please fill in all fields.');
    return;
  }

  const users = JSON.parse(localStorage.getItem('humble_users'));
  
  // Check duplicates
  const userExists = users.some(u => u.username.toLowerCase() === usernameInput.toLowerCase() || u.email.toLowerCase() === emailInput.toLowerCase());
  if (userExists) {
    showAuthError(errorAlert, 'Username or Email already registered.');
    return;
  }

  // Set avatar color randomly from our new palette
  const colors = ['#4A5C2A', '#2B7EC1', '#C95920', '#6B7F44', '#55A0DB', '#DB7C48'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const newUser = {
    id: 'user_' + Date.now(),
    username: usernameInput,
    email: emailInput,
    password: passwordInput,
    defaultAnonymous: anonDefault,
    avatarColor: randomColor,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem('humble_users', JSON.stringify(users));

  // Log in and save session
  loginSession(newUser);
}

function loginUser(event) {
  event.preventDefault();
  const emailInput = document.getElementById('login-email').value.trim();
  const passwordInput = document.getElementById('login-password').value;
  const errorAlert = document.getElementById('login-error');

  errorAlert.style.display = 'none';

  if (!emailInput || !passwordInput) {
    showAuthError(errorAlert, 'Please fill in all fields.');
    return;
  }

  const users = JSON.parse(localStorage.getItem('humble_users'));
  const matchedUser = users.find(u => u.email.toLowerCase() === emailInput.toLowerCase() && u.password === passwordInput);

  if (!matchedUser) {
    showAuthError(errorAlert, 'Invalid email or password.');
    return;
  }

  loginSession(matchedUser);
}

function loginSession(user) {
  currentUser = user;
  localStorage.setItem('humble_session', JSON.stringify(user));
  updateNavbar();
  
  // Clear forms
  document.getElementById('form-signup').reset();
  document.getElementById('form-login').reset();
  
  // Redirect to feed
  window.location.hash = '#/feed';
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('humble_session');
  updateNavbar();
  window.location.hash = '#/';
}

function showAuthError(element, message) {
  element.innerText = message;
  element.style.display = 'block';
}

// --- STORY FEED CONTROLLER ---
let activeCategoryFilter = 'all';

function renderFeed() {
  const feedList = document.getElementById('feed-list');
  if (!feedList) return;

  feedList.innerHTML = '';

  const filteredStories = stories.filter(s => {
    if (activeCategoryFilter === 'all') return true;
    return s.category.toLowerCase() === activeCategoryFilter.toLowerCase();
  });

  // Sort descending by creation date
  filteredStories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (filteredStories.length === 0) {
    feedList.innerHTML = `
      <div class="glass-panel text-center" style="padding: 3rem 1.5rem; text-align: center; color: var(--color-text-muted);">
        <p>No stories in this category yet. Be the first to share your journey!</p>
      </div>
    `;
    return;
  }

  filteredStories.forEach(story => {
    const card = document.createElement('div');
    card.className = `glass-panel story-card category-${getCategoryClassSuffix(story.category)}`;
    
    const formattedDate = new Date(story.createdAt).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const isAnchoredClass = hasUserAnchored(story.id) ? 'anchored' : '';

    // Render Comments List
    let commentsHTML = '';
    if (story.comments && story.comments.length > 0) {
      story.comments.forEach(comment => {
        commentsHTML += `
          <div class="comment-item">
            <div class="comment-header">
              <span>${comment.username}</span>
              <span>${new Date(comment.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="comment-content">${comment.content}</div>
          </div>
        `;
      });
    }

    card.innerHTML = `
      <div class="story-card-header">
        <div class="author-info">
          <div class="author-avatar" style="background-color: ${story.avatarColor || '#6366F1'}">
            ${story.username.charAt(0).toUpperCase()}
          </div>
          <div class="author-meta">
            <span class="author-name">${story.username}</span>
            <span class="story-date">${formattedDate}</span>
          </div>
        </div>
        <span class="story-badge story-badge-${getCategoryClassSuffix(story.category)}">${story.category}</span>
      </div>
      <h3 class="story-title">${story.title}</h3>
      <div class="story-content">${escapeHTML(story.content)}</div>
      <div class="story-actions">
        <button class="story-action-btn ${isAnchoredClass}" onclick="handleAnchorClick('${story.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="pointer-events: none; transition: transform 0.2s;">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>Anchor (${story.anchors || 0})</span>
        </button>
        <button class="story-action-btn" onclick="toggleComments('${story.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="pointer-events: none;">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
          </svg>
          <span>Peer Advice (${story.comments ? story.comments.length : 0})</span>
        </button>
      </div>
      
      <div class="comments-section" id="comments-${story.id}">
        <div class="comment-list" id="comment-list-${story.id}">
          ${commentsHTML}
        </div>
        <div class="comment-input-group">
          <input type="text" class="form-control" placeholder="Share supportive peer advice..." id="comment-input-${story.id}">
          <button class="btn btn-primary btn-sm" onclick="submitComment('${story.id}')">Reply</button>
        </div>
      </div>
    `;

    feedList.appendChild(card);
  });
}

function updatePublisherFormState() {
  const publisherSection = document.getElementById('feed-publisher-container');
  if (!publisherSection) return;

  if (currentUser) {
    // Logged in: show full text fields
    document.getElementById('post-story-anon').checked = currentUser.defaultAnonymous;
  }
}

function handlePublishStory(event) {
  event.preventDefault();
  
  if (!currentUser) {
    alert('You must sign up or log in to post stories on the feed.');
    window.location.hash = '#/signup';
    return;
  }

  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const category = document.getElementById('post-category').value;
  const isAnonymous = document.getElementById('post-story-anon').checked;

  if (!title || !content) {
    alert('Please fill out both title and content.');
    return;
  }

  const authorName = isAnonymous ? 'Anonymous' : currentUser.username;
  const avatarColor = isAnonymous ? '#6B7280' : currentUser.avatarColor;

  const newStory = {
    id: 'story_' + Date.now(),
    username: authorName,
    avatarColor: avatarColor,
    title: title,
    content: content,
    category: category,
    anchors: 0,
    comments: [],
    createdAt: new Date().toISOString()
  };

  stories.push(newStory);
  saveStories();
  
  // Clear form
  document.getElementById('form-post-story').reset();
  
  renderFeed();
}

function handleAnchorClick(storyId) {
  // Anchoring works without logging in, but tracks in session cache to prevent spamming
  const story = stories.find(s => s.id === storyId);
  if (!story) return;

  let anchoredStories = JSON.parse(sessionStorage.getItem('anchored_stories') || '[]');

  if (anchoredStories.includes(storyId)) {
    // Undo anchor
    story.anchors = Math.max(0, (story.anchors || 1) - 1);
    anchoredStories = anchoredStories.filter(id => id !== storyId);
  } else {
    // Add anchor
    story.anchors = (story.anchors || 0) + 1;
    anchoredStories.push(storyId);
  }

  sessionStorage.setItem('anchored_stories', JSON.stringify(anchoredStories));
  saveStories();
  renderFeed();
}

function hasUserAnchored(storyId) {
  const anchoredStories = JSON.parse(sessionStorage.getItem('anchored_stories') || '[]');
  return anchoredStories.includes(storyId);
}

function toggleComments(storyId) {
  const commentSection = document.getElementById(`comments-${storyId}`);
  if (commentSection) {
    commentSection.classList.toggle('visible');
  }
}

function submitComment(storyId) {
  const input = document.getElementById(`comment-input-${storyId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const commenterName = currentUser ? currentUser.username : 'Anonymous Guest';

  const story = stories.find(s => s.id === storyId);
  if (!story) return;

  if (!story.comments) story.comments = [];

  const newComment = {
    username: commenterName,
    content: text,
    createdAt: new Date().toISOString()
  };

  story.comments.push(newComment);
  saveStories();
  input.value = '';
  renderFeed();
  
  // Keep open
  const commentSection = document.getElementById(`comments-${storyId}`);
  if (commentSection) commentSection.classList.add('visible');
}

function setCategoryFilter(category) {
  activeCategoryFilter = category;
  
  document.querySelectorAll('.filter-chip').forEach(chip => {
    if (chip.getAttribute('data-filter') === category) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  renderFeed();
}

// Helpers
function getCategoryClassSuffix(category) {
  switch (category.toLowerCase()) {
    case 'grief': return 'grief';
    case 'family pressure': return 'family';
    case 'anxiety': return 'anxiety';
    case 'coping': return 'coping';
    default: return 'general';
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// --- MOOD ASSESSMENT QUIZ CONTROLLER ---
function resetQuiz() {
  currentQuizQuestionIndex = 0;
  quizScore = 0;
  
  document.getElementById('quiz-intro-section').style.display = 'block';
  document.getElementById('quiz-questions-section').style.display = 'none';
  document.getElementById('quiz-results-view').style.display = 'none';
}

function startQuiz() {
  document.getElementById('quiz-intro-section').style.display = 'none';
  document.getElementById('quiz-questions-section').style.display = 'block';
  showQuizQuestion();
}

function showQuizQuestion() {
  const questions = HumbleData.quiz.questions;
  const total = questions.length;
  
  // Update progress bar
  const progressPercent = ((currentQuizQuestionIndex) / total) * 100;
  document.getElementById('quiz-bar').style.width = `${progressPercent}%`;

  if (currentQuizQuestionIndex >= total) {
    showQuizResults();
    return;
  }

  const currentQuestion = questions[currentQuizQuestionIndex];
  
  const questionContainer = document.getElementById('quiz-question-container');
  questionContainer.innerHTML = `
    <div class="quiz-question-num">Question ${currentQuizQuestionIndex + 1} of ${total}</div>
    <div class="quiz-question-text">${currentQuestion.text}</div>
    <div class="quiz-options">
      ${HumbleData.quiz.options.map(opt => `
        <button class="quiz-option-btn" onclick="handleQuizAnswer(${opt.value})">${opt.text}</button>
      `).join('')}
    </div>
  `;
}

function handleQuizAnswer(val) {
  quizScore += val;
  currentQuizQuestionIndex++;
  showQuizQuestion();
}

function showQuizResults() {
  document.getElementById('quiz-questions-section').style.display = 'none';
  
  const resultsView = document.getElementById('quiz-results-view');
  resultsView.style.display = 'block';

  // Find matching recommendation
  const recommendation = HumbleData.quiz.recommendations.find(rec => quizScore >= rec.min && quizScore <= rec.max) 
                          || HumbleData.quiz.recommendations[HumbleData.quiz.recommendations.length - 1];

  resultsView.className = `glass-panel quiz-results-container ${recommendation.class}`;
  resultsView.innerHTML = `
    <div class="results-header">
      <div class="results-glow"></div>
      <div class="results-score-circle">
        <span class="score-num">${quizScore}</span>
        <span class="score-max">out of 27</span>
      </div>
      <h3 class="results-risk-level">${recommendation.level}</h3>
      <p class="results-recommendation">${recommendation.message}</p>
    </div>
    
    <div class="results-advice-card">
      <h4 style="margin-bottom: 0.5rem; font-weight:700;">Recommended Next Steps:</h4>
      <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">${recommendation.action}</p>
      
      <div class="results-actions">
        <button class="btn btn-primary" onclick="window.location.hash = '#/helplines'">View Local Helplines</button>
        <button class="btn btn-secondary" onclick="resetQuiz()">Retake Assessment</button>
      </div>
    </div>
  `;
}

// --- PRIVATE JOURNAL CONTROLLER ---
function selectMood(mood, element) {
  selectedJournalMood = mood;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  element.classList.add('selected');
}

function renderJournal() {
  const journalList = document.getElementById('journal-list');
  if (!journalList) return;

  journalList.innerHTML = '';

  const userJournals = journals.filter(j => j.userId === currentUser.id);
  // Sort by date descending
  userJournals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (userJournals.length === 0) {
    journalList.innerHTML = `
      <div class="journal-empty-state">
        <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">📓 Your Private Diary</p>
        <p>No journal entries yet. Log how your day went to start monitoring your mental health.</p>
      </div>
    `;
    return;
  }

  userJournals.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'glass-panel journal-card';
    
    const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const moodIcons = {
      happy: '😊',
      calm: '😌',
      sad: '😢',
      anxious: '😰',
      tired: '😴'
    };

    const moodLabels = {
      happy: 'Happy',
      calm: 'Calm',
      sad: 'Sad',
      anxious: 'Anxious',
      tired: 'Tired'
    };

    const emoji = moodIcons[entry.mood] || '📝';
    const label = moodLabels[entry.mood] || 'Notes';

    card.innerHTML = `
      <div class="journal-card-header">
        <span class="journal-card-date">${formattedDate}</span>
        <span class="journal-card-mood">${emoji} ${label}</span>
      </div>
      <div class="journal-card-text">${escapeHTML(entry.content)}</div>
    `;

    journalList.appendChild(card);
  });
}

function handleSaveJournal(event) {
  event.preventDefault();
  
  if (!currentUser) return;

  const content = document.getElementById('journal-content').value.trim();
  
  if (!content) {
    alert('Please write something in your journal entry before saving.');
    return;
  }

  if (!selectedJournalMood) {
    alert('Please select how you are feeling (mood) today.');
    return;
  }

  const newEntry = {
    id: 'journal_' + Date.now(),
    userId: currentUser.id,
    mood: selectedJournalMood,
    content: content,
    createdAt: new Date().toISOString()
  };

  journals.push(newEntry);
  saveJournals();

  // Clear form
  document.getElementById('form-journal').reset();
  selectedJournalMood = null;
  document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));

  renderJournal();
}

// --- HELPLINES CONTROLLER ---
function renderHelplines() {
  const helplinesGrid = document.getElementById('helplines-grid');
  if (!helplinesGrid) return;

  helplinesGrid.innerHTML = '';

  HumbleData.helplines.forEach(item => {
    const card = document.createElement('div');
    card.className = 'glass-panel helpline-card';

    let emailHTML = item.email ? `
      <div class="helpline-contact-row">
        <span class="contact-icon">✉️</span>
        <a href="mailto:${item.email}">${item.email}</a>
      </div>
    ` : '';

    card.innerHTML = `
      <div>
        <h3 class="helpline-name">${item.name}</h3>
        <span class="helpline-availability">${item.availability}</span>
        <div class="helpline-type">${item.type}</div>
        <p class="helpline-desc">${item.description}</p>
      </div>
      <div>
        <div class="helpline-contact-row">
          <span class="contact-icon">📞</span>
          <a href="tel:${item.phone.replace(/\s+/g, '')}" style="font-weight: 700;">${item.phone}</a>
        </div>
        ${emailHTML}
        <a href="tel:${item.phone.replace(/\s+/g, '')}" class="helpline-call-btn">Call Now</a>
      </div>
    `;

    helplinesGrid.appendChild(card);
  });
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  // Init data state
  initAppState();

  // Setup Navbar UI
  updateNavbar();

  // Route routing
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Form submit listeners
  document.getElementById('form-signup').addEventListener('submit', signupUser);
  document.getElementById('form-login').addEventListener('submit', loginUser);
  document.getElementById('form-post-story').addEventListener('submit', handlePublishStory);
  document.getElementById('form-journal').addEventListener('submit', handleSaveJournal);
});
