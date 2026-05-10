const fs   = require('fs');
const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/',          require('./routes/index'));
app.use('/sitemap',   require('./routes/sitemap'));
app.use('/report',    require('./routes/report'));
app.use('/templates', require('./routes/templates'));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).send(`<pre style="font-family:monospace;padding:24px">Errore: ${err.message}</pre>`);
});

async function runMigrations() {
  const { rows } = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'projects'
    )
  `);
  if (!rows[0].exists) {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_initial.sql'), 'utf8');
    await db.query(sql);
    console.log('Database inizializzato.');
  }

  const { rows: r2 } = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'page_attachments'
    )
  `);
  if (!r2[0].exists) {
    await db.query(`
      CREATE TABLE page_attachments (
        id         SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        page_id    VARCHAR(100) NOT NULL,
        filename   VARCHAR(255) NOT NULL,
        mimetype   VARCHAR(100) NOT NULL,
        size       INTEGER NOT NULL,
        data       BYTEA NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Tabella page_attachments creata.');
  }
}

const PORT = process.env.PORT || 3000;
runMigrations()
  .then(() => app.listen(PORT, () => console.log(`Server avviato su porta ${PORT}`)))
  .catch(err => { console.error('Errore avvio:', err); process.exit(1); });
