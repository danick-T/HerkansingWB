import { Router } from 'express';
import { requireAuth, requireMembership, requireOwner } from '../middleware/auth.js';
import {
  listMemberships,
  getMembership,
  createMembership,
  updateMembership,
  deleteMembership
} from '../controllers/membershipController.js';

// Deze router wordt gemount op /api/households/:householdId/memberships.
// mergeParams haalt :householdId uit dat mount-pad naar binnen, waardoor
// requireMembership hier wél op router-niveau mag staan.
const router = Router({ mergeParams: true });

router.use(requireAuth, requireMembership);

// Elk lid mag zien wie er nog in de groep zit.
router.get('/', listMemberships);
router.get('/:membershipId', getMembership);

// Leden toevoegen of van rol veranderen: enkel de eigenaar.
router.post('/',             requireOwner, createMembership);
router.put('/:membershipId', requireOwner, updateMembership);

// "de groep verlaten",
router.delete('/:membershipId', deleteMembership);

export default router;
