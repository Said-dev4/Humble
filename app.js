// HUMBLE Web Application - Client-Side Controller (app.js)

// --- STATE MANAGEMENT ---
let currentUser = null;
let stories = [];
let journals = [];
let ephemeralStories = [];
let chatThreads = [];
let currentQuizQuestionIndex = 0;
let quizScore = 0;
let selectedJournalMood = null;

// Extension variables
let selectedStoryGradient = 'theme-twilight';
let activeStoryIndex = 0;
let storyPlayTimer = null;
let storyPlayStart = null;
let storyPlayDuration = 5000; // 5 seconds per story
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioBase64 = null;
let currentActiveChatThreadId = null;

// Initialize data from localStorage or fallback to data.js templates
function initAppState() {
  // Load session
  const savedSession = localStorage.getItem('humble_session');
  if (savedSession) {
    currentUser = JSON.parse(savedSession);
  }

  // Load theme
  const savedTheme = localStorage.getItem('humble_theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
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

  // Load Ephemeral Stories
  const savedEphemerals = localStorage.getItem('humble_stories_ephemeral');
  if (savedEphemerals) {
    ephemeralStories = JSON.parse(savedEphemerals);
  } else {
    ephemeralStories = [];
    localStorage.setItem('humble_stories_ephemeral', JSON.stringify([]));
  }
  // Clear expired on load
  ephemeralStories = ephemeralStories.filter(s => new Date(s.expiresAt).getTime() > Date.now());
  saveStoriesEphemeral();

  // Load Chats
  const savedChats = localStorage.getItem('humble_chats');
  if (savedChats) {
    chatThreads = JSON.parse(savedChats);
  } else {
    chatThreads = [];
    localStorage.setItem('humble_chats', JSON.stringify([]));
  }
}

// Save helpers
function saveStories() {
  localStorage.setItem('humble_stories', JSON.stringify(stories));
}

function saveJournals() {
  localStorage.setItem('humble_journals', JSON.stringify(journals));
}

function saveStoriesEphemeral() {
  localStorage.setItem('humble_stories_ephemeral', JSON.stringify(ephemeralStories));
}

function saveChats() {
  localStorage.setItem('humble_chats', JSON.stringify(chatThreads));
}

// --- ROUTER & VIEW CONTROLLER ---
const routes = {
  '#/': 'view-landing',
  '#/login': 'view-login',
  '#/signup': 'view-signup',
  '#/feed': 'view-feed',
  '#/quiz': 'view-quiz',
  '#/journal': 'view-journal',
  '#/helplines': 'view-helplines',
  '#/dms': 'view-dms',
  '#/settings': 'view-settings'
};

function handleRoute() {
  const hash = window.location.hash || '#/';
  let targetViewId = routes[hash] || 'view-landing';

  // Hide top header on landing, login, and signup views
  const header = document.querySelector('.main-header');
  if (header) {
    if (targetViewId === 'view-landing' || targetViewId === 'view-login' || targetViewId === 'view-signup') {
      header.style.display = 'none';
    } else {
      header.style.display = '';
    }
  }

  // --- ROUTE GUARDS ---
  // Restrict journal to logged-in users
  if (hash === '#/journal' && !currentUser) {
    alert('Please log in or sign up to access your private journal.');
    window.location.hash = '#/login';
    return;
  }

  // Restrict chats to logged-in users
  if (hash === '#/dms' && !currentUser) {
    alert('Please log in or sign up to access your safe support chats.');
    window.location.hash = '#/login';
    return;
  }

  // Restrict settings to logged-in users
  if (hash === '#/settings' && !currentUser) {
    alert('Please log in or sign up to manage settings.');
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
    renderStoriesCarousel();
  } else if (targetViewId === 'view-journal') {
    renderJournal();
  } else if (targetViewId === 'view-helplines') {
    renderHelplines();
  } else if (targetViewId === 'view-quiz') {
    resetQuiz();
  } else if (targetViewId === 'view-dms') {
    renderDMs();
  } else if (targetViewId === 'view-settings') {
    renderSettings();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// Update navbar elements based on auth state
function updateNavbar() {
  const authNavContainer = document.getElementById('auth-nav-container');
  if (!authNavContainer) return;

  // Toggle DM unread badge
  const unreadDot = document.querySelector('.dm-unread-dot');
  if (unreadDot) {
    if (currentUser) {
      const hasRequests = chatThreads.some(t => t.receiverName === currentUser.username && t.status === 'pending');
      unreadDot.style.display = hasRequests ? 'inline-block' : 'none';
    } else {
      unreadDot.style.display = 'none';
    }
  }

  if (currentUser) {
    // Show logged-in profile with a dropdown menu container
    const firstLetter = currentUser.username.charAt(0).toUpperCase();
    const avatarColor = currentUser.avatarColor || '#6366F1';
    
    authNavContainer.innerHTML = `
      <div class="user-profile-dropdown-container">
        <div class="user-profile-nav" id="user-profile-trigger">
          <div class="nav-avatar" style="background-color: ${avatarColor}">${firstLetter}</div>
          <span class="nav-username">${currentUser.username}</span>
          <span class="dropdown-caret" style="font-size: 0.55rem; margin-left: 0.25rem; opacity: 0.5;">▼</span>
        </div>
        
        <div class="user-dropdown-menu" id="user-dropdown-menu">
          <a href="#/journal" class="dropdown-item">📓 Private Journal</a>
          <a href="#/settings" class="dropdown-item">⚙️ Settings</a>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item logout-item" id="btn-logout-dropdown">🚪 Log Out</button>
        </div>
      </div>
    `;
    
    // Wire up dropdown visibility toggle
    const trigger = document.getElementById('user-profile-trigger');
    const menu = document.getElementById('user-dropdown-menu');
    
    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
      });
      
      // Auto close dropdown when clicking anywhere else
      document.addEventListener('click', () => {
        menu.style.display = 'none';
      });
    }

    // Wire up log out button inside dropdown
    const logoutBtn = document.getElementById('btn-logout-dropdown');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logoutUser);
    }
  } else {
    // Show Login/Signup links
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

    // Direct support chat button (only if not anonymous and not self)
    let dmButtonHTML = '';
    if (currentUser && story.username !== 'Anonymous' && story.username.toLowerCase() !== currentUser.username.toLowerCase()) {
      dmButtonHTML = `<button class="btn btn-secondary btn-xs" onclick="initiateSupportChat('${story.username}')" style="margin-left: auto; margin-right: 0.75rem;">💬 Chat</button>`;
    }

    // Custom voice player if voice vent exists
    let voicePlayerHTML = '';
    if (story.voiceData) {
      voicePlayerHTML = `
        <div class="voice-feed-player" id="voice-player-${story.id}">
          <button class="voice-player-btn" onclick="togglePlayVoice('${story.id}')" id="voice-btn-${story.id}" aria-label="Play Voice Recording">
            <svg viewBox="0 0 24 24" id="voice-svg-${story.id}"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div class="voice-player-progress" onclick="seekVoice('${story.id}', event)">
            <div class="voice-player-fill" id="voice-fill-${story.id}"></div>
          </div>
          <span class="voice-player-time" id="voice-time-${story.id}">0:00</span>
          <audio id="audio-elem-${story.id}" src="${story.voiceData}" style="display:none;" ontimeupdate="updateVoiceProgress('${story.id}')" onended="voiceEnded('${story.id}')"></audio>
        </div>
      `;
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
        ${dmButtonHTML}
        <span class="story-badge story-badge-${getCategoryClassSuffix(story.category)}">${story.category}</span>
      </div>
      <h3 class="story-title">${story.title}</h3>
      <div class="story-content">${escapeHTML(story.content)}</div>
      ${voicePlayerHTML}
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

  if (recordedAudioBase64) {
    newStory.voiceData = recordedAudioBase64;
    recordedAudioBase64 = null;
    document.getElementById('voice-record-panel').style.display = 'none';
  }

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

  // Smooth scroll to the feed header with sticky header offset
  const feedHeader = document.querySelector('.feed-header');
  if (feedHeader) {
    const yOffset = -100; // Account for sticky header padding
    const yPosition = feedHeader.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: yPosition, behavior: 'smooth' });
  }
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

