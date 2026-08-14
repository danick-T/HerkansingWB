import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

/*
  Twee lagen van rollen, die los van elkaar staan:

    req.user.role         'admin' | 'user'     - globaal, geldt overal
    req.membership.role   'owner' | 'member'   - binnen één specifieke groep
*/

/* Controleert het JWT en zet req.user. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Geen token meegegeven' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // De globale rol zit mee in het token (zie middleware/token.js), zodat
    // requireAdmin geen extra databasequery nodig heeft.
    req.user = { id: payload.sub, role: payload.role || 'user' };
    next();
  } catch {
    return res.status(401).json({ message: 'Ongeldig of vervallen token' });
  }
}

/* enkel voor administrators: req.user.role moet 'admin' zijn. */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Alleen een beheerder mag dit' });
  }
  next();
}

/**
 * Controleert of de ingelogde gebruiker lid is van :householdId.
 */
export async function requireMembership(req, res, next) {
  const householdId = Number(req.params.householdId);

  if (!Number.isInteger(householdId) || householdId < 1) {
    return res.status(400).json({ message: 'Ongeldig household-id' });
  }

  try {
    // Een beheerder mag elke groep bekijken zonder er lid van te zijn.
    // We controleren wel of de groep bestaat.
    if (req.user.role === 'admin') {
      const { rowCount } = await pool.query(
        `SELECT 1 FROM households WHERE id = $1`,
        [householdId]
      );

      if (rowCount === 0) {
        return res.status(404).json({ message: 'Groep niet gevonden' });
      }

      req.membership = { householdId, role: 'owner', viaAdmin: true };
      return next();
    }

    const { rows } = await pool.query(
      `SELECT role FROM memberships WHERE user_id = $1 AND household_id = $2`,
      [req.user.id, householdId]
    );

    if (rows.length === 0) {
      // 403 en niet 404: de gebruiker is wel ingelogd, maar mag hier niet bij.
      return res.status(403).json({ message: 'Je bent geen lid van deze groep' });
    }

    req.membership = { householdId, role: rows[0].role, viaAdmin: false };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireOwner(req, res, next) {
  if (req.membership?.role !== 'owner') {
    return res.status(403).json({ message: 'Alleen de eigenaar van de groep mag dit' });
  }
  next();
}
