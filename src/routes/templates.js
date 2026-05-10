const express = require('express');
const router  = express.Router();
const db      = require('../db');
const multer  = require('multer');
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── GET / — lista template e elementi ─────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.redirect('/');

    const { rows: [project] } = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const { rows: templates } = await db.query(`
      SELECT t.*, i.id AS image_id
      FROM the_templates t
      LEFT JOIN item_images i
        ON i.project_id = t.project_id AND i.item_type = 'template' AND i.item_name = t.name
      WHERE t.project_id = $1 ORDER BY t.name
    `, [projectId]);
    const { rows: elements } = await db.query(`
      SELECT e.*, i.id AS image_id
      FROM the_elements e
      LEFT JOIN item_images i
        ON i.project_id = e.project_id AND i.item_type = 'element' AND i.item_name = e.name
      WHERE e.project_id = $1 ORDER BY e.name
    `, [projectId]);

    const colorMap = {};
    for (const t of templates) colorMap[t.name] = { bg: t.color, fg: t.text_color };
    for (const e of elements)  colorMap[e.name] = { bg: e.color, fg: e.text_color };

    res.render('edit-templates', { project, templates, elements, colorMap, msg: req.query.msg || '' });
  } catch (err) { next(err); }
});

// ── GET /image/:id ────────────────────────────────────────

router.get('/image/:id', async (req, res, next) => {
  try {
    const { rows: [img] } = await db.query(
      'SELECT filename, mimetype, data FROM item_images WHERE id = $1',
      [req.params.id]
    );
    if (!img) return res.status(404).send('Non trovata');
    res.setHeader('Content-Type', img.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(img.data);
  } catch (err) { next(err); }
});

// ── POST /image/upload ────────────────────────────────────

router.post('/image/upload', upload.single('image'), async (req, res, next) => {
  try {
    const { projectId, itemType, itemName } = req.body;
    const file = req.file;
    if (!file) return res.redirect(`/templates?projectId=${projectId}`);
    await db.query(`
      INSERT INTO item_images (project_id, item_type, item_name, filename, mimetype, data)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (project_id, item_type, item_name)
      DO UPDATE SET filename=$4, mimetype=$5, data=$6
    `, [projectId, itemType, itemName, file.originalname, file.mimetype, file.buffer]);
    res.redirect(`/templates?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── POST /image/delete ────────────────────────────────────

router.post('/image/delete', async (req, res, next) => {
  try {
    const { projectId, itemType, itemName } = req.body;
    await db.query(
      'DELETE FROM item_images WHERE project_id=$1 AND item_type=$2 AND item_name=$3',
      [projectId, itemType, itemName]
    );
    res.redirect(`/templates?projectId=${projectId}`);
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