// --- EPHEMERAL STORIES CONTROLLER ---
function renderStoriesCarousel() {
  const carousel = document.getElementById('stories-carousel');
  if (!carousel) return;
  carousel.innerHTML = '';

  // Filter out expired stories
  ephemeralStories = ephemeralStories.filter(s => new Date(s.expiresAt).getTime() > Date.now());
  saveStoriesEphemeral();

  // Draw "+ Share Vent" if logged in
  if (currentUser) {
    const creatorBubble = document.createElement('div');
    creatorBubble.className = 'story-bubble';
    creatorBubble.onclick = openStoryCreator;
    creatorBubble.innerHTML = `
      <div class="story-ring creator-bubble">
        <div class="story-avatar-inner" style="color: var(--color-text-secondary); font-weight: 500;">+</div>
      </div>
      <span class="story-bubble-label">Share Vent</span>
    `;
    carousel.appendChild(creatorBubble);
  }

  // Draw other bubbles
  const watched = JSON.parse(sessionStorage.getItem('watched_stories') || '[]');
  ephemeralStories.forEach((story, idx) => {
    const bubble = document.createElement('div');
    bubble.className = 'story-bubble';
    bubble.onclick = () => openStoryPlayer(idx);

    const isWatched = watched.includes(story.id);
    const ringClass = isWatched ? 'story-ring watched' : 'story-ring';
    const firstLetter = story.username.charAt(0).toUpperCase();

    bubble.innerHTML = `
      <div class="${ringClass}">
        <div class="story-avatar-inner" style="background-color: ${story.avatarColor || 'var(--olive)'};">
          ${firstLetter}
        </div>
      </div>
      <span class="story-bubble-label">${story.username}</span>
    `;
    carousel.appendChild(bubble);
  });
}

