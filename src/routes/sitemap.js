const express = require('express');
const router  = express.Router();
const db      = require('../db');

// ── helpers ────────────────────────────────────────────────

function buildTree(pages) {
  const map = {};
  for (const p of pages) map[p.id] = { ...p, children: [] };

  const roots = [];
  for (const p of pages) {
    const parts    = p.id.split('_');
    const parentId = parts.slice(0, -1).join('_');
    if (parts.length === 1 || !map[parentId]) {
      roots.push(map[p.id]);
    } else {
      map[parentId].children.push(map[p.id]);
    }
  }
  return roots;
}

function nextChildId(parentId, existingIds) {
  let i = 0;
  while (existingIds.has(`${parentId}_${i}`)) i++;
  return `${parentId}_${i}`;
}

async function getContext(projectId) {
  const { rows: [project] } = await db.query(
    'SELECT * FROM projects WHERE id = $1', [projectId]
  );
  if (!project) throw Object.assign(new Error('Progetto non trovato'), { status: 404 });

  const { rows: [user] } = await db.query(
    'SELECT * FROM users WHERE project_id = $1 LIMIT 1', [projectId]
  );

  const { rows: templates } = await db.query(`
    SELECT t.*, COALESCE(u.cnt, 0)::int AS usage_count
    FROM the_templates t
    LEFT JOIN (
      SELECT template, project_id, COUNT(*)::int AS cnt
      FROM the_site_map GROUP BY template, project_id
    ) u ON u.template = t.name AND u.project_id = t.project_id
    WHERE t.project_id = $1 ORDER BY t.name
  `, [projectId]);

  const { rows: elements } = await db.query(`
    SELECT e.*, COALESCE(u.cnt, 0)::int AS usage_count
    FROM the_elements e
    LEFT JOIN (
      SELECT element, project_id, COUNT(*)::int AS cnt
      FROM list_elements GROUP BY element, project_id
    ) u ON u.element = e.name AND u.project_id = e.project_id
    WHERE e.project_id = $1 ORDER BY e.name
  `, [projectId]);

  return { project, user: user || { first_name: '', last_name: '' }, templates, elements };
}

// ── GET / — vista principale ───────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.redirect('/');

    const { project, user, templates, elements } = await getContext(projectId);

    const { rows: siteMapRaw } = await db.query(`
      SELECT sm.*, t.has_file AS template_has_file
      FROM the_site_map sm
      LEFT JOIN the_templates t
        ON sm.template = t.name AND sm.project_id = t.project_id
      WHERE sm.project_id = $1
      ORDER BY sm.id
    `, [projectId]);

    const existingIds = new Set(siteMapRaw.map(p => p.id));

    // Attacca elementi e nextChildId ad ogni pagina
    const siteMap = await Promise.all(siteMapRaw.map(async page => {
      const { rows: elems } = await db.query(
        'SELECT element FROM list_elements WHERE project_id = $1 AND page_id = $2 ORDER BY sort_order',
        [projectId, page.id]
      );
      return {
        ...page,
        elements:   elems.map(e => e.element),
        newChildId: nextChildId(page.id, existingIds),
      };
    }));

    const tree = buildTree(siteMap);

    // Mappa colori: { nomeCss: { bg, fg } }
    const colorMap = {};
    for (const t of templates) colorMap[t.name] = { bg: t.color, fg: t.text_color };
    for (const e of elements)  colorMap[e.name] = { bg: e.color, fg: e.text_color };

    res.render('sitemap', { project, user, siteMap, tree, templates, elements, colorMap });
  } catch (err) { next(err); }
});

// ── POST /add ──────────────────────────────────────────────

router.post('/add', async (req, res, next) => {
  try {
    const { projectId, pageId } = req.body;
    const { rows } = await db.query(
      'SELECT 1 FROM the_site_map WHERE project_id = $1 AND id = $2',
      [projectId, pageId]
    );
    if (rows.length === 0) {
      await db.query(
        "INSERT INTO the_site_map (project_id, id, label, template) VALUES ($1, $2, '[...]', 'def')",
        [projectId, pageId]
      );
    }
    res.redirect(`/sitemap?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── POST /delete ───────────────────────────────────────────

router.post('/delete', async (req, res, next) => {
  try {
    const { projectId, pageId } = req.body;
    await db.query('DELETE FROM list_elements WHERE project_id = $1 AND page_id = $2', [projectId, pageId]);
    await db.query('DELETE FROM the_site_map WHERE project_id = $1 AND id = $2',       [projectId, pageId]);
    res.redirect(`/sitemap?projectId=${projectId}`);
  } catch (err) { next(err); }
});

// ── GET /edit ──────────────────────────────────────────────

router.get('/edit', async (req, res, next) => {
  try {
    const { projectId, pageId } = req.query;
    const { project, templates, elements } = await getContext(projectId);

    const { rows: [page] } = await db.query(
      'SELECT * FROM the_site_map WHERE project_id = $1 AND id = $2',
      [projectId, pageId]
    );
    const { rows: pageElems } = await db.query(
      'SELECT element FROM list_elements WHERE project_id = $1 AND page_id = $2 ORDER BY sort_order',
      [projectId, pageId]
    );

    res.render('edit-page', {
      project, templates, elements, page,
      pageElements: pageElems.map(e => e.element),
    });
  } catch (err) { next(err); }
});

// ── POST /edit ─────────────────────────────────────────────

router.post('/edit', async (req, res, next) => {
  try {
    const { projectId, pageId, label, locked, template, version, description, contentMatrix } = req.body;

    await db.query(`
      UPDATE the_site_map
      SET label = $1, locked = $2, template = $3, version = $4, description = $5, content_matrix = $6
      WHERE project_id = $7 AND id = $8
    `, [
      label || '[...]',
      locked === 'on',
      template || 'def',
      version        || '',
      description    || '',
      contentMatrix  || '',
      projectId,
      pageId,
    ]);

    // Sostituisci gli elementi
    await db.query('DELETE FROM list_elements WHERE project_id = $1 AND page_id = $2', [projectId, pageId]);
    const elemList = [].concat(req.body.elements || []).filter(Boolean);
    for (let i = 0; i < elemList.length; i++) {
      await db.query(
        'INSERT INTO list_elements (project_id, page_id, element, sort_order) VALUES ($1, $2, $3, $4)',
        [projectId, pageId, elemList[i], i]
      );
    }

    res.redirect(`/sitemap?projectId=${projectId}`);
  } catch (err) { next(err); }
});

module.exports = router;
