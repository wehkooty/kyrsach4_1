const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { db, initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to run database queries
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const runQueryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const runInsert = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await runQueryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await runInsert(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'member']
    );

    // Generate token
    const token = jwt.sign(
      { id: result.id, email, role: 'member' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'User created successfully',
      token,
      user: { id: result.id, name, email, role: 'member' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await runQueryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Users routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await runQuery('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { role } = req.body;
    const { id } = req.params;

    if (!['admin', 'organizer', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await runInsert('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clubs routes
app.get('/api/clubs', authenticateToken, async (req, res) => {
  try {
    const clubs = await runQuery(`
      SELECT c.*, u.name as owner_name 
      FROM clubs c 
      LEFT JOIN users u ON c.owner_id = u.id 
      ORDER BY c.name
    `);
    res.json(clubs);
  } catch (error) {
    console.error('Get clubs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs', authenticateToken, async (req, res) => {
  try {
    const { name, description, membershipFee } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Club name is required' });
    }

    const result = await runInsert(
      'INSERT INTO clubs (name, description, membership_fee, owner_id) VALUES (?, ?, ?, ?)',
      [name, description || '', membershipFee || 0, req.user.id]
    );

    res.json({ message: 'Club created successfully', id: result.id });
  } catch (error) {
    console.error('Create club error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/clubs/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, membershipFee } = req.body;
    const { id } = req.params;

    // Check if user owns the club or is admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert(
      'UPDATE clubs SET name = ?, description = ?, membership_fee = ? WHERE id = ?',
      [name, description || '', membershipFee || 0, id]
    );

    res.json({ message: 'Club updated successfully' });
  } catch (error) {
    console.error('Update club error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/clubs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the club or is admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete related data
    await runInsert('DELETE FROM memberships WHERE club_id = ?', [id]);
    await runInsert('DELETE FROM events WHERE club_id = ?', [id]);
    await runInsert('DELETE FROM payments WHERE club_id = ?', [id]);
    await runInsert('DELETE FROM finances WHERE club_id = ?', [id]);
    await runInsert('DELETE FROM schedules WHERE club_id = ?', [id]);
    await runInsert('DELETE FROM monthly_contributions WHERE club_id = ?', [id]);
    await runInsert('DELETE FROM clubs WHERE id = ?', [id]);

    res.json({ message: 'Club deleted successfully' });
  } catch (error) {
    console.error('Delete club error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Memberships routes
app.get('/api/clubs/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is member, owner, or admin
    const isMember = await runQueryOne(
      'SELECT id FROM memberships WHERE user_id = ? AND club_id = ?',
      [req.user.id, id]
    );
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    const canAccess = isMember || club?.owner_id === req.user.id || req.user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = await runQuery(`
      SELECT m.*, u.name as user_name, u.email as user_email
      FROM memberships m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.club_id = ?
      ORDER BY m.joined_at DESC
    `, [id]);

    res.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already a member
    const existingMembership = await runQueryOne(
      'SELECT id FROM memberships WHERE user_id = ? AND club_id = ?',
      [userId, id]
    );

    if (existingMembership) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    await runInsert(
      'INSERT INTO memberships (user_id, club_id) VALUES (?, ?)',
      [userId, id]
    );

    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if already a member
    const existingMembership = await runQueryOne(
      'SELECT id FROM memberships WHERE user_id = ? AND club_id = ?',
      [req.user.id, id]
    );

    if (existingMembership) {
      return res.status(400).json({ error: 'Already a member of this club' });
    }

    await runInsert(
      'INSERT INTO memberships (user_id, club_id) VALUES (?, ?)',
      [req.user.id, id]
    );

    res.json({ message: 'Successfully joined the club' });
  } catch (error) {
    console.error('Join club error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/clubs/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is a member
    const membership = await runQueryOne(
      'SELECT id FROM memberships WHERE user_id = ? AND club_id = ?',
      [req.user.id, id]
    );

    if (!membership) {
      return res.status(400).json({ error: 'Not a member of this club' });
    }

    // Check if user is the owner
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (club?.owner_id === req.user.id) {
      return res.status(400).json({ error: 'Club owner cannot leave the club' });
    }

    await runInsert(
      'DELETE FROM memberships WHERE user_id = ? AND club_id = ?',
      [req.user.id, id]
    );

    res.json({ message: 'Successfully left the club' });
  } catch (error) {
    console.error('Leave club error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/clubs/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert(
      'DELETE FROM memberships WHERE user_id = ? AND club_id = ?',
      [userId, id]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Events routes
app.get('/api/clubs/:id/events', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is member, owner, or admin
    const isMember = await runQueryOne(
      'SELECT id FROM memberships WHERE user_id = ? AND club_id = ?',
      [req.user.id, id]
    );
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    const canAccess = isMember || club?.owner_id === req.user.id || req.user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const events = await runQuery(`
      SELECT * FROM events 
      WHERE club_id = ? 
      ORDER BY starts_at DESC
    `, [id]);

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs/:id/events', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, location, startsAt, endsAt, eventType, price } = req.body;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!title || !startsAt) {
      return res.status(400).json({ error: 'Title and start time are required' });
    }

    const result = await runInsert(
      'INSERT INTO events (club_id, title, description, location, starts_at, ends_at, event_type, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description || '', location || '', startsAt, endsAt || null, eventType || 'free', price || 0]
    );

    res.json({ message: 'Event created successfully', id: result.id });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Event payments routes (must be before :eventId route to avoid conflicts)
app.get('/api/clubs/:id/events/payments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Getting event payments for club:', id);

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      console.log('Club not found:', id);
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      console.log('Access denied for user:', req.user.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    const events = await runQuery('SELECT * FROM events WHERE club_id = ? AND event_type = ? ORDER BY starts_at DESC', [id, 'paid']);
    console.log('Found events:', events.length);
    
    const eventsWithPayments = await Promise.all(events.map(async (event) => {
      const payments = await runQuery(`
        SELECT ep.*, u.name as user_name, u.email as user_email
        FROM event_payments ep
        LEFT JOIN users u ON ep.user_id = u.id
        WHERE ep.event_id = ?
      `, [event.id]);

      const attendees = await runQuery(`
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.event_id = ?
      `, [event.id]);

      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidCount = payments.length;
      const unpaidCount = Math.max(0, attendees.length - paidCount);
      const unpaidAttendees = attendees.filter(a => !payments.some(p => p.user_id === a.user_id));

      return {
        ...event,
        payments: payments || [],
        attendees: attendees || [],
        totalRevenue,
        paidCount,
        unpaidCount,
        unpaidAttendees
      };
    }));

    res.json(eventsWithPayments);
  } catch (error) {
    console.error('Get event payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/clubs/:id/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { id, eventId } = req.params;
    const { title, description, location, startsAt, endsAt, eventType, price } = req.body;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert(
      'UPDATE events SET title = ?, description = ?, location = ?, starts_at = ?, ends_at = ?, event_type = ?, price = ? WHERE id = ? AND club_id = ?',
      [title, description || '', location || '', startsAt, endsAt || null, eventType || 'free', price || 0, eventId, id]
    );

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/clubs/:id/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const { id, eventId } = req.params;

    // Check if user is member, owner, or admin
    const isMember = await runQueryOne(
      'SELECT id FROM memberships WHERE user_id = ? AND club_id = ?',
      [req.user.id, id]
    );
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    const canAccess = isMember || club?.owner_id === req.user.id || req.user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const event = await runQueryOne(
      'SELECT * FROM events WHERE id = ? AND club_id = ?',
      [eventId, id]
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get attendance count
    const attendance = await runQueryOne(
      'SELECT COUNT(*) as count FROM attendance WHERE event_id = ?',
      [eventId]
    );

    // Check if user is registered
    const userAttendance = await runQueryOne(
      'SELECT id FROM attendance WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );

    res.json({
      ...event,
      attendanceCount: attendance.count,
      isRegistered: !!userAttendance
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Attendance routes
app.post('/api/events/:eventId/register', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if already registered
    const existingAttendance = await runQueryOne(
      'SELECT id FROM attendance WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );

    if (existingAttendance) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    await runInsert(
      'INSERT INTO attendance (event_id, user_id) VALUES (?, ?)',
      [eventId, req.user.id]
    );

    res.json({ message: 'Successfully registered for event' });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:eventId/unregister', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    await runInsert(
      'DELETE FROM attendance WHERE event_id = ? AND user_id = ?',
      [eventId, req.user.id]
    );

    res.json({ message: 'Successfully unregistered from event' });
  } catch (error) {
    console.error('Unregister from event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Statistics route
app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await runQueryOne(`
      SELECT 
        (SELECT COUNT(*) FROM clubs) as totalClubs,
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM events) as totalEvents,
        (SELECT COUNT(*) FROM memberships) as totalMemberships,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) as totalIncome,
        (SELECT COALESCE(SUM(amount), 0) FROM finances WHERE type = 'expense') as totalExpenses
    `);

    // Get additional statistics
    const clubsByOwner = await runQuery(`
      SELECT u.name as owner_name, COUNT(c.id) as club_count
      FROM users u
      LEFT JOIN clubs c ON u.id = c.owner_id
      GROUP BY u.id, u.name
    `);

    const eventsByMonth = await runQuery(`
      SELECT strftime('%Y-%m', datetime(starts_at/1000, 'unixepoch')) as month, COUNT(*) as count
      FROM events
      GROUP BY strftime('%Y-%m', datetime(starts_at/1000, 'unixepoch'))
      ORDER BY month DESC
    `);

    const paymentsByMonth = await runQuery(`
      SELECT strftime('%Y-%m', datetime(paid_at/1000, 'unixepoch')) as month, SUM(amount) as total
      FROM payments
      GROUP BY strftime('%Y-%m', datetime(paid_at/1000, 'unixepoch'))
      ORDER BY month DESC
    `);

    res.json({
      ...stats,
      clubsByOwner,
      eventsByMonth,
      paymentsByMonth
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Finances routes
app.get('/api/clubs/:id/finances', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payments = await runQuery('SELECT * FROM payments WHERE club_id = ? ORDER BY paid_at DESC', [id]);
    const finances = await runQuery('SELECT * FROM finances WHERE club_id = ? ORDER BY date DESC', [id]);

    // Calculate balance
    const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + (f.amount || 0), 0);
    const balance = totalIncome - totalExpenses;

    res.json({
      payments,
      finances,
      balance,
      totalIncome,
      totalExpenses
    });
  } catch (error) {
    console.error('Get finances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs/:id/finances/income', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, userId } = req.body;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert(
      'INSERT INTO payments (club_id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)',
      [id, userId || null, amount, 'manual_income', description || '']
    );

    res.json({ message: 'Income added successfully' });
  } catch (error) {
    console.error('Add income error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs/:id/finances/expense', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, date } = req.body;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert(
      'INSERT INTO finances (club_id, type, description, amount, date) VALUES (?, ?, ?, ?, ?)',
      [id, 'expense', description, amount, date || Date.now()]
    );

    res.json({ message: 'Expense added successfully' });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Schedules routes
app.get('/api/clubs/:id/schedules', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is member, owner, or admin
    const isMember = await runQueryOne(
      'SELECT id FROM memberships WHERE user_id = ? AND club_id = ?',
      [req.user.id, id]
    );
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    const canAccess = isMember || club?.owner_id === req.user.id || req.user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const schedules = await runQuery('SELECT * FROM schedules WHERE club_id = ? ORDER BY day_of_week, time', [id]);
    res.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs/:id/schedules', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, time, duration, description } = req.body;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await runInsert(
      'INSERT INTO schedules (club_id, day_of_week, time, duration, description) VALUES (?, ?, ?, ?, ?)',
      [id, dayOfWeek, time, duration, description || '']
    );

    res.json({ message: 'Schedule added successfully', id: result.id });
  } catch (error) {
    console.error('Add schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/schedules/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is owner or admin
    const schedule = await runQueryOne('SELECT s.*, c.owner_id FROM schedules s JOIN clubs c ON s.club_id = c.id WHERE s.id = ?', [id]);
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    if (schedule.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert('DELETE FROM schedules WHERE id = ?', [id]);
    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events/:eventId/payments', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId, amount } = req.body;

    const event = await runQueryOne('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [event.club_id]);
    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert(
      'INSERT INTO event_payments (event_id, user_id, amount, status) VALUES (?, ?, ?, ?)',
      [eventId, userId, amount, 'paid']
    );

    // Add to club payments
    await runInsert(
      'INSERT INTO payments (club_id, user_id, amount, type, event_id) VALUES (?, ?, ?, ?, ?)',
      [event.club_id, userId, amount, 'event_payment', eventId]
    );

    res.json({ message: 'Payment recorded successfully' });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Monthly contributions routes
app.get('/api/clubs/:id/contributions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const contributions = await runQuery(`
      SELECT mc.*, u.name as user_name, u.email as user_email
      FROM monthly_contributions mc
      LEFT JOIN users u ON mc.user_id = u.id
      WHERE mc.club_id = ? AND mc.month = ?
      ORDER BY mc.created_at DESC
    `, [id, currentMonth]);

    const members = await runQuery(`
      SELECT m.*, u.name as user_name, u.email as user_email
      FROM memberships m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.club_id = ?
    `, [id]);

    res.json({ contributions, members, currentMonth });
  } catch (error) {
    console.error('Get contributions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/clubs/:id/contributions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is owner or admin
    const club = await runQueryOne('SELECT owner_id FROM clubs WHERE id = ?', [id]);
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const members = await runQuery('SELECT user_id FROM memberships WHERE club_id = ?', [id]);

    // Create contributions for all members
    for (const member of members) {
      await runInsert(
        'INSERT OR IGNORE INTO monthly_contributions (club_id, user_id, amount, month, status) VALUES (?, ?, ?, ?, ?)',
        [id, member.user_id, club.membership_fee || 0, currentMonth, 'pending']
      );
    }

    res.json({ message: 'Contributions created successfully' });
  } catch (error) {
    console.error('Create contributions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/contributions/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is owner or admin
    const contribution = await runQueryOne(`
      SELECT mc.*, c.owner_id 
      FROM monthly_contributions mc 
      JOIN clubs c ON mc.club_id = c.id 
      WHERE mc.id = ?
    `, [id]);

    if (!contribution) {
      return res.status(404).json({ error: 'Contribution not found' });
    }

    if (contribution.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await runInsert(
      'UPDATE monthly_contributions SET status = ?, paid_at = ? WHERE id = ?',
      ['paid', Date.now(), id]
    );

    // Add to club payments
    await runInsert(
      'INSERT INTO payments (club_id, user_id, amount, type, month) VALUES (?, ?, ?, ?, ?)',
      [contribution.club_id, contribution.user_id, contribution.amount, 'monthly_contribution', contribution.month]
    );

    res.json({ message: 'Contribution marked as paid' });
  } catch (error) {
    console.error('Mark contribution as paid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Excel export route
app.get('/api/statistics/export', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await runQueryOne(`
      SELECT 
        (SELECT COUNT(*) FROM clubs) as totalClubs,
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM events) as totalEvents,
        (SELECT COUNT(*) FROM memberships) as totalMemberships,
        (SELECT COALESCE(SUM(amount), 0) FROM payments) as totalIncome,
        (SELECT COALESCE(SUM(amount), 0) FROM finances WHERE type = 'expense') as totalExpenses
    `);

    const clubsByOwner = await runQuery(`
      SELECT u.name as owner_name, COUNT(c.id) as club_count
      FROM users u
      LEFT JOIN clubs c ON u.id = c.owner_id
      GROUP BY u.id, u.name
    `);

    const eventsByMonth = await runQuery(`
      SELECT strftime('%Y-%m', datetime(starts_at/1000, 'unixepoch')) as month, COUNT(*) as count
      FROM events
      GROUP BY strftime('%Y-%m', datetime(starts_at/1000, 'unixepoch'))
      ORDER BY month DESC
    `);

    const paymentsByMonth = await runQuery(`
      SELECT strftime('%Y-%m', datetime(paid_at/1000, 'unixepoch')) as month, SUM(amount) as total
      FROM payments
      GROUP BY strftime('%Y-%m', datetime(paid_at/1000, 'unixepoch'))
      ORDER BY month DESC
    `);

    // Create CSV content
    let csvContent = 'Статистика приложения\n\n';
    csvContent += 'Основные показатели\n';
    csvContent += `Общее количество клубов,${stats.totalClubs}\n`;
    csvContent += `Общее количество пользователей,${stats.totalUsers}\n`;
    csvContent += `Общее количество событий,${stats.totalEvents}\n`;
    csvContent += `Общее количество участников,${stats.totalMemberships}\n`;
    csvContent += `Общий доход,${stats.totalIncome}\n`;
    csvContent += `Общие расходы,${stats.totalExpenses}\n`;
    csvContent += `Общий баланс,${stats.totalIncome - stats.totalExpenses}\n\n`;
    
    csvContent += 'Распределение клубов по владельцам\n';
    csvContent += 'Владелец,Количество клубов\n';
    clubsByOwner.forEach(c => {
      csvContent += `${c.owner_name},${c.club_count}\n`;
    });
    
    csvContent += '\nСобытия по месяцам\n';
    csvContent += 'Месяц,Количество событий\n';
    eventsByMonth.forEach(e => {
      csvContent += `${e.month},${e.count}\n`;
    });
    
    csvContent += '\nДоходы по месяцам\n';
    csvContent += 'Месяц,Сумма доходов\n';
    paymentsByMonth.forEach(p => {
      csvContent += `${p.month},${p.total}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="statistics.csv"');
    res.send('\ufeff' + csvContent); // BOM for Excel compatibility
  } catch (error) {
    console.error('Export statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the application`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

