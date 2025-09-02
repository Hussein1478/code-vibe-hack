# code-vibe-hack

#MY PROMPTS
Of course. Here are the modified prompts for your AI coding assistant, incorporating enhanced authentication, self-contained chat history, and a flexible payment inquiry system.

---

### **Part 1: Project Overview & Setup (Enhanced)**

**Prompt:**
"We are building a full-stack web application called 'AI StudyBuddy'. It's a flashcard generator that uses AI. Please act as a senior full-stack developer and guide me through the process. We will use the following tech stack:

*   **Frontend:** Vanilla HTML5, CSS3 (with animations), and JavaScript.
*   **Backend:** Python with Flask framework.
*   **Database:** MySQL for storing users, flashcards, and chat history.
*   **AI Service:** Hugging Face Inference API.
*   **Payment:** Will be implemented later with multiple options.

**First, set up the project structure.**
Create the basic folder and file structure. Then, write the initial `app.py` to run a basic Flask server. Also, provide the SQL commands to create the database and the necessary tables.

**For enhanced security from the start, please ensure:**
1.  The `users` table includes fields for `id`, `email`, `password_hash`, `created_at`, `is_pro`, and a `last_login` field for monitoring.
2.  The `chat_sessions` table is designed to be self-contained. It should store: `id`, `user_id` (foreign key), `user_input` (the original notes), `ai_raw_response` (the full response from Hugging Face), `created_at`, and a `title` for the session (e.g., the first 50 chars of the input).
3.  The `flashcard_sets` table links to a `chat_session_id` instead of just a user_id. This creates a direct, historical link between a chat interaction and the flashcards it produced.
4.  The `flashcards` table remains the same, storing `id`, `set_id` (foreign key), `question`, `answer`.

This structure ensures a user's chat history is a first-class entity in the database."

**Expected AI Output:**
*   A project structure and basic `app.py`.
*   SQL `CREATE TABLE` statements with the enhanced, linked schema.

---

### **Part 2: Robust User Authentication (Backend & Frontend)**

**Prompt:**
"Now, let's implement **enhanced user authentication** for 'AI StudyBuddy'. We need the following in `app.py`:

1.  **Security Measures:**
    *   Use `werkzeug.security` to generate and check password hashes.
    *   Use `flask.session` for user sessions with a strong `SECRET_KEY`.
    *   Implement the `@login_required` decorator to protect routes.
    *   **Add password complexity validation** on the registration page (e.g., minimum length).
    *   **Use secure cookies** for the session.
    *   **Update the `last_login`** field in the database every time a user logs in successfully.

2.  **Routes:**
    *   `GET/POST /register`: Handle registration with error messages (e.g., for duplicate email).
    *   `GET/POST /login`: Handle login with error messages for invalid credentials. On success, update `last_login`.
    *   `GET /logout`: Clear the session and redirect.

Also, provide the HTML templates (`register.html`, `login.html`). The forms should display flash messages for errors (e.g., 'Invalid credentials', 'Email already exists').

Finally, add a middleware function or a context processor to make the `current_user` object available in all templates, so we can easily display the user's name or status."

**Expected AI Output:**
*   Updated `app.py` with robust auth routes, security features, and context processor.
*   HTML templates with fields for error messaging.
*   Discussion of security best practices.

---

### **Part 3: Core Application & Integrated Chat History**

**Prompt:**
"Next, let's build the core functionality with the integrated chat history.

**Step 1: Create the user dashboard (`GET /dashboard`).**
Its template, `dashboard.html`, should show:
*   A welcome message.
*   A textarea and a button to "Generate Flashcards".
*   A section below titled "Your Chat History" that lists all of the user's past `chat_sessions` (using their `title` and `created_at`), each linking to its own flashcard set page.

**Step 2: Integrate the Hugging Face API and save the history.**
Create the route `POST /generate-flashcards`.
- Get the user's text from the request.
- **First, create a new record in the `chat_sessions` table** with the user's input. You can save the `ai_raw_response` as NULL for now.
- Call the Hugging Face API with the prompt: `"Generate five question-and-answer pairs based on the following text. Format the response exactly as: Q1: [question]? A1: [answer]. Q2: ..."`
- **Update the `chat_sessions` record** with the raw AI response you received.
- Parse the response and create a new `flashcard_set` linked to this specific `chat_session_id`.
- Save the individual flashcards.
- Redirect the user to the new flashcard set page."

**Expected AI Output:**
*   Code for the `/dashboard` route showing the chat history list.
*   Code for `/generate-flashcards` that explicitly creates a chat session first, then updates it, firmly linking the conversation to its output.

---

### **Part 4: Interactive Flashcards (Frontend with JS & CSS)**

*(This prompt remains largely unchanged as it is frontend-focused.)*

**Prompt:**
"Now, create the page to view the flashcards. This will be the route `GET /set/<set_id>`.

