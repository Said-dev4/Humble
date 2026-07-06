# Implementation Plan - HUMBLE Web Application (SPA with Authentication)

HUMBLE. is a web application designed to connect people in Kenya and broader Africa through their personal stories of resilience, venting tough emotional struggles, and seeking Peer advice. It addresses a critical gap in early mental health diagnosis, offering an empathetic community, a simple mood assessment tool, and access to local professional resources.

This updated plan adds the **Login/Signup authentication module**, corrects the file paths to reside inside the workspace, and refines the overall SPA structure.

## User Review Required

We propose building this as a highly aesthetic, responsive Single Page Application (SPA) using HTML, Vanilla CSS, and modern Vanilla JS (ES6). This approach avoids build tool overhead, ensures rapid loading, and provides a polished experience.

Please review the proposed architectural components:
1. **Landing Page Integration**: The app will boot into a polished landing page (building on the design from `LandingSite`) with "Log In", "Sign Up", and "Read Stories" actions.
2. **Sign Up & Login Flows**:
   - **Signup**: Username, Email, Password, and a toggle for "Default Anonymous Posting".
   - **Login**: Email and Password authentication.
   - **Session State**: Uses client-side state and `localStorage` so users remain logged in across visits unless they sign out.
   - **Guest Mode**: Allows users to read stories and explore crisis lines without registering, but restricts writing private journals or sharing vents until they sign up.
3. **Interactive App Dashboard**:
   - **Story Feed (The Vent & Anchor Space)**: Where users can write and read anonymous or attributed stories, tag them by category, and send support (e.g., "Anchor" buttons or peer advice).
   - **Early Mood Assessment (Check-In)**: An interactive, scientifically-inspired (simplified PHQ-9/GAD-7 style) mental health screening quiz. It evaluates stress and depression risk and offers immediate, tailored recommendations.
   - **Private Journal**: A secure diary where users can log thoughts and track their mood history over time.
   - **Local Resources Directory (Kenya Focus)**: A dedicated list of toll-free helplines, peer support groups, and professional counselors in Kenya.

> [!IMPORTANT]
> Since this is a client-side SPA, all data (users, stories, journals, and sessions) is simulated and stored locally in the browser's `localStorage`. No remote server or backend database is used, ensuring complete local privacy for the user.

## Open Questions

> [!NOTE]
> 1. **Password Encryption**: Should we implement basic client-side password hashing (e.g., SHA-256) for simulation purposes, or is plain-text mock verification sufficient for this local-only showcase?
> 2. **Default Feed Style**: Should we pre-populate the feed with some mock stories to make the app look alive immediately upon signup? (We have structured mock stories in `data.js` to do this).

---

## Proposed Changes

We will build the application in the workspace directory: `c:\Users\saidy\Desktop\Projects\HUMBLE - Copy\Implimentation1`.

### Core Application Files

#### [NEW] [index.html](file:///c:/Users/saidy/Desktop/Projects/HUMBLE%20-%20Copy/Implimentation1/index.html)
- Main structural file containing all SPA views wrapped in `<section>` blocks (visible/hidden based on active routes):
  - **Landing View**: Welcome messaging, call-to-actions, and statistics.
  - **Login View**: Form with Email/Password fields.
  - **Signup View**: Form with Username/Email/Password fields and anonymity settings.
  - **Dashboard/Feed View**: The main logged-in area showing the community story stream.
  - **Mood Quiz View**: The interactive mental health screening quiz.
  - **Private Journal View**: Personal entry writing space and historical journal cards.
  - **Helpline View**: Directory of local resources.
- Fully responsive, accessible, and structured with HTML5 semantic elements.

#### [NEW] [style.css](file:///c:/Users/saidy/Desktop/Projects/HUMBLE%20-%20Copy/Implimentation1/style.css)
- Custom design system:
  - Colors: Rich dark slate (#0B0F19), warm dark purple (#1E1B4B), and indigo. Accents of warm gold/amber (#D97706) and sage green/olive (#16A34A).
  - Glassmorphic panels with subtle blur backdrops (`backdrop-filter`) and borders.
  - Custom animations (fade-in, slide-up, scale pulse) for page transitions and button clicks.

#### [NEW] [app.js](file:///c:/Users/saidy/Desktop/Projects/HUMBLE%20-%20Copy/Implimentation1/app.js)
- SPA routing controller (updates browser URL hash and reveals the matching layout section).
- Authentication Controller:
  - Handles signup registration (writes to `localStorage.users`).
  - Handles login authentication (validates input and sets `localStorage.currentUser`).
  - Handles logout (clears `currentUser` state and routes back to Landing).
- Story & Journal Controller:
  - Manages publishing a vent (can toggle anonymous).
  - Handles "Anchor" support reactions and writing comments/advice.
  - Manages private journaling (saves journal entries linked to the logged-in user).
- Mood assessment quiz state, calculating risk score, and displaying results.

#### [NEW] [data.js](file:///c:/Users/saidy/Desktop/Projects/HUMBLE%20-%20Copy/Implimentation1/data.js)
- Initial database template including:
  - Initial Kenyan peer stories (e.g., job search anxiety, family pressure, grieving, and coping).
  - Directory list of Kenyan mental health resources (Befrienders Kenya, Niskize, Oasis Health, Red Cross helpline).
  - Mood quiz questions, options, and threshold score recommendation texts.

---

## Technical Details: Login & Signup Flow

### 1. Registration Flow
- User clicks "Sign Up" on the landing page or navbar.
- The UI transitions to the Signup form.
- Form validation confirms that the Username is unique and details are filled.
- The system registers the account:
  ```javascript
  const user = {
    id: 'user_' + Date.now(),
    username: usernameInput,
    email: emailInput,
    password: passwordInput, // mock validation
    defaultAnonymous: defaultAnonCheckboxChecked,
    createdAt: new Date().toISOString()
  };
  ```
- The user is automatically logged in as the new user and routed to the dashboard.

### 2. Login Flow
- User clicks "Log In" on the landing page or navbar.
- The UI transitions to the Login form.
- System validates the input against stored users:
  - If match is found, session is set: `localStorage.setItem('humble_session', JSON.stringify(matchedUser))`.
  - UI routes to Dashboard.
  - If failure, helpful inline warning animations are shown.

### 3. Session Persistence & Guardrails
- If a user is not logged in:
  - Attempting to access the private journal or post a story redirects them to the signup page.
  - Accessing the public feed and resource directories is fully allowed.
- If a user is logged in:
  - Navbar updates to show user avatar, their username, and a logout button.
  - "Post Story" field uses their username or "Anonymous" based on their default preference (can be toggled per-post).
  - Private journal becomes available and filters entries by the logged-in user's ID.

---

## Verification Plan

### Automated Verification
- Validation script to check HTML syntax correctness.
- Console error-free checks.

### Manual Verification
- **User Registration**: Register a new user and confirm that a new object is created in local storage.
- **User Authentication**: Log out, log back in with the registered details, and check that the session persists.
- **Route Guarding**: Verify that trying to access "Journal" when logged out redirects to Login/Signup.
- **Story Feed**: Create a post when logged in and confirm it lists either the username or "Anonymous" according to selections.
- **Mood Checker**: Complete the mood check-in and check that scores calculate properly and match the resources recommended.
