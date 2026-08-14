import { Router } from 'express';
import { requireAuth, requireMembership } from '../middleware/auth.js';
import {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactionsController.js';

// mergeParams zorgt dat :householdId uit de parent-route hier beschikbaar blijft.
const router = Router({ mergeParams: true });

// Beide middlewares gelden voor élke route hieronder.
// Vergeet je er één op een losse route, dan staat die open - dus zet ze hier.
router.use(requireAuth, requireMembership);

router.get('/',       listTransactions);
router.post('/',      createTransaction);
router.get('/:id',    getTransaction);
router.put('/:id',    updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;