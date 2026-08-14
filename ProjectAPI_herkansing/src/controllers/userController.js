import bcrypt from 'bcrypt';
import { pool } from '../db.js';

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
}


function magBij(req, userId) {
  return req.user.role === 'admin' || req.user.id === userId;
}

/* GET /api/users   (alleen admin) */
export async function listUsers(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, created_at FROM users ORDER BY name`
    );
    res.json(rows.map(mapUser));
  } catch (err) {
    next(err);
  }
}

/* GET /api/users/:userId */
export async function getUser(req, res, next) {
  const id = Number(req.params.userId);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  if (!magBij(req, id)) {
    return res.status(403).json({ message: 'Je mag dit profiel niet bekijken' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Gebruiker niet gevonden' });
    }

    res.json(mapUser(rows[0]));
  } catch (err) {
    next(err);
  }
}

/* PUT /api/users/:userId */
export async function updateUser(req, res, next) {
  const id = Number(req.params.userId);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  if (!magBij(req, id)) {
    return res.status(403).json({ message: 'Je mag dit profiel niet wijzigen' });
  }

  const { name, email, password, role } = req.body;
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Naam is verplicht';
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.email = 'Geldig e-mailadres is verplicht';
  }

  if (password !== undefined && String(password).length < 8) {
    errors.password = 'Wachtwoord moet minstens 8 tekens bevatten';
  }

  if (role !== undefined && role !== 'admin' && role !== 'user') {
    errors.role = "Rol moet 'admin' of 'user' zijn";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  // De rol mag ALLEEN door een beheerder gezet worden.
  const nieuweRol = req.user.role === 'admin' && role !== undefined ? role : null;

  try {
    const hash = password ? await bcrypt.hash(password, 10) : null;

    const { rows } = await pool.query(
      `UPDATE users SET
         name          = $1,
         email         = $2,
         password_hash = COALESCE($3, password_hash),
         role          = COALESCE($4, role)
       WHERE id = $5
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash, nieuweRol, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Gebruiker niet gevonden' });
    }

    res.json(mapUser(rows[0]));
  } catch (err) {
    // 23505 = unique violation op users.email
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Dat e-mailadres is al in gebruik' });
    }
    next(err);
  }
}

/* DELETE /api/users/:userId   (alleen admin) */
export async function deleteUser(req, res, next) {
  const id = Number(req.params.userId);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  try {
    const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [id]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Gebruiker niet gevonden' });
    }


    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
