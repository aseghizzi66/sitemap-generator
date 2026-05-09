const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── GET / — lista template e elementi ─────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.redirect('/');

    const { rows: [project]  } = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const { rows: templates  } = await db.query('SELECT * FROM the_templates WHERE project_id = $1 ORDER BY name', [projectId]);
    const { rows: elements   } = await db.query('SELECT * FROM the_elements  WHERE project_id = $1 ORDER BY name', [projectId]);

    const colorMap = {};
    for (const t of templates) colorMap[t.name] = { bg: t.color, fg: t.text_color };
    for (const e of elements)  colorMap[e.name] = { bg: e.color, fg: e.text_color };

    res.render('edit-templates', { project, templates, elements, colorMap, msg: req.query.msg || '' });
  } catch (err) { next(err); }
});

// ── POST /template/add ────────────────────────────────────

router.post('/template/add', async (req, res, next) => {
  try {
    const { projectId, name, description, detailDescription, color, textColor } = req.body;
    await db.query(`
      INSERT INTO the_templates (name, project_id, description, detail_description, color, text_color)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [name.trim().toUpperCase(), projectId, description || '', detailDescription || '',
        (color || 'CCCCCC').replace('#', ''), (textColor || '000000').replace('#', '')]);
    res.redirect(`/templates?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── POST /template/edit ───────────────────────────────────

router.post('/template/edit', async (req, res, next) => {
  try {
    const { projectId, name, description, detailDescription, color, textColor } = req.body;
    await db.query(`
      UPDATE the_templates
      SET description = $1, detail_description = $2, color = $3, text_color = $4
      WHERE name = $5 AND project_id = $6
    `, [description || '', detailDescription || '',
        (color || 'CCCCCC').replace('#', ''), (textColor || '000000').replace('#', ''),
        name, projectId]);
    res.redirect(`/templates?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── POST /template/delete ─────────────────────────────────

router.post('/template/delete', async (req, res, next) => {
  try {
    const { projectId, name } = req.body;
    // Rimanda le pagine che usano questo template a 'def'
    await db.query(
      "UPDATE the_site_map SET template = 'def' WHERE project_id = $1 AND template = $2",
      [projectId, name]
    );
    await db.query('DELETE FROM the_templates WHERE name = $1 AND project_id = $2', [name, projectId]);
    res.redirect(`/templates?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── POST /element/add ─────────────────────────────────────

router.post('/element/add', async (req, res, next) => {
  try {
    const { projectId, name, description, detailDescription, color, textColor } = req.body;
    await db.query(`
      INSERT INTO the_elements (name, project_id, description, detail_description, color, text_color)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [name.trim().toUpperCase(), projectId, description || '', detailDescription || '',
        (color || 'CCCCCC').replace('#', ''), (textColor || '000000').replace('#', '')]);
    res.redirect(`/templates?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── POST /element/edit ────────────────────────────────────

router.post('/element/edit', async (req, res, next) => {
  try {
    const { projectId, name, description, detailDescription, color, textColor } = req.body;
    await db.query(`
      UPDATE the_elements
      SET description = $1, detail_description = $2, color = $3, text_color = $4
      WHERE name = $5 AND project_id = $6
    `, [description || '', detailDescription || '',
        (color || 'CCCCCC').replace('#', ''), (textColor || '000000').replace('#', ''),
        name, projectId]);
    res.redirect(`/templates?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── POST /element/delete ──────────────────────────────────

router.post('/element/delete', async (req, res, next) => {
  try {
    const { projectId, name } = req.body;
    await db.query('DELETE FROM list_elements WHERE project_id = $1 AND element = $2', [projectId, name]);
    await db.query('DELETE FROM the_elements WHERE name = $1 AND project_id = $2',     [name, projectId]);
    res.redirect(`/templates?projectId=${projectId}`);
  } catch (err) { next(err); }
});

module.exports = router;
