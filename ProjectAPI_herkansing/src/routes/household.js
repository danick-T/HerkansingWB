import { Router } from 'express';
import { requireAuth, requireMembership, requireOwner } from '../middleware/auth.js';
import {
  listHouseholds,
  getHousehold,
  createHousehold,
  updateHousehold,
  deleteHousehold
} from '../controllers/householdController.js';

const router = Router();

// Alleen requireAuth op router-niveau.
// requireMembership kan hier NIET staan: op dit punt is :householdId nog
// niet gematcht, en bij GET / en POST / bestaat die groep zelfs nog niet.
router.use(requireAuth);

// "Geef mijn groepen" - gaat per definitie niet over één groep.
router.get('/', listHouseholds);

// Een groep aanmaken: je kan onmogelijk al lid zijn van iets dat nog niet bestaat.
router.post('/', createHousehold);

// Vanaf hier bestaat :householdId wel, dus geven we de guard per route mee.
router.get('/:householdId', requireMembership, getHousehold);

// Hernoemen en verwijderen is voorbehouden aan de eigenaar van de groep.
router.put('/:householdId',    requireMembership, requireOwner, updateHousehold);
router.delete('/:householdId', requireMembership, requireOwner, deleteHousehold);

export default router;
