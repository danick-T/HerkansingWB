import crypto from 'node:crypto';
import { pool } from '../db.js';

/* Zes tekens, hoofdletters. 16 miljoen combinaties, botsingen zijn zeldzaam. */
function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function validateName(body) {
  const { name } = body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { name: 'Naam is verplicht' };
  }
  if (name.trim().length > 100) {
    return { name: 'Naam mag maximaal 100 tekens bevatten' };
  }
  return {};
}

/* GET /api/households  - de groepen waar ik lid van ben */
export async function listHouseholds(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT h.id,
              h.name,
              h.invite_code,
              m.role,
              (SELECT count(*)::int
                 FROM memberships m2
                WHERE m2.household_id = h.id) AS member_count
         FROM households h
         JOIN memberships m ON m.household_id = h.id
        WHERE m.user_id = $1
        ORDER BY h.name`,
      [req.user.id]
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        memberCount: row.member_count,
        // enkel zichtbaar voor owner 
        inviteCode: row.role === 'owner' ? row.invite_code : undefined
      }))
    );
  } catch (err) {
    next(err);
  }
}

/* GET /api/households/:householdId */
export async function getHousehold(req, res, next) {
  const { householdId, role } = req.membership;

  try {
    const { rows } = await pool.query(
      `SELECT h.id,
              h.name,
              h.invite_code,
              h.created_at,
              (SELECT count(*)::int
                 FROM memberships m
                WHERE m.household_id = h.id) AS member_count
         FROM households h
        WHERE h.id = $1`,
      [householdId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Groep niet gevonden' });
    }

    const row = rows[0];
    res.json({
      id: row.id,
      name: row.name,
      memberCount: row.member_count,
      createdAt: row.created_at,
      role,
      inviteCode: role === 'owner' ? row.invite_code : undefined
    });
  } catch (err) {
    next(err);
  }
}

/* POST /api/households */
export async function createHousehold(req, res, next) {
  const errors = validateName(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  const name = req.body.name.trim();

  // Eén client, want alles moet in dezelfde databasetransactie gebeuren.
  // Loopt het halverwege mis, dan zit je anders met een groep zonder leden
  // waar niemand nog bij kan.
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let household = null;

    // Kleine kans op een dubbele code: gewoon opnieuw proberen.
    for (let poging = 0; poging < 5 && household === null; poging++) {
      try {
        const { rows } = await client.query(
          `INSERT INTO households (name, invite_code, created_by)
           VALUES ($1, $2, $3)
           RETURNING id, name, invite_code`,
          [name, generateInviteCode(), req.user.id]
        );
        household = rows[0];
      } catch (err) {
        if (err.code !== '23505') throw err;
        // 23505 op invite_code: volgende poging.
        await client.query('ROLLBACK');
        await client.query('BEGIN');
      }
    }

    if (household === null) {
      throw new Error('Kon geen unieke uitnodigingscode genereren');
    }

    await client.query(
      `INSERT INTO memberships (user_id, household_id, role)
       VALUES ($1, $2, 'owner')`,
      [req.user.id, household.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      id: household.id,
      name: household.name,
      inviteCode: household.invite_code,
      role: 'owner',
      memberCount: 1
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    // Zonder release lekt de verbinding en loopt je pool na een tijd vol.
    client.release();
  }
}

/* POST /api/households/join */
export async function joinHousehold(req, res, next) {
  const raw = req.body.inviteCode;

  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ message: 'Uitnodigingscode is verplicht' });
  }

  // Normaliseren: anders mislukt het joinen omdat iemand kleine letters typte.
  const code = raw.trim().toUpperCase();

  try {
    const { rows } = await pool.query(
      `SELECT id, name FROM households WHERE invite_code = $1`,
      [code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ongeldige uitnodigingscode' });
    }

    const household = rows[0];

    await pool.query(
      `INSERT INTO memberships (user_id, household_id, role)
       VALUES ($1, $2, 'member')`,
      [req.user.id, household.id]
    );

    res.status(201).json({ id: household.id, name: household.name, role: 'member' });
  } catch (err) {
    // 23505 = unique (user_id, household_id): je zit er al in.
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Je bent al lid van deze groep' });
    }
    next(err);
  }
}

/* PUT /api/households/:householdId   (alleen owner) */
export async function updateHousehold(req, res, next) {
  const { householdId } = req.membership;

  const errors = validateName(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE households SET name = $1 WHERE id = $2 RETURNING id, name`,
      [req.body.name.trim(), householdId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Groep niet gevonden' });
    }

    res.json({ id: rows[0].id, name: rows[0].name });
  } catch (err) {
    next(err);
  }
}

/* DELETE /api/households/:householdId   (alleen owner) */
export async function deleteHousehold(req, res, next) {
  const { householdId } = req.membership;

  try {
    const { rowCount } = await pool.query(`DELETE FROM households WHERE id = $1`, [householdId]);

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Groep niet gevonden' });
    }

    // ON DELETE CASCADE ruimt de memberships en transacties mee op:
    // die hebben buiten deze groep geen betekenis.
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