function openStoryCreator() {
  const modal = document.getElementById('modal-story-creator');
  if (modal) modal.style.display = 'flex';
}

function closeStoryCreator() {
  const modal = document.getElementById('modal-story-creator');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('form-story-creator').reset();
  }
}

function selectStoryGradient(gradientClass, element) {
  selectedStoryGradient = gradientClass;
  document.querySelectorAll('.grad-option').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
}

function handleSaveEphemeralStory(event) {
  event.preventDefault();
  if (!currentUser) return;

  const text = document.getElementById('story-creator-text').value.trim();
  const emoji = document.getElementById('story-creator-emoji').value.trim();

  if (!text || !emoji) return;

  const newStory = {
    id: 'story_e_' + Date.now(),
    userId: currentUser.id,
    username: currentUser.username,
    avatarColor: currentUser.avatarColor,
    text: text,
    emoji: emoji,
    gradient: selectedStoryGradient,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  ephemeralStories.push(newStory);
  saveStoriesEphemeral();
  closeStoryCreator();
  renderStoriesCarousel();
}

function openStoryPlayer(startIndex) {
  activeStoryIndex = startIndex;
  const modal = document.getElementById('modal-story-player');
  if (modal) modal.style.display = 'flex';
  playStories();
}

function playStories() {
  if (activeStoryIndex < 0 || activeStoryIndex >= ephemeralStories.length) {
    closeStoryPlayer();
    return;
  }

  const story = ephemeralStories[activeStoryIndex];
  
  // Elements
  const avatar = document.getElementById('story-player-avatar');
  const username = document.getElementById('story-player-username');
  const time = document.getElementById('story-player-time');
  const emoji = document.getElementById('story-player-emoji');
  const text = document.getElementById('story-player-text');
  const card = document.getElementById('story-player-card');

  // Fill content
  avatar.innerText = story.username.charAt(0).toUpperCase();
  avatar.style.backgroundColor = story.avatarColor;
  username.innerText = story.username;

  // Time stamp
  const hoursAgo = Math.max(1, Math.round((Date.now() - new Date(story.createdAt).getTime()) / (1000 * 60 * 60)));
  time.innerText = `${hoursAgo}h ago`;

  emoji.innerText = story.emoji;
  text.innerText = story.text;

  // Set card theme
  card.className = `story-player-card ${story.gradient}`;

  // Mark watched
  let watched = JSON.parse(sessionStorage.getItem('watched_stories') || '[]');
  if (!watched.includes(story.id)) {
    watched.push(story.id);
    sessionStorage.setItem('watched_stories', JSON.stringify(watched));
  }
  renderStoriesCarousel();

  // Progress animation
  clearInterval(storyPlayTimer);
  const progressBar = document.getElementById('story-player-progress');
  progressBar.style.width = '0%';

  storyPlayStart = Date.now();
  storyPlayTimer = setInterval(() => {
    const elapsed = Date.now() - storyPlayStart;
    const pct = Math.min(100, (elapsed / storyPlayDuration) * 100);
    progressBar.style.width = `${pct}%`;

    if (elapsed >= storyPlayDuration) {
      clearInterval(storyPlayTimer);
      activeStoryIndex++;
      playStories();
    }
  }, 50);
}

function closeStoryPlayer() {
  clearInterval(storyPlayTimer);
  const modal = document.getElementById('modal-story-player');
  if (modal) modal.style.display = 'none';
}

function handlePlayerOverlayClick(event) {
  if (event.target.id === 'modal-story-player') {
    closeStoryPlayer();
    return;
  }
  if (event.target.classList.contains('player-close-btn')) return;

  const card = document.getElementById('story-player-card');
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;

  if (x < rect.width / 3) {
    // Go back
    activeStoryIndex = Math.max(0, activeStoryIndex - 1);
    playStories();
  } else {
    // Go forward
    activeStoryIndex++;
    if (activeStoryIndex >= ephemeralStories.length) {
      closeStoryPlayer();
    } else {
      playStories();
    }
  }
}

// --- VOICE VENT CONTROLLER ---
function toggleVoiceRecordPanel() {
  const panel = document.getElementById('voice-record-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  discardAudioRecording();
}

let recordingSeconds = 0;
let recordingInterval = null;
let isSimulatedRecording = false;

function startAudioRecording() {
  audioChunks = [];
  recordedAudioBase64 = null;
  recordingSeconds = 0;
  isSimulatedRecording = false;
  
  const timer = document.getElementById('voice-record-timer');
  const wave = document.getElementById('voice-record-wave');
  const btnStart = document.getElementById('btn-record-start');
  const btnStop = document.getElementById('btn-record-stop');
  const btnDelete = document.getElementById('btn-record-delete');
  const btnPlay = document.getElementById('btn-record-play');

  btnStart.style.display = 'none';
  btnStop.style.display = 'block';
  btnDelete.style.display = 'none';
  btnPlay.style.display = 'none';
  wave.style.display = 'flex';
  
  timer.innerText = '00:00 / 01:00';

  recordingInterval = setInterval(() => {
    recordingSeconds++;
    const minutes = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
    const seconds = (recordingSeconds % 60).toString().padStart(2, '0');
    timer.innerText = `${minutes}:${seconds} / 01:00`;

    if (recordingSeconds >= 60) {
      stopAudioRecording();
    }
  }, 1000);

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
          audioChunks.push(event.data);
        };
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            recordedAudioBase64 = reader.result;
            btnPlay.style.display = 'block';
            btnDelete.style.display = 'block';
          };
          // Stop track
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
      })
      .catch(err => {
        console.warn('Microphone access denied. Using simulation fallback.', err);
        isSimulatedRecording = true;
      });
  } else {
    console.warn('Media devices not supported. Using simulation fallback.');
    isSimulatedRecording = true;
  }
}

