-- ============================================================
-- Site Map Generator — schema PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  font_general VARCHAR(100) NOT NULL DEFAULT 'Arial, Helvetica, sans-serif',
  size_general INT          NOT NULL DEFAULT 11
);

CREATE TABLE IF NOT EXISTS the_templates (
  name               VARCHAR(50) NOT NULL,
  project_id         INT         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description        VARCHAR(255) NOT NULL DEFAULT '',
  detail_description TEXT         NOT NULL DEFAULT '',
  has_file           BOOLEAN      NOT NULL DEFAULT false,
  color              CHAR(6)      NOT NULL DEFAULT 'CCCCCC',
  text_color         CHAR(6)      NOT NULL DEFAULT '000000',
  PRIMARY KEY (name, project_id)
);

CREATE TABLE IF NOT EXISTS the_elements (
  name               VARCHAR(50) NOT NULL,
  project_id         INT         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description        VARCHAR(255) NOT NULL DEFAULT '',
  detail_description TEXT         NOT NULL DEFAULT '',
  has_file           BOOLEAN      NOT NULL DEFAULT false,
  color              CHAR(6)      NOT NULL DEFAULT 'CCCCCC',
  text_color         CHAR(6)      NOT NULL DEFAULT '000000',
  PRIMARY KEY (name, project_id)
);

-- id è una stringa gerarchica tipo "0", "0_0", "0_1_2"
CREATE TABLE IF NOT EXISTS the_site_map (
  id             VARCHAR(100) NOT NULL,
  project_id     INT          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label          VARCHAR(255) NOT NULL DEFAULT '[...]',
  locked         BOOLEAN      NOT NULL DEFAULT false,
  content_matrix VARCHAR(255) NOT NULL DEFAULT '',
  template       VARCHAR(50)  NOT NULL DEFAULT 'def',
  description    TEXT         NOT NULL DEFAULT '',
  version        VARCHAR(50)  NOT NULL DEFAULT '',
  PRIMARY KEY (id, project_id)
);

CREATE TABLE IF NOT EXISTS list_elements (
  project_id INT          NOT NULL,
  page_id    VARCHAR(100) NOT NULL,
  element    VARCHAR(50)  NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, page_id, element),
  FOREIGN KEY (page_id, project_id) REFERENCES the_site_map(id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  project_id INT          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name  VARCHAR(100) NOT NULL DEFAULT ''
);

-- ============================================================
-- Seed: progetto demo
-- ============================================================

INSERT INTO projects (id, name, font_general, size_general)
VALUES (1, 'Demo Project', 'Arial, Helvetica, sans-serif', 11)
ON CONFLICT DO NOTHING;

-- Reset sequence se il seed usa id fisso
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

INSERT INTO the_templates (name, project_id, description, detail_description, color, text_color) VALUES
  ('def', 1, 'Default',          '',               'CCCCCC', '000000'),
  ('T01', 1, 'Homepage',         'Template home',  '4A90D9', 'FFFFFF'),
  ('T02', 1, 'Sezione',          'Landing sezione','7ED321', '000000'),
  ('T03', 1, 'Contenuto',        'Pagina interna', 'F5A623', '000000'),
  ('T04', 1, 'Form',             'Pagina con form','D0021B', 'FFFFFF')
ON CONFLICT DO NOTHING;

INSERT INTO the_elements (name, project_id, description, detail_description, color, text_color) VALUES
  ('E01', 1, 'Header',      'Intestazione globale', 'BD10E0', 'FFFFFF'),
  ('E02', 1, 'Nav menu',    'Menu principale',      '9013FE', 'FFFFFF'),
  ('E03', 1, 'Footer',      'Piede di pagina',      '417505', 'FFFFFF'),
  ('E04', 1, 'Search',      'Box di ricerca',       '8B572A', 'FFFFFF'),
  ('E05', 1, 'Breadcrumb',  'Percorso navigazione', '4A4A4A', 'FFFFFF'),
  ('E06', 1, 'Sidebar',     'Colonna laterale',     '0070C0', 'FFFFFF')
ON CONFLICT DO NOTHING;

INSERT INTO the_site_map (id, project_id, label, template, version) VALUES
  ('0',     1, 'Home',         'T01', '1.0'),
  ('0_0',   1, 'Chi siamo',    'T02', '1.0'),
  ('0_0_0', 1, 'Il team',      'T03', '1.0'),
  ('0_0_1', 1, 'La storia',    'T03', '1.0'),
  ('0_1',   1, 'Servizi',      'T02', '1.0'),
  ('0_1_0', 1, 'Servizio A',   'T03', '1.0'),
  ('0_1_1', 1, 'Servizio B',   'T03', '1.0'),
  ('0_2',   1, 'Contatti',     'T04', '1.0'),
  ('0_3',   1, 'News',         'T02', '1.0'),
  ('0_3_0', 1, 'Articolo',     'T03', '1.0')
ON CONFLICT DO NOTHING;

INSERT INTO list_elements (project_id, page_id, element, sort_order) VALUES
  (1, '0',     'E01', 0), (1, '0',     'E02', 1), (1, '0',     'E03', 2),
  (1, '0_0',   'E01', 0), (1, '0_0',   'E02', 1), (1, '0_0',   'E05', 2),
  (1, '0_1',   'E01', 0), (1, '0_1',   'E02', 1), (1, '0_1',   'E06', 2),
  (1, '0_2',   'E01', 0), (1, '0_2',   'E04', 1)
ON CONFLICT DO NOTHING;

INSERT INTO users (project_id, first_name, last_name)
VALUES (1, 'Admin', 'User')
ON CONFLICT DO NOTHING;
