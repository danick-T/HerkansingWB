import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

/**
 * Controleert het JWT en zet req.user.
 * Zet dit op elke route behalve /auth/register en /auth/login.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Geen token meegegeven' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ message: 'Ongeldig of vervallen token' });
  }
}

/**
 * Controleert of de ingelogde gebruiker lid is van :householdId.
 *
 * Dit is het hart van de autorisatie: omdat een gebruiker in meerdere
 * groepen kan zitten, moet bij elke request bewezen worden dat hij bij
 * deze groep hoort. Staat dit hier, dan hoeft geen enkele controller
 * er nog aan te denken.
 */
export async function requireMembership(req, res, next) {
  const householdId = Number(req.params.householdId);

  if (!Number.isInteger(householdId) || householdId < 1) {
    return res.status(400).json({ message: 'Ongeldig household-id' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT role FROM memberships WHERE user_id = $1 AND household_id = $2`,
      [req.user.id, householdId]
    );

    if (rows.length === 0) {
      // 403 en niet 404: de gebruiker is wel ingelogd, maar mag hier niet bij.
      return res.status(403).json({ message: 'Je bent geen lid van deze groep' });
    }

    req.membership = { householdId, role: rows[0].role };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Enkel voor beheeracties (uitnodigingscode vernieuwen, leden verwijderen, ...).
 * Draait altijd na requireMembership.
 */
export function requireOwner(req, res, next) {
  if (req.membership?.role !== 'owner') {
    return res.status(403).json({ message: 'Alleen de eigenaar van de groep mag dit' });
  }
  next();
}