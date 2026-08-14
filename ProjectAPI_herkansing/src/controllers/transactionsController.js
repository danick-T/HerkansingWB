import { pool } from '../db.js';

/**
 * snake_case → camelCase
 * Platte rij → geneste objecten
 * De bon selectief meesturen
 */
function mapRow(row, { includeReceipt = false } = {}) {
  const result = {
    id: row.id,
    type: row.type,
    amount: row.amount,              
    description: row.description,
    date: row.date,
    hasReceipt: row.has_receipt,
    category: row.category_id
      ? {
          id: row.category_id,
          name: row.category_name,
          color: row.category_color,
          icon: row.category_icon
        }
      : null,
    user: row.user_id ? { id: row.user_id, name: row.user_name } : null
  };

  if (includeReceipt) result.receiptImage = row.receipt_image;
  return result;
}

/** De kolommen die elke query nodig heeft. */
const SELECT_COLUMNS = `
  t.id, t.type, t.amount, t.description, t.date,
  (t.receipt_image IS NOT NULL) AS has_receipt,
  c.id   AS category_id,
  c.name AS category_name,
  c.color AS category_color,
  c.icon AS category_icon,
  u.id   AS user_id,
  u.name AS user_name
`;

const FROM_JOINS = `
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN users      u ON u.id = t.user_id
`;

/*  validatie */
function validateBody(body) {
  const errors = {};
  const { type, amount, date, description, categoryId } = body;

  if (type !== 'income' && type !== 'expense') {
    errors.type = "Type moet 'income' of 'expense' zijn";
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    errors.amount = 'Bedrag moet een getal groter dan 0 zijn';
  } else if (numericAmount > 99999999.99) {
    errors.amount = 'Bedrag is te groot';
  }

  if (!date || Number.isNaN(Date.parse(date))) {
    errors.date = 'Datum is verplicht en moet geldig zijn (YYYY-MM-DD)';
  }

  if (description && description.length > 500) {
    errors.description = 'Omschrijving mag maximaal 500 tekens bevatten';
  }

  if (categoryId !== undefined && categoryId !== null) {
    if (!Number.isInteger(Number(categoryId))) {
      errors.categoryId = 'Categorie-id moet een geheel getal zijn';
    }
  }

  return errors;
}

/* toon alle transactions */

export async function listTransactions(req, res, next) {
  const { householdId } = req.membership;
  // filters voorbeeld: GET /transactions?type=expense&from=2026-01-01 
  const { from, to, type, categoryId, userId } = req.query;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  // Filters worden dynamisch opgebouwd, maar altijd met parameters ($1, $2, ...).
  // Nooit waarden in de SQL-string plakken: dat is precies hoe SQL-injectie ontstaat.
  const where = ['t.household_id = $1'];
  const params = [householdId];
  let i = 2;

  if (from)       { where.push(`t.date >= $${i++}`);        params.push(from); }
  if (to)         { where.push(`t.date <= $${i++}`);        params.push(to); }
  if (type)       { where.push(`t.type = $${i++}`);         params.push(type); }
  if (categoryId) { where.push(`t.category_id = $${i++}`);  params.push(categoryId); }
  if (userId)     { where.push(`t.user_id = $${i++}`);      params.push(userId); }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  try {
    // Twee queries: één voor de pagina, één voor het totaal aantal.
    // Ze draaien parallel omdat ze niets van elkaar nodig hebben.
    const [listResult, countResult] = await Promise.all([
      pool.query(
        `SELECT ${SELECT_COLUMNS}
         ${FROM_JOINS}
         ${whereClause}
         ORDER BY t.date DESC, t.id DESC
         LIMIT $${i} OFFSET $${i + 1}`,
        [...params, limit, offset]
      ),
      pool.query(
        `SELECT count(*)::int AS total FROM transactions t ${whereClause}`,
        params
      )
    ]);

    res.json({
      data: listResult.rows.map((row) => mapRow(row)),
      page,
      limit,
      total: countResult.rows[0].total
    });
  } catch (err) {
    next(err);
  }
}

/* toon 1 transaction */

export async function getTransaction(req, res, next) {
  const { householdId } = req.membership;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT ${SELECT_COLUMNS}, t.receipt_image
       ${FROM_JOINS}
       WHERE t.id = $1 AND t.household_id = $2`,
      [id, householdId]
    );

    if (rows.length === 0) {
      // household_id staat mee in de WHERE: een transactie van een andere
      // groep bestaat voor deze gebruiker simpelweg niet.
      return res.status(404).json({ message: 'Transactie niet gevonden' });
    }

    res.json(mapRow(rows[0], { includeReceipt: true }));
  } catch (err) {
    next(err);
  }
}

/* maak transaction */

export async function createTransaction(req, res, next) {
  const { householdId } = req.membership;

  const errors = validateBody(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  const { type, amount, date, description = null, categoryId = null, receiptImage = null } = req.body;

  try {
    // user_id komt uit het token, nooit uit de body: anders kan iemand
    // een transactie op naam van een ander zetten.
    const insert = await pool.query(
      `INSERT INTO transactions
         (household_id, user_id, category_id, type, amount, description, date, receipt_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [householdId, req.user.id, categoryId, type, amount, description, date, receiptImage]
    );

    const { rows } = await pool.query(
      `SELECT ${SELECT_COLUMNS} ${FROM_JOINS} WHERE t.id = $1`,
      [insert.rows[0].id]
    );

    res.status(201).json(mapRow(rows[0]));
  } catch (err) {
    // 23503 = foreign key violation: de opgegeven categorie bestaat niet.
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Onbekende categorie' });
    }
    next(err);
  }
}

/* update transactions */

export async function updateTransaction(req, res, next) {
  const { householdId } = req.membership;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  const errors = validateBody(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validatiefout', errors });
  }

  const { type, amount, date, description = null, categoryId = null, receiptImage } = req.body;

  try {
    // Laat receiptImage weg in de body en de bestaande foto blijft staan.
    // Stuur expliciet null mee om ze te verwijderen.
    const update = await pool.query(
      `UPDATE transactions SET
         type          = $1,
         amount        = $2,
         date          = $3,
         description   = $4,
         category_id   = $5,
         receipt_image = COALESCE($6, CASE WHEN $7 THEN NULL ELSE receipt_image END)
       WHERE id = $8 AND household_id = $9
       RETURNING id`,
      [
        type,
        amount,
        date,
        description,
        categoryId,
        receiptImage ?? null,
        receiptImage === null,          // true = uitdrukkelijk wissen
        id,
        householdId
      ]
    );

    if (update.rowCount === 0) {
      return res.status(404).json({ message: 'Transactie niet gevonden' });
    }

    const { rows } = await pool.query(
      `SELECT ${SELECT_COLUMNS} ${FROM_JOINS} WHERE t.id = $1`,
      [id]
    );

    res.json(mapRow(rows[0]));
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ message: 'Onbekende categorie' });
    }
    next(err);
  }
}

/* delete transaction */

export async function deleteTransaction(req, res, next) {
  const { householdId } = req.membership;
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ongeldig id' });
  }

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM transactions WHERE id = $1 AND household_id = $2`,
      [id, householdId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Transactie niet gevonden' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}