**Backend (`app.py`):** This route should fetch the flashcard set and all its cards from the database and pass them to a template, `view_set.html`.

**Frontend (`view_set.html` and static JS/CSS):**
1.  Write the CSS to create a flip card animation (using `transform: rotateY();`).
2.  Use JavaScript to dynamically generate a series of these flip card elements.
3.  Add 'Previous' and 'Next' buttons for navigation.
4.  Also, display the flashcard set title (which can be pulled from the linked chat session's title) and a progress indicator (e.g., 'Card 2 of 5')."

**Expected AI Output:**
*   The Flask route for `/set/<set_id>`.
*   The complete `view_set.html` template with CSS and JS.

---

### **Part 5: Daily Limit & Payment Inquiry Page**

**Prompt:**
"Let's implement the daily limit and the new payment inquiry system.

**1. Daily Limit (Freemium Model):**
- Add these columns to the `users` table: `daily_queries` (INT, default 5) and `last_query_date` (DATE).
- In `POST /generate-flashcards`, add the logic:
    a. If `last_query_date` is not today, reset `daily_queries` to 5.
    b. If `user.is_pro` is `False` and `daily_queries` is `0`, block the request.
    c. For non-pro users, decrement the counter on successful generation.
- The dashboard should show the user their remaining generations.

**2. Payment Method Inquiry Page:**
- Create a new route `GET /upgrade`.
- This page's template, `upgrade.html`, should **NOT** integrate a specific payment processor like Stripe yet.
- Instead, it should **inquire about the user's preferred payment method**. Display a form with a dropdown or multiple choice options: **M-Pesa, Airtel Money, Credit Card, Debit Card, Bank Transfer**.
- Upon form submission (`POST /upgrade`), save the user's payment method preference to a new column in the `users` table (e.g., `preferred_payment`).
- Then, display a message like *"Thank you! Our team will contact you shortly via email at [user's email] to complete your Pro upgrade via [selected method]."*
- This simulates a manual, off-platform payment handling process which is common for local payment methods."

**Expected AI Output:**
*   ALTER TABLE statements for the new columns (`daily_queries`, `last_query_date`, `preferred_payment`).
*   Updated daily limit logic in the main generation route.
*   Code for the `/upgrade` (GET) and `/upgrade` (POST) routes.
*   The `upgrade.html` template with the payment method inquiry form.

---

### **Part 6: (Optional) Automated Pro Upgrade**

**Prompt:**
"(For future development) Let's outline a simple system for manually marking a user as Pro after they pay.
Create an admin-only route, e.g., `POST /admin/user/<user_id>/make-pro`, that flips the `is_pro` flag for a user to `True`. This would be used by an administrator *after* confirming a payment has been received via M-Pesa, Airtel, etc.

This completes the core application flow: User expresses payment preference -> Admin processes payment manually -> Admin uses this route to grant Pro status."

**Expected AI Output:**
*   Code for a simple admin route to upgrade users, protected by a basic check.





# Project README

## Technology Stack

This project was built using **Bolt.new**, a modern web development platform that enables rapid prototyping and deployment. The application utilizes a comprehensive frontend technology stack to deliver a robust user experience.

### Frontend Technologies

#### HTML5
- **Purpose**: Provides the semantic structure and markup for the application
- **Implementation**: Modern HTML5 elements and attributes for accessibility and SEO optimization
- **Features**: Semantic markup, form validation, and responsive meta tags

#### CSS3
- **Purpose**: Handles all styling, layout, and visual presentation
- **Implementation**: Modern CSS3 features including:
  - Flexbox and CSS Grid for responsive layouts
  - CSS Variables for consistent theming
  - Transitions and animations for enhanced user experience
  - Media queries for mobile-responsive design

#### JavaScript (ES6+)
- **Purpose**: Provides dynamic functionality and user interactions
- **Implementation**: Modern JavaScript features including:
  - ES6+ syntax (arrow functions, destructuring, modules)
  - DOM manipulation and event handling
  - Asynchronous operations (Promises, async/await)
  - API integration and data fetching

#### TypeScript
- **Purpose**: Adds static type checking and enhanced developer experience
- **Benefits**:
  - Type safety to catch errors at compile time
  - Better IDE support with autocomplete and refactoring
  - Enhanced code documentation through type definitions
  - Improved maintainability for larger codebases
- **Configuration**: Configured with strict type checking for robust code quality

### Development Environment

Built with **Bolt.new** platform features:
- Instant preview and hot reloading
- Integrated development environment
- Seamless deployment workflow
- Built-in package management

### Project Structure

The codebase follows modern web development best practices with clear separation of concerns:
- HTML files for page structure
- CSS files for styling and layout
- JavaScript/TypeScript files for application logic
- Modular architecture for maintainable code

## Getting Started

This project is optimized for the Bolt.new platform and includes all necessary configurations for immediate development and deployment.

---


  
