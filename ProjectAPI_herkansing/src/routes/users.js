import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';

// Geen mergeParams en geen requireMembership: gebruikers hangen niet
// onder één household.
const router = Router();

router.use(requireAuth);

// De volledige gebruikerslijst is beheerdersinfo, geen publieke data.
router.get('/', requireAdmin, listUsers);

// Je eigen profiel bekijken en aanpassen.
// Controleer in de controller dat req.params.userId gelijk is aan
// req.user.id, of dat req.user.role === 'admin'. Doe je dat niet, dan kan
// elke ingelogde gebruiker het profiel van een ander wijzigen.
router.get('/:userId', getUser);
router.put('/:userId', updateUser);

// Geen requireAdmin: je mag je eigen account opzeggen. De controller
// controleert of het om jezelf gaat, of om een beheerder.
router.delete('/:userId', deleteUser);

export default router;
