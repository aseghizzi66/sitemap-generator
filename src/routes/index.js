const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { rows: projects } = await db.query('SELECT * FROM projects ORDER BY name');
    res.render('index', { projects });
  } catch (err) { next(err); }
});

router.post('/projects/add', async (req, res, next) => {
  try {
    const { name } = req.body;
    const { rows: [p] } = await db.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING id',
      [name.trim()]
    );
    // Crea nodo radice
    await db.query(
      "INSERT INTO the_site_map (id, project_id, label, template) VALUES ('0', $1, 'Home', 'def')",
      [p.id]
    );
    res.redirect('/');
  } catch (err) { next(err); }
});

router.post('/projects/delete', async (req, res, next) => {
  try {
    await db.query('DELETE FROM projects WHERE id = $1', [req.body.projectId]);
    res.redirect('/');
  } catch (err) { next(err); }
});

module.exports = router;