function stopAudioRecording() {
  clearInterval(recordingInterval);
  
  const timer = document.getElementById('voice-record-timer');
  const wave = document.getElementById('voice-record-wave');
  const btnStop = document.getElementById('btn-record-stop');
  const btnDelete = document.getElementById('btn-record-delete');
  const btnPlay = document.getElementById('btn-record-play');

  btnStop.style.display = 'none';
  wave.style.display = 'none';

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else if (isSimulatedRecording) {
    // Simulated stop fallback audio base64 silent WAV
    recordedAudioBase64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
    btnPlay.style.display = 'block';
    btnDelete.style.display = 'block';
    isSimulatedRecording = false;
  }
}

function playAudioPreview() {
  if (recordedAudioBase64) {
    const audio = new Audio(recordedAudioBase64);
    audio.play();
  }
}

function discardAudioRecording() {
  clearInterval(recordingInterval);
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  recordedAudioBase64 = null;
  isSimulatedRecording = false;
  mediaRecorder = null;

  const timer = document.getElementById('voice-record-timer');
  if (timer) timer.innerText = '00:00 / 01:00';
  
  const wave = document.getElementById('voice-record-wave');
  if (wave) wave.style.display = 'none';

  const btnStart = document.getElementById('btn-record-start');
  if (btnStart) btnStart.style.display = 'block';

  const btnStop = document.getElementById('btn-record-stop');
  if (btnStop) btnStop.style.display = 'none';

  const btnPlay = document.getElementById('btn-record-play');
  if (btnPlay) btnPlay.style.display = 'none';

  const btnDelete = document.getElementById('btn-record-delete');
  if (btnDelete) btnDelete.style.display = 'none';
}

