import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { signToken } from '../middleware/token.js';

function validateRegister(body) {
  const errors = {};
  const { name, email, password } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Naam is verplicht';
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.email = 'Geldig e-mailadres is verplicht';
  }

  if (!password || String(password).length < 8) {
    errors.password = 'Wachtwoord moet minstens 8 tekens bevatten';
  }

  return errors;
}

export async function register(req, res, next) {
  const errors = validateRegister(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  const { name, email, password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    // role staat hier bewust NIET bij: iedereen krijgt de default 'user'
    // uit de database. Zou je hem uit de body overnemen, dan registreert
    // de eerste de beste zich als beheerder.
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), hash]
    );

    const user = rows[0];
    res.status(201).json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Dat e-mailadres is al geregistreerd' });
    }
    next(err);
  }
}

/* POST /api/auth/login   (publiek) */
export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email ) {
    return res.status(400).json({ message: 'E-mailadres is verplicht' });
  }

  if ( !password) {
    return res.status(400).json({ message: 'wachtwoord is verplicht' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, password_hash FROM users WHERE email = $1`,
      [String(email).trim().toLowerCase()]
    );

    const ongeldig = () => res.status(401).json({ message: 'Onjuist e-mailadres of wachtwoord' });

    if (rows.length === 0) return ongeldig();

    const user = rows[0];
    const klopt = await bcrypt.compare(String(password), user.password_hash);
    if (!klopt) return ongeldig();

    res.json({
      token: signToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
}

/* GET /api/auth/me   (ingelogd) */
export async function me(req, res, next) {
  try {
    const [userResult, householdResult] = await Promise.all([
      pool.query(`SELECT id, name, email, role FROM users WHERE id = $1`, [req.user.id]),
      pool.query(
        `SELECT h.id, h.name, m.role
           FROM households h
           JOIN memberships m ON m.household_id = h.id
          WHERE m.user_id = $1
          ORDER BY h.name`,
        [req.user.id]
      )
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Gebruiker niet gevonden' });
    }

    const user = userResult.rows[0];

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      households: householdResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role
      }))
    });
  } catch (err) {
    next(err);
  }
}
