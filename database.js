const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'clubs.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'member',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Clubs table
      db.run(`
        CREATE TABLE IF NOT EXISTS clubs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          membership_fee REAL DEFAULT 0,
          owner_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users (id)
        )
      `);

      // Memberships table
      db.run(`
        CREATE TABLE IF NOT EXISTS memberships (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          club_id INTEGER NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (club_id) REFERENCES clubs (id),
          UNIQUE(user_id, club_id)
        )
      `);

      // Events table
      db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          club_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          location TEXT,
          starts_at DATETIME NOT NULL,
          ends_at DATETIME,
          event_type TEXT DEFAULT 'free',
          price REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (club_id) REFERENCES clubs (id)
        )
      `);

      // Attendance table
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          UNIQUE(event_id, user_id)
        )
      `);

      // Payments table
      db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          club_id INTEGER NOT NULL,
          user_id INTEGER,
          amount REAL NOT NULL,
          paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          type TEXT DEFAULT 'membership',
          description TEXT,
          event_id INTEGER,
          month TEXT,
          FOREIGN KEY (club_id) REFERENCES clubs (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (event_id) REFERENCES events (id)
        )
      `);

      // Finances table
      db.run(`
        CREATE TABLE IF NOT EXISTS finances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          club_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (club_id) REFERENCES clubs (id)
        )
      `);

      // Schedules table
      db.run(`
        CREATE TABLE IF NOT EXISTS schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          club_id INTEGER NOT NULL,
          day_of_week INTEGER NOT NULL,
          time TEXT NOT NULL,
          duration INTEGER NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (club_id) REFERENCES clubs (id)
        )
      `);

      // Event payments table
      db.run(`
        CREATE TABLE IF NOT EXISTS event_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'paid',
          FOREIGN KEY (event_id) REFERENCES events (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Monthly contributions table
      db.run(`
        CREATE TABLE IF NOT EXISTS monthly_contributions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          club_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          month TEXT NOT NULL,
          paid_at DATETIME,
          status TEXT DEFAULT 'pending',
          FOREIGN KEY (club_id) REFERENCES clubs (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Insert or update default admin user with correct password hash for 'admin123'
      db.run(`
        INSERT OR REPLACE INTO users (id, name, email, password, role) 
        VALUES (1, 'Администратор', 'admin@example.com', '$2a$10$7RjRWccKjPgSKV35TzbuQOlKCZv5EHXFwdtydIqOxWkH7HvF336Ku', 'admin')
      `, (err) => {
        if (err) {
          console.error('Error inserting admin user:', err.message);
        } else {
          console.log('Database initialized successfully');
          resolve();
        }
      });
    });
  });
}

module.exports = { db, initDatabase };