function togglePlayVoice(storyId) {
  const audio = document.getElementById(`audio-elem-${storyId}`);
  const svg = document.getElementById(`voice-svg-${storyId}`);
  
  if (!audio) return;

  if (audio.paused) {
    // Pause other audio files
    document.querySelectorAll('audio').forEach(aud => {
      if (aud.id !== `audio-elem-${storyId}`) {
        aud.pause();
        const otherId = aud.id.replace('audio-elem-', '');
        const otherSvg = document.getElementById(`voice-svg-${otherId}`);
        if (otherSvg) otherSvg.innerHTML = '<path d="M8 5v14l11-7z"/>';
      }
    });

    audio.play();
    if (svg) svg.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  } else {
    audio.pause();
    if (svg) svg.innerHTML = '<path d="M8 5v14l11-7z"/>';
  }
}

function updateVoiceProgress(storyId) {
  const audio = document.getElementById(`audio-elem-${storyId}`);
  const fill = document.getElementById(`voice-fill-${storyId}`);
  const timeText = document.getElementById(`voice-time-${storyId}`);

  if (!audio || !fill || !timeText) return;

  const pct = (audio.currentTime / audio.duration) * 100;
  fill.style.width = `${pct}%`;

  const minutes = Math.floor(audio.currentTime / 60).toString();
  const seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
  timeText.innerText = `${minutes}:${seconds}`;
}

function voiceEnded(storyId) {
  const svg = document.getElementById(`voice-svg-${storyId}`);
  const fill = document.getElementById(`voice-fill-${storyId}`);
  const timeText = document.getElementById(`voice-time-${storyId}`);

  if (svg) svg.innerHTML = '<path d="M8 5v14l11-7z"/>';
  if (fill) fill.style.width = '0%';
  if (timeText) timeText.innerText = '0:00';
}

function seekVoice(storyId, event) {
  const audio = document.getElementById(`audio-elem-${storyId}`);
  const progressContainer = event.currentTarget;
  if (!audio || !progressContainer) return;

  const rect = progressContainer.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = clickX / rect.width;
  audio.currentTime = percentage * audio.duration;
}

// --- SAFE DM CONTROLLER ---
function initiateSupportChat(targetUsername) {
  if (!currentUser) {
    alert('Please log in or sign up to connect with peers.');
    window.location.hash = '#/login';
    return;
  }

  // Check if thread already exists
  let existingThread = chatThreads.find(t => 
    (t.senderName.toLowerCase() === currentUser.username.toLowerCase() && t.receiverName.toLowerCase() === targetUsername.toLowerCase()) ||
    (t.senderName.toLowerCase() === targetUsername.toLowerCase() && t.receiverName.toLowerCase() === currentUser.username.toLowerCase())
  );

  if (existingThread) {
    currentActiveChatThreadId = existingThread.id;
    window.location.hash = '#/dms';
    return;
  }

  // Create new pending thread
  const newThread = {
    id: 'chat_' + Date.now(),
    senderName: currentUser.username,
    receiverName: targetUsername,
    status: 'pending',
    lastMessageAt: new Date().toISOString(),
    messages: []
  };

  chatThreads.push(newThread);
  saveChats();
  updateNavbar();
  currentActiveChatThreadId = newThread.id;
  
  alert(`Chat request sent to ${targetUsername}. Conversations will appear in "Safe Chats" once accepted.`);
  window.location.hash = '#/dms';
}

function acceptChatRequest(threadId, event) {
  if (event) event.stopPropagation();

  const thread = chatThreads.find(t => t.id === threadId);
  if (!thread) return;

  thread.status = 'accepted';
  thread.lastMessageAt = new Date().toISOString();
  saveChats();
  updateNavbar();
  
  currentActiveChatThreadId = thread.id;
  renderDMs();
}

function blockChatThread(threadId, event) {
  if (event) event.stopPropagation();

  const confirmed = confirm('Are you sure you want to block this user and delete the conversation history? This action cannot be undone.');
  if (!confirmed) return;

  chatThreads = chatThreads.filter(t => t.id !== threadId);
  saveChats();
  updateNavbar();

  if (currentActiveChatThreadId === threadId) {
    currentActiveChatThreadId = null;
  }

  renderDMs();
}

