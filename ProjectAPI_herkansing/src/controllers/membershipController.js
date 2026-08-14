import { pool } from '../db.js';


function mapMembership(row) {
  return {
    id: row.id,
    role: row.role,
    joinedAt: row.joined_at,
    user: { id: row.user_id, name: row.name, email: row.email }
  };
}

const SELECT_MEMBERSHIP = `
  SELECT m.id, m.role, m.joined_at,
         u.id AS user_id, u.name, u.email
    FROM memberships m
    JOIN users u ON u.id = m.user_id
`;

/** Telt hoeveel eigenaars de groep heeft. */
async function countOwners(householdId, client = pool) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS aantal
       FROM memberships
      WHERE household_id = $1 AND role = 'owner'`,
    [householdId]
  );
  return rows[0].aantal;
}

/* GET /api/households/:householdId/memberships */
export async function listMemberships(req, res, next) {
  const { householdId } = req.membership;

  try {
    const { rows } = await pool.query(
      `${SELECT_MEMBERSHIP} WHERE m.household_id = $1 ORDER BY m.joined_at`,
      [householdId]
    );
    res.json(rows.map(mapMembership));
  } catch (err) {
    next(err);
  }
}

/* GET /api/households/:householdId/memberships/:membershipId */
export async function getMembership(req, res, next) {
  const { householdId } = req.membership;
  const id = Number(req.params.membershipId);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  try {
    const { rows } = await pool.query(
      `${SELECT_MEMBERSHIP} WHERE m.id = $1 AND m.household_id = $2`,
      [id, householdId]
    );

    if (rows.length === 0) {
      // household_id staat mee in de WHERE: een lidmaatschap van een andere
      // groep bestaat voor deze gebruiker simpelweg niet.
      return res.status(404).json({ message: 'Lidmaatschap niet gevonden' });
    }

    res.json(mapMembership(rows[0]));
  } catch (err) {
    next(err);
  }
}

/* POST /api/households/:householdId/memberships   (alleen owner) */
export async function createMembership(req, res, next) {
  const { householdId } = req.membership;
  const { email, role = 'member' } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'E-mailadres is verplicht' });
  }

  if (role !== 'owner' && role !== 'member') {
    return res.status(400).json({ message: "Rol moet 'owner' of 'member' zijn" });
  }

  try {
    const user = await pool.query(`SELECT id FROM users WHERE email = $1`, [
      email.trim().toLowerCase()
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Geen gebruiker met dat e-mailadres' });
    }

    const insert = await pool.query(
      `INSERT INTO memberships (user_id, household_id, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [user.rows[0].id, householdId, role]
    );

    const { rows } = await pool.query(`${SELECT_MEMBERSHIP} WHERE m.id = $1`, [
      insert.rows[0].id
    ]);

    res.status(201).json(mapMembership(rows[0]));
  } catch (err) {
    // 23505 = unique (user_id, household_id)
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Deze gebruiker zit al in de groep' });
    }
    next(err);
  }
}

/* PUT /api/households/:householdId/memberships/:membershipId   (alleen owner) */
export async function updateMembership(req, res, next) {
  const { householdId } = req.membership;
  const id = Number(req.params.membershipId);
  const { role } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  if (role !== 'owner' && role !== 'member') {
    return res.status(400).json({ message: "Rol moet 'owner' of 'member' zijn" });
  }

  try {
    const bestaand = await pool.query(
      `SELECT role FROM memberships WHERE id = $1 AND household_id = $2`,
      [id, householdId]
    );

    if (bestaand.rows.length === 0) {
      return res.status(404).json({ message: 'Lidmaatschap niet gevonden' });
    }

    // Degradeer je de laatste eigenaar, dan blijft de groep stuurloos achter.
    if (bestaand.rows[0].role === 'owner' && role === 'member') {
      if ((await countOwners(householdId)) === 1) {
        return res.status(400).json({
          message: 'Maak eerst iemand anders eigenaar: een groep heeft minstens één eigenaar nodig'
        });
      }
    }

    await pool.query(`UPDATE memberships SET role = $1 WHERE id = $2`, [role, id]);

    const { rows } = await pool.query(`${SELECT_MEMBERSHIP} WHERE m.id = $1`, [id]);
    res.json(mapMembership(rows[0]));
  } catch (err) {
    next(err);
  }
}

/* DELETE /api/households/:householdId/memberships/:membershipId */
export async function deleteMembership(req, res, next) {
  const { householdId, role: mijnRol } = req.membership;
  const id = Number(req.params.membershipId);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  try {
    const bestaand = await pool.query(
      `SELECT role, user_id FROM memberships WHERE id = $1 AND household_id = $2`,
      [id, householdId]
    );

    if (bestaand.rows.length === 0) {
      return res.status(404).json({ message: 'Lidmaatschap niet gevonden' });
    }

    const doelwit = bestaand.rows[0];
    const isMijzelf = doelwit.user_id === req.user.id;

    if (!isMijzelf && mijnRol !== 'owner') {
      return res.status(403).json({
        message: 'Alleen de eigenaar kan iemand anders uit de groep verwijderen'
      });
    }

    if (doelwit.role === 'owner' && (await countOwners(householdId)) === 1) {
      return res.status(400).json({
        message: isMijzelf
          ? 'Maak eerst iemand anders eigenaar voor je de groep verlaat'
          : 'Een groep heeft minstens één eigenaar nodig'
      });
    }

    await pool.query(`DELETE FROM memberships WHERE id = $1`, [id]);

    // De transacties van deze persoon blijven staan: de boekhouding van de
    // groep mag niet verdwijnen omdat iemand vertrekt.
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
