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





# Website Documentation

## Overview

This website provides a comprehensive chat platform with robust security measures, flexible monetization options, and complete chat history management. Built with user privacy and experience as core priorities.

## 🔐 Security Features

### Authentication System
Our platform implements a dual-layer authentication system to ensure maximum security for all users.

#### Email & Password Authentication
- **Secure Registration**: Users create accounts using verified email addresses and strong passwords
- **Password Requirements**: 
  - Minimum 8 characters
  - Must include uppercase and lowercase letters
  - Must contain at least one number and special character
  - Real-time password strength indicator during registration
- **Email Verification**: All new accounts require email confirmation before activation
- **Password Reset**: Secure password recovery via email with time-limited reset tokens

#### Security Measures
- **Password Hashing**: All passwords are hashed using bcrypt with salt rounds for maximum protection
- **Session Management**: Secure session handling with automatic timeout for inactive users
- **HTTPS Encryption**: All data transmission is encrypted using SSL/TLS protocols
- **Brute Force Protection**: Rate limiting prevents automated login attempts
- **Input Validation**: All user inputs are sanitized to prevent XSS and SQL injection attacks
- **CSRF Protection**: Cross-site request forgery tokens protect against malicious requests

#### Data Protection
- **Personal Information**: User data is stored securely with encryption at rest
- **Privacy Compliance**: Adherence to GDPR and other privacy regulations
- **Regular Security Audits**: Periodic security assessments and vulnerability testing
- **Secure Headers**: Implementation of security headers (HSTS, CSP, X-Frame-Options)

## 💰 Monetization Strategy

### Freemium Model
Our platform operates on a freemium business model, providing value to both free and premium users while ensuring sustainable growth.

#### Free Tier Features
- **Basic Chat Access**: Limited number of messages per day/month
- **Standard Response Time**: Regular processing speed for conversations
- **Basic Chat History**: Access to last 30 days of chat history
- **Community Support**: Access to community forums and basic help documentation
- **Standard Security**: All security features included at no cost

#### Premium Tier Benefits
- **Unlimited Messaging**: No restrictions on daily or monthly message limits
- **Priority Processing**: Faster response times and reduced wait periods
- **Extended Chat History**: Complete chat history with advanced search capabilities
- **Premium Support**: Priority customer support with faster response times
- **Advanced Features**: Access to experimental features and beta testing
- **Export Capabilities**: Download chat histories in multiple formats (PDF, JSON, CSV)
- **Custom Integrations**: API access for third-party integrations
- **Analytics Dashboard**: Detailed usage statistics and conversation insights

#### Subscription Plans
- **Monthly Premium**: $9.99/month with full premium features
- **Annual Premium**: $99.99/year (16% savings) with additional perks
- **Team Plans**: Custom pricing for organizations and teams
- **Enterprise**: Tailored solutions for large-scale deployments

#### Revenue Streams
1. **Subscription Revenue**: Primary income from premium subscriptions
2. **Usage-Based Billing**: Optional pay-per-use for high-volume users
3. **Enterprise Licensing**: Custom solutions for business clients
4. **API Access**: Developer tier for integration services
5. **Add-on Services**: Optional premium features and extensions

## 📚 Chat History Management

### Dashboard Integration
The chat history feature is seamlessly integrated into the user dashboard, providing comprehensive conversation management.

#### Chat History Button
- **Easy Access**: Prominently placed chat history button in the main dashboard
- **Quick Navigation**: One-click access to all previous conversations
- **Visual Indicators**: Clear badges showing unread messages and recent activity
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

#### History Features

##### Organization & Search
- **Chronological Sorting**: Conversations organized by date with newest first
- **Advanced Search**: Full-text search across all chat messages
- **Filter Options**: Filter by date range, conversation type, or keywords
- **Categorization**: Automatic tagging and manual category assignment
- **Favorites**: Bookmark important conversations for quick access

##### Data Management
- **Conversation Threading**: Related messages grouped in threaded conversations
- **Message Timestamps**: Precise time and date stamps for all messages
- **User Context**: Clear indication of message sender and recipient
- **Media Support**: Support for images, files, and rich media in chat history
- **Bulk Operations**: Select multiple conversations for mass actions

##### Export & Backup
- **Multiple Formats**: Export conversations in PDF, JSON, CSV, or plain text
- **Selective Export**: Choose specific conversations or date ranges
- **Automatic Backup**: Regular automated backups of chat data
- **Data Portability**: Easy migration tools for switching platforms
- **Archive Management**: Long-term storage options for inactive conversations

#### Privacy Controls
- **Deletion Options**: Permanent deletion of individual messages or entire conversations
- **Retention Settings**: Customizable data retention periods
- **Privacy Modes**: Incognito chat options that don't save history
- **Access Logs**: Track when and how chat history is accessed
- **Consent Management**: Clear opt-in/opt-out controls for data collection

#### Technical Implementation
- **Database Optimization**: Efficient indexing for fast search and retrieval
- **Scalable Storage**: Cloud-based storage solution for unlimited history
- **Real-time Sync**: Instant synchronization across all user devices
- **Offline Access**: Cached recent conversations for offline viewing
- **Performance Monitoring**: Continuous monitoring of load times and system performance

## 🚀 Getting Started

### For Users
1. **Sign Up**: Create your account using email and secure password
2. **Verify Email**: Check your inbox and click the verification link
3. **Start Chatting**: Begin conversations immediately with free tier access
4. **Explore History**: Use the chat history button to review past conversations
5. **Upgrade**: Consider premium subscription for enhanced features

### For Developers
1. **API Documentation**: Comprehensive API docs available in developer section
2. **Integration Guides**: Step-by-step integration tutorials
3. **SDKs Available**: Multiple programming language SDKs
4. **Sandbox Environment**: Test environment for development and testing
5. **Community Support**: Active developer community and forums

## 📞 Support & Contact

- **Documentation**: Comprehensive help center with FAQs and guides
- **Community Forums**: Active user community for peer support
- **Email Support**: Direct email support for account and technical issues
- **Premium Support**: Priority support channel for premium subscribers
- **Bug Reports**: Dedicated channel for reporting issues and feedback

## 🔄 Updates & Roadmap

- **Regular Updates**: Monthly feature updates and security patches
- **User Feedback**: Feature requests tracked and prioritized
- **Transparent Roadmap**: Public roadmap showing upcoming features
- **Beta Testing**: Early access programs for premium users
- **Change Logs**: Detailed documentation of all updates and changes

---

*Last Updated: [Current Date]*
*Version: 2.0*


  
