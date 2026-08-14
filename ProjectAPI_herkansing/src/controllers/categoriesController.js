import { pool } from '../db.js';


function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color
  };
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function validate(body, { partial = false } = {}) {
  const errors = {};
  const { name, icon, color } = body;

  if (!partial || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.name = 'Naam is verplicht';
    } else if (name.trim().length > 60) {
      errors.name = 'Naam mag maximaal 60 tekens bevatten';
    }
  }

  if (icon !== undefined && icon !== null && String(icon).length > 40) {
    errors.icon = 'Icoon mag maximaal 40 tekens bevatten';
  }

  if (color !== undefined && color !== null && !HEX_COLOR.test(color)) {
    errors.color = "Kleur moet een hexcode van 6 tekens zijn, bv. '#EF4444'";
  }

  return errors;
}

/* GET /api/categories */
export async function listCategories(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, icon, color FROM categories ORDER BY name`
    );
    res.json(rows.map(mapCategory));
  } catch (err) {
    next(err);
  }
}

/* POST /api/categories   (alleen admin) */
export async function createCategory(req, res, next) {
  const errors = validate(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  const { name, icon = null, color = '#71717A' } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO categories (name, icon, color)
       VALUES ($1, $2, $3)
       RETURNING id, name, icon, color`,
      [name.trim(), icon, color]
    );
    res.status(201).json(mapCategory(rows[0]));
  } catch (err) {
    // 23505 = unique violation: categories.name is UNIQUE.
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Er bestaat al een categorie met die naam' });
    }
    next(err);
  }
}

/* PUT /api/categories/:id   (alleen admin) */
export async function updateCategory(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  const errors = validate(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  const { name, icon = null, color = '#71717A' } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE categories SET name = $1, icon = $2, color = $3
       WHERE id = $4
       RETURNING id, name, icon, color`,
      [name.trim(), icon, color, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Categorie niet gevonden' });
    }

    res.json(mapCategory(rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Er bestaat al een categorie met die naam' });
    }
    next(err);
  }
}

/* DELETE /api/categories/:id   (alleen admin) */
export async function deleteCategory(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  try {
    const { rowCount } = await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Categorie niet gevonden' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
