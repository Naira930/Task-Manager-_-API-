const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const VALID_STATUSES = ['pending', 'in_progress', 'done'];

function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

router.use(authenticateToken, apiLimiter);

router.post('/', async (req, res) => {
  try {
    const { title, description, status, due_date } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status && !isValidStatus(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, status, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title.trim(), description || null, status || 'pending', due_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    if (status && !isValidStatus(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const query = status
      ? { text: 'SELECT * FROM tasks WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC', values: [req.user.id, status] }
      : { text: 'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', values: [req.user.id] };

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { title, description, status, due_date } = req.body;

    if (status && !isValidStatus(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const existing = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const current = existing.rows[0];

    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, due_date = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        title !== undefined ? title : current.title,
        description !== undefined ? description : current.description,
        status !== undefined ? status : current.status,
        due_date !== undefined ? due_date : current.due_date,
        req.params.id,
        req.user.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
