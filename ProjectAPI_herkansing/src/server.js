import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import householdRoutes from './routes/household.js';
import membershipRoutes from './routes/memberships.js';
import transactionRoutes from './routes/transactions.js';
import userRoutes from './routes/users.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));   // ruim genoeg voor een base64-bon

app.get('/api/health', async (req, res) => {
  const { rows } = await pool.query('SELECT now()');
  res.json({ status: 'ok', time: rows[0].now });
});

// Genest onder een household: hierdoor zit :householdId in het mount-pad
// en kan requireMembership hem via mergeParams uitlezen.
// Deze twee staan bewust vóór de household-router.
app.use('/api/households/:householdId/transactions', transactionRoutes);
app.use('/api/households/:householdId/memberships', membershipRoutes);

// Losstaande resources.
app.use('/api/auth', authRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// 404 voor alles wat hierboven niet is opgevangen.
// Deze MOET onder alle routes staan: Express loopt de stack van boven
// naar beneden, dus alles eronder wordt nooit bereikt.
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint bestaat niet' });
});

// Centrale foutafhandeling. Elke next(err) in een controller komt hier terecht,
// zodat je nergens anders een 500 hoeft te bouwen.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Er ging iets mis op de server' });
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => console.log(`API draait op poort ${port}`));