function renderDMs() {
  const threadsList = document.getElementById('dms-threads-list');
  const requestsList = document.getElementById('dms-requests-list');
  
  if (!threadsList || !requestsList) return;

  threadsList.innerHTML = '';
  requestsList.innerHTML = '';

  const activeThreads = chatThreads.filter(t => 
    t.status === 'accepted' && 
    (t.senderName.toLowerCase() === currentUser.username.toLowerCase() || t.receiverName.toLowerCase() === currentUser.username.toLowerCase())
  );

  const pendingRequests = chatThreads.filter(t => 
    t.status === 'pending' && t.receiverName.toLowerCase() === currentUser.username.toLowerCase()
  );

  // 1. Draw Active Threads
  if (activeThreads.length === 0) {
    threadsList.innerHTML = '<div style="font-size:0.75rem; color:var(--color-text-muted); padding:0.5rem;">No active chats</div>';
  } else {
    activeThreads.sort((a,b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    activeThreads.forEach(thread => {
      const isSender = thread.senderName.toLowerCase() === currentUser.username.toLowerCase();
      const partnerName = isSender ? thread.receiverName : thread.senderName;
      const lastMsg = thread.messages.length > 0 ? thread.messages[thread.messages.length - 1].text : 'No messages yet';
      const isSelected = thread.id === currentActiveChatThreadId;

      const item = document.createElement('div');
      item.className = `dm-thread-item ${isSelected ? 'active' : ''}`;
      item.onclick = () => selectDMThread(thread.id);

      const alphabetColors = ['#4A5C2A', '#2B7EC1', '#C95920', '#6B7F44', '#55A0DB', '#DB7C48'];
      const avatarColor = alphabetColors[partnerName.charCodeAt(0) % alphabetColors.length];

      item.innerHTML = `
        <div class="dm-thread-avatar" style="background-color: ${avatarColor};">${partnerName.charAt(0).toUpperCase()}</div>
        <div class="dm-thread-info">
          <span class="dm-thread-name">${partnerName}</span>
          <span class="dm-thread-last-msg">${escapeHTML(lastMsg)}</span>
        </div>
      `;
      threadsList.appendChild(item);
    });
  }

  // 2. Draw Chat Requests
  if (pendingRequests.length === 0) {
    requestsList.innerHTML = '<div style="font-size:0.75rem; color:var(--color-text-muted); padding:0.5rem;">No pending requests</div>';
  } else {
    pendingRequests.forEach(thread => {
      const item = document.createElement('div');
      item.className = 'dm-thread-item';
      
      const partnerName = thread.senderName;
      const alphabetColors = ['#4A5C2A', '#2B7EC1', '#C95920', '#6B7F44', '#55A0DB', '#DB7C48'];
      const avatarColor = alphabetColors[partnerName.charCodeAt(0) % alphabetColors.length];

      item.innerHTML = `
        <div class="dm-thread-avatar" style="background-color: ${avatarColor};">${partnerName.charAt(0).toUpperCase()}</div>
        <div class="dm-thread-info">
          <span class="dm-thread-name" style="font-weight:700;">${partnerName}</span>
          <div class="dm-request-btn-group">
            <button class="btn btn-primary btn-xs" onclick="acceptChatRequest('${thread.id}', event)">Accept</button>
            <button class="btn btn-secondary btn-xs btn-danger-xs" onclick="blockChatThread('${thread.id}', event)">Block</button>
          </div>
        </div>
      `;
      requestsList.appendChild(item);
    });
  }

  // 3. Render Chat Pane
  const placeholder = document.getElementById('dms-chat-placeholder');
  const chatActive = document.getElementById('dms-chat-active');
  const stream = document.getElementById('dms-message-stream');

  if (!currentActiveChatThreadId) {
    placeholder.style.display = 'flex';
    chatActive.style.display = 'none';
  } else {
    const thread = chatThreads.find(t => t.id === currentActiveChatThreadId);
    if (!thread || thread.status !== 'accepted') {
      currentActiveChatThreadId = null;
      placeholder.style.display = 'flex';
      chatActive.style.display = 'none';
      return;
    }

    placeholder.style.display = 'none';
    chatActive.style.display = 'flex';
    stream.innerHTML = '';

    if (thread.messages.length === 0) {
      stream.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); font-size: 0.8rem; margin-top: 2rem;">
          👋 Start of your supportive conversation. Keep it constructive and warm.
        </div>
      `;
    } else {
      thread.messages.forEach(msg => {
        const isSelf = msg.senderName.toLowerCase() === currentUser.username.toLowerCase();
        
        const bubble = document.createElement('div');
        bubble.className = `dm-bubble ${isSelf ? 'sent' : 'received'}`;
        
        const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        bubble.innerHTML = `
          <div>${escapeHTML(msg.text)}</div>
          <span class="dm-bubble-time">${formattedTime}</span>
        `;
        stream.appendChild(bubble);
      });
    }

    // Scroll to bottom
    stream.scrollTop = stream.scrollHeight;
  }
}

function selectDMThread(threadId) {
  currentActiveChatThreadId = threadId;
  renderDMs();
}

function handleSendDM(event) {
  event.preventDefault();
  if (!currentActiveChatThreadId) return;

  const input = document.getElementById('dm-message-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const thread = chatThreads.find(t => t.id === currentActiveChatThreadId);
  if (!thread) return;

  thread.messages.push({
    senderName: currentUser.username,
    text: text,
    createdAt: new Date().toISOString()
  });

  thread.lastMessageAt = new Date().toISOString();
  saveChats();

  input.value = '';
  renderDMs();
}

// --- SETTINGS CONTROLLER ---
function renderSettings() {
  if (!currentUser) return;

  // Set visual theme radios
  const currentTheme = localStorage.getItem('humble_theme') || 'light';
  const themeInput = document.querySelector(`input[name="settings-theme"][value="${currentTheme}"]`);
  if (themeInput) themeInput.checked = true;

  // Set default anonymity checkbox
  const anonCheckbox = document.getElementById('settings-anon-default');
  if (anonCheckbox) anonCheckbox.checked = !!currentUser.defaultAnonymous;

  // Account overview cards
  const avatar = document.getElementById('settings-account-avatar');
  if (avatar) {
    avatar.innerText = currentUser.username.charAt(0).toUpperCase();
    avatar.style.backgroundColor = currentUser.avatarColor || 'var(--olive)';
  }

  const nameText = document.getElementById('settings-account-username');
  if (nameText) nameText.innerText = currentUser.username;

  const emailText = document.getElementById('settings-account-email');
  if (emailText) emailText.innerText = currentUser.email;
}

function saveSettings(event) {
  event.preventDefault();
  if (!currentUser) return;

  const selectedThemeEl = document.querySelector('input[name="settings-theme"]:checked');
  const selectedTheme = selectedThemeEl ? selectedThemeEl.value : 'light';
  
  const anonDefault = document.getElementById('settings-anon-default').checked;

  // Save and apply theme setting
  localStorage.setItem('humble_theme', selectedTheme);
  if (selectedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }

  // Update session preferences
  currentUser.defaultAnonymous = anonDefault;
  localStorage.setItem('humble_session', JSON.stringify(currentUser));

  // Update user in users database
  const users = JSON.parse(localStorage.getItem('humble_users') || '[]');
  const userIdx = users.findIndex(u => u.id === currentUser.id);
  if (userIdx !== -1) {
    users[userIdx].defaultAnonymous = anonDefault;
    localStorage.setItem('humble_users', JSON.stringify(users));
  }

  // Display success indicator
  const successText = document.getElementById('settings-save-success');
  if (successText) {
    successText.style.display = 'flex';
    setTimeout(() => {
      successText.style.display = 'none';
    }, 2500);
  }
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

  // New Extension Listeners
  document.getElementById('form-story-creator').addEventListener('submit', handleSaveEphemeralStory);
  document.getElementById('form-send-dm').addEventListener('submit', handleSendDM);
  document.getElementById('btn-block-thread').addEventListener('click', () => blockChatThread(currentActiveChatThreadId));
  document.getElementById('form-settings').addEventListener('submit', saveSettings);

  document.getElementById('btn-toggle-voice').addEventListener('click', toggleVoiceRecordPanel);
  document.getElementById('btn-record-start').addEventListener('click', startAudioRecording);
  document.getElementById('btn-record-stop').addEventListener('click', stopAudioRecording);
  document.getElementById('btn-record-play').addEventListener('click', playAudioPreview);
  document.getElementById('btn-record-delete').addEventListener('click', discardAudioRecording);
});

