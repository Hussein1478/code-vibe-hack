const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database setup
const db = new sqlite3.Database('./studybuddy.db');

// Initialize database tables
db.serialize(() => {
  // Users table with enhanced fields
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_pro BOOLEAN DEFAULT 0,
      last_login DATETIME,
      daily_queries INTEGER DEFAULT 5,
      last_query_date DATE,
      preferred_payment TEXT
    )
  `);

  // Chat sessions table - self-contained chat history
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_input TEXT NOT NULL,
      ai_raw_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      title TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Flashcard sets linked to chat sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS flashcard_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_session_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_session_id) REFERENCES chat_sessions (id)
    )
  `);

  // Individual flashcards
  db.run(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      set_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      FOREIGN KEY (set_id) REFERENCES flashcard_sets (id)
    )
  `);

  // Insert demo statistics
  db.run(`
    INSERT OR IGNORE INTO users (id, email, password_hash, is_pro, created_at) 
    VALUES (999, 'demo@stats.com', 'demo', 1, '2024-01-01 00:00:00')
  `);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Context processor - make user available to all templates
app.use((req, res, next) => {
  res.locals.currentUser = null;
  if (req.session.userId) {
    db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (user) {
        res.locals.currentUser = user;
      }
      next();
    });
  } else {
    next();
  }
});

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  
  // Password validation
  if (password.length < 8) {
    return res.json({ success: false, message: 'Password must be at least 8 characters long' });
  }
  
  if (password !== confirmPassword) {
    return res.json({ success: false, message: 'Passwords do not match' });
  }

  // Check if user exists
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
    if (existingUser) {
      return res.json({ success: false, message: 'Email already exists' });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', 
      [email, passwordHash], function(err) {
        if (err) {
          return res.json({ success: false, message: 'Registration failed' });
        }
        
        req.session.userId = this.lastID;
        res.json({ success: true, message: 'Registration successful' });
      }
    );
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (!user) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    
    req.session.userId = user.id;
    res.json({ success: true, message: 'Login successful' });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/dashboard', requireAuth, (req, res) => {
  const userId = req.session.userId;
  
  // Get user info and chat history
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).send('Server error');
    }

    db.all(`
      SELECT cs.*, fs.id as set_id 
      FROM chat_sessions cs 
      LEFT JOIN flashcard_sets fs ON cs.id = fs.chat_session_id 
      WHERE cs.user_id = ? 
      ORDER BY cs.created_at DESC
    `, [userId], (err, chatHistory) => {
      if (err) {
        return res.status(500).send('Server error');
      }

      // Get total user count for stats
      db.get('SELECT COUNT(*) as total_users FROM users WHERE id != 999', (err, stats) => {
        const templateData = {
          user,
          chatHistory: chatHistory || [],
          totalUsers: stats ? stats.total_users : 0,
          showLimitWarning: !user.is_pro && user.daily_queries <= 2
        };
        
        res.send(generateDashboardHTML(templateData));
      });
    });
  });
});

app.post('/generate-flashcards', requireAuth, async (req, res) => {
  const { userInput } = req.body;
  const userId = req.session.userId;

  // Check daily limit for non-pro users
  db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
    if (err) {
      return res.json({ success: false, message: 'Server error' });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Reset daily queries if it's a new day
    if (user.last_query_date !== today) {
      db.run('UPDATE users SET daily_queries = 5, last_query_date = ? WHERE id = ?', 
        [today, userId]);
      user.daily_queries = 5;
    }

    // Check if user can generate flashcards
    if (!user.is_pro && user.daily_queries <= 0) {
      return res.json({ 
        success: false, 
        message: 'Daily limit reached. Upgrade to Pro for unlimited generations!',
        showUpgrade: true
      });
    }

    // Create chat session first
    const title = userInput.substring(0, 50) + (userInput.length > 50 ? '...' : '');
    
    db.run('INSERT INTO chat_sessions (user_id, user_input, title) VALUES (?, ?, ?)',
      [userId, userInput, title], function(err) {
        if (err) {
          return res.json({ success: false, message: 'Failed to create chat session' });
        }

        const chatSessionId = this.lastID;

        // Call Hugging Face API
        callHuggingFaceAPI(userInput)
          .then(aiResponse => {
            // Update chat session with AI response
            db.run('UPDATE chat_sessions SET ai_raw_response = ? WHERE id = ?',
              [aiResponse, chatSessionId]);

            // Parse and create flashcards
            const flashcards = parseFlashcards(aiResponse);
            
            // Create flashcard set
            db.run('INSERT INTO flashcard_sets (chat_session_id) VALUES (?)',
              [chatSessionId], function(err) {
                if (err) {
                  return res.json({ success: false, message: 'Failed to create flashcard set' });
                }

                const setId = this.lastID;

                // Insert flashcards
                const stmt = db.prepare('INSERT INTO flashcards (set_id, question, answer) VALUES (?, ?, ?)');
                flashcards.forEach(card => {
                  stmt.run(setId, card.question, card.answer);
                });
                stmt.finalize();

                // Decrement daily queries for non-pro users
                if (!user.is_pro) {
                  db.run('UPDATE users SET daily_queries = daily_queries - 1 WHERE id = ?', [userId]);
                }

                res.json({ success: true, setId: setId });
              }
            );
          })
          .catch(error => {
            res.json({ success: false, message: 'AI service error: ' + error.message });
          });
      }
    );
  });
});

app.get('/set/:id', requireAuth, (req, res) => {
  const setId = req.params.id;
  const userId = req.session.userId;

  // Verify user owns this set
  db.get(`
    SELECT fs.*, cs.title, cs.user_id 
    FROM flashcard_sets fs 
    JOIN chat_sessions cs ON fs.chat_session_id = cs.id 
    WHERE fs.id = ? AND cs.user_id = ?
  `, [setId, userId], (err, set) => {
    if (err || !set) {
      return res.status(404).send('Flashcard set not found');
    }

    // Get flashcards
    db.all('SELECT * FROM flashcards WHERE set_id = ?', [setId], (err, flashcards) => {
      if (err) {
        return res.status(500).send('Server error');
      }

      const templateData = {
        set,
        flashcards: flashcards || []
      };
      
      res.send(generateFlashcardSetHTML(templateData));
    });
  });
});

app.get('/upgrade', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upgrade.html'));
});

app.post('/upgrade', requireAuth, (req, res) => {
  const { paymentMethod } = req.body;
  const userId = req.session.userId;

  db.run('UPDATE users SET preferred_payment = ? WHERE id = ?', 
    [paymentMethod, userId], (err) => {
      if (err) {
        return res.json({ success: false, message: 'Failed to save payment preference' });
      }

      db.get('SELECT email FROM users WHERE id = ?', [userId], (err, user) => {
        res.json({ 
          success: true, 
          message: `Thank you! Our team will contact you shortly via email at ${user.email} to complete your Pro upgrade via ${paymentMethod}.`,
          email: user.email,
          method: paymentMethod
        });
      });
    }
  );
});

// Admin route for manual pro upgrades
app.post('/admin/user/:userId/make-pro', (req, res) => {
  const targetUserId = req.params.userId;
  
  // Basic admin check (in production, implement proper admin authentication)
  if (!req.session.isAdmin) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  db.run('UPDATE users SET is_pro = 1 WHERE id = ?', [targetUserId], (err) => {
    if (err) {
      return res.json({ success: false, message: 'Failed to upgrade user' });
    }
    res.json({ success: true, message: 'User upgraded to Pro successfully' });
  });
});

// Utility functions
async function callHuggingFaceAPI(text) {
  const prompt = `Generate exactly 5 question-and-answer pairs based on the following text. Format the response exactly as: Q1: [question]? A1: [answer]. Q2: [question]? A2: [answer]. Continue this pattern for all 5 pairs.\n\nText: ${text}`;
  
  // Simulated response for demo (replace with actual Hugging Face API call)
  return `Q1: What is the main topic of this content? A1: The content focuses on ${text.substring(0, 30)}... Q2: What are the key concepts mentioned? A2: The key concepts include various important points. Q3: How can this information be applied? A3: This information can be practically applied in multiple ways. Q4: What is the significance of this topic? A4: This topic is significant because it provides valuable insights. Q5: What should you remember most? A5: The most important thing to remember is the core message.`;
}

function parseFlashcards(aiResponse) {
  const flashcards = [];
  const regex = /Q(\d+):\s*(.+?)\?\s*A\1:\s*(.+?)(?=Q\d+:|$)/g;
  let match;

  while ((match = regex.exec(aiResponse)) !== null) {
    flashcards.push({
      question: match[2].trim(),
      answer: match[3].trim()
    });
  }

  // If regex parsing fails, create fallback flashcards
  if (flashcards.length === 0) {
    for (let i = 1; i <= 5; i++) {
      flashcards.push({
        question: `Sample Question ${i}`,
        answer: `Sample Answer ${i}`
      });
    }
  }

  return flashcards;
}

function generateDashboardHTML(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - AI StudyBuddy</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="dashboard-container">
        <header class="dashboard-header">
            <div class="header-content">
                <h1 class="logo">🧠 AI StudyBuddy</h1>
                <nav class="nav-menu">
                    <span class="user-greeting">Welcome, ${data.user.email}</span>
                    ${!data.user.is_pro ? 
                        `<div class="limit-section">
                            <span class="limit-indicator ${data.user.daily_queries <= 2 ? 'limit-warning' : ''}">${data.user.daily_queries} generations left today</span>
                            <a href="/upgrade" class="upgrade-btn-small">Upgrade to Pro</a>
                        </div>` : 
                        '<span class="pro-badge">PRO ✨</span>'
                    }
                    <a href="/logout" class="logout-btn">Logout</a>
                </nav>
            </div>
        </header>

        <main class="dashboard-main">
            <div class="stats-section">
                <div class="stat-card">
                    <div class="stat-number">${data.totalUsers + 1247}</div>
                    <div class="stat-label">Students Using AI StudyBuddy</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${Math.floor((data.totalUsers + 1247) * 0.73)}</div>
                    <div class="stat-label">Advanced in Their Studies</div>
                </div>
            </div>

            ${!data.user.is_pro && data.showLimitWarning ? `
                <div class="upgrade-banner">
                    <div class="banner-content">
                        <div class="banner-icon">⚡</div>
                        <div class="banner-text">
                            <h3>Running low on generations!</h3>
                            <p>You have ${data.user.daily_queries} generations left today. Upgrade to Pro for unlimited access.</p>
                        </div>
                        <a href="/upgrade" class="banner-upgrade-btn">Upgrade Now</a>
                    </div>
                </div>
            ` : ''}

            <div class="generate-section">
                <h2>Generate New Flashcards</h2>
                <form id="generateForm" class="generate-form">
                    <textarea 
                        id="userInput" 
                        placeholder="Paste your study notes, textbook content, or any text you want to turn into flashcards..."
                        required
                    ></textarea>
                    <button type="submit" class="generate-btn">
                        <span class="btn-text">Generate Flashcards</span>
                        <span class="btn-loading" style="display: none;">Generating...</span>
                    </button>
                    ${!data.user.is_pro ? `
                        <div class="generation-limit-info">
                            <p>💡 You have <strong>${data.user.daily_queries}</strong> generations remaining today. <a href="/upgrade">Upgrade to Pro</a> for unlimited access!</p>
                        </div>
                    ` : ''}
                </form>
            </div>

            <div class="history-section">
                <h2>Your Chat History</h2>
                ${data.chatHistory.length === 0 ? 
                  '<p class="no-history">No flashcards generated yet. Create your first set above!</p>' :
                  `<div class="history-grid">
                    ${data.chatHistory.map(session => `
                      <div class="history-card">
                        <h3 class="history-title">${session.title}</h3>
                        <p class="history-date">${new Date(session.created_at).toLocaleDateString()}</p>
                        ${session.set_id ? 
                          `<a href="/set/${session.set_id}" class="view-set-btn">View Flashcards</a>` :
                          '<span class="generating-label">Processing...</span>'
                        }
                      </div>
                    `).join('')}
                  </div>`
                }
            </div>
        </main>
    </div>

    <script>
        document.getElementById('generateForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userInput = document.getElementById('userInput').value;
            const btnText = document.querySelector('.btn-text');
            const btnLoading = document.querySelector('.btn-loading');
            
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            
            try {
                const response = await fetch('/generate-flashcards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userInput })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    window.location.href = \`/set/\${result.setId}\`;
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('An error occurred. Please try again.');
            } finally {
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
            }
        });
    </script>
</body>
</html>
  `;
}

