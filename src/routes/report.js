const express = require('express');
const router  = express.Router();
const db      = require('../db');

router.get('/', async (req, res, next) => {
  try {
    const { projectId, table } = req.query;
    if (!projectId) return res.redirect('/');

    const { rows: [project] } = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const { rows: templates  } = await db.query('SELECT * FROM the_templates WHERE project_id = $1 ORDER BY name', [projectId]);
    const { rows: elements   } = await db.query('SELECT * FROM the_elements  WHERE project_id = $1 ORDER BY name', [projectId]);

    let reportData = null;

    if (table === 'MTr') {
      const { rows } = await db.query(`
        SELECT t.*, COALESCE(u.cnt, 0)::int AS usage_count
        FROM the_templates t
        LEFT JOIN (
          SELECT template, project_id, COUNT(*)::int AS cnt
          FROM the_site_map GROUP BY template, project_id
        ) u ON u.template = t.name AND u.project_id = t.project_id
        WHERE t.project_id = $1 ORDER BY t.name
      `, [projectId]);
      reportData = { type: 'MTr', title: 'Master Templates', rows };
    }

    if (table === 'ELr') {
      const { rows } = await db.query(`
        SELECT e.*, COALESCE(u.cnt, 0)::int AS usage_count
        FROM the_elements e
        LEFT JOIN (
          SELECT element, project_id, COUNT(*)::int AS cnt
          FROM list_elements GROUP BY element, project_id
        ) u ON u.element = e.name AND u.project_id = e.project_id
        WHERE e.project_id = $1 ORDER BY e.name
      `, [projectId]);
      reportData = { type: 'ELr', title: 'Elementi', rows };
    }

    if (table === 'SMr') {
      const { rows: smRows } = await db.query(`
        SELECT sm.*, t.description AS template_description
        FROM the_site_map sm
        LEFT JOIN the_templates t ON sm.template = t.name AND sm.project_id = t.project_id
        WHERE sm.project_id = $1
        ORDER BY sm.id
      `, [projectId]);

      // Aggiungi elementi per ogni pagina
      const rows = await Promise.all(smRows.map(async page => {
        const { rows: elems } = await db.query(`
          SELECT le.element, e.description
          FROM list_elements le
          JOIN the_elements e ON le.element = e.name AND le.project_id = e.project_id
          WHERE le.project_id = $1 AND le.page_id = $2
          ORDER BY le.sort_order
        `, [projectId, page.id]);
        return { ...page, elements: elems };
      }));

      reportData = { type: 'SMr', title: 'Site Map', rows };
    }

    const colorMap = {};
    for (const t of templates) colorMap[t.name] = { bg: t.color, fg: t.text_color };
    for (const e of elements)  colorMap[e.name] = { bg: e.color, fg: e.text_color };

    res.render('report', { project, templates, elements, reportData, colorMap, currentTable: table || '' });
  } catch (err) { next(err); }
});

module.exports = router;