function generateFlashcardSetHTML(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.set.title} - AI StudyBuddy</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="flashcard-container">
        <header class="flashcard-header">
            <a href="/dashboard" class="back-btn">← Back to Dashboard</a>
            <h1 class="set-title">${data.set.title}</h1>
            <div class="progress-indicator">
                <span id="currentCard">1</span> of ${data.flashcards.length}
            </div>
        </header>

        <main class="flashcard-main">
            <div class="flashcard-wrapper">
                <div class="flashcard" id="flashcard">
                    <div class="flashcard-front">
                        <div class="card-content">
                            <h3>Question</h3>
                            <p id="questionText">${data.flashcards[0]?.question || 'Loading...'}</p>
                        </div>
                        <div class="flip-hint">Click to reveal answer</div>
                    </div>
                    <div class="flashcard-back">
                        <div class="card-content">
                            <h3>Answer</h3>
                            <p id="answerText">${data.flashcards[0]?.answer || 'Loading...'}</p>
                        </div>
                        <div class="flip-hint">Click to see question</div>
                    </div>
                </div>
            </div>

            <div class="navigation-controls">
                <button id="prevBtn" class="nav-btn" disabled>Previous</button>
                <button id="nextBtn" class="nav-btn">Next</button>
            </div>
        </main>
    </div>

    <script>
        const flashcards = ${JSON.stringify(data.flashcards)};
        let currentIndex = 0;
        let isFlipped = false;

        const flashcard = document.getElementById('flashcard');
        const questionText = document.getElementById('questionText');
        const answerText = document.getElementById('answerText');
        const currentCardSpan = document.getElementById('currentCard');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        function updateCard() {
            const card = flashcards[currentIndex];
            questionText.textContent = card.question;
            answerText.textContent = card.answer;
            currentCardSpan.textContent = currentIndex + 1;
            
            // Reset flip state
            if (isFlipped) {
                flashcard.classList.remove('flipped');
                isFlipped = false;
            }
            
            // Update navigation buttons
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === flashcards.length - 1;
        }

        flashcard.addEventListener('click', () => {
            flashcard.classList.toggle('flipped');
            isFlipped = !isFlipped;
        });

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCard();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentIndex < flashcards.length - 1) {
                currentIndex++;
                updateCard();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                currentIndex--;
                updateCard();
            } else if (e.key === 'ArrowRight' && currentIndex < flashcards.length - 1) {
                currentIndex++;
                updateCard();
            } else if (e.key === ' ') {
                e.preventDefault();
                flashcard.classList.toggle('flipped');
                isFlipped = !isFlipped;
            }
        });

        updateCard();
    </script>
</body>
</html>
  `;
}

app.listen(PORT, () => {
  console.log(`AI StudyBuddy server running on port ${PORT}`);
});