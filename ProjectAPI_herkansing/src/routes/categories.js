import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoriesController.js';

// Geen mergeParams: categorieën zijn in het datamodel GLOBAAL. Ze hebben
// geen household_id en hangen dus ook niet onder een household in de URL.
const router = Router();

// Inloggen is voor alles nodig, lid zijn van een groep niet.
router.use(requireAuth);

// Lezen mag iedereen: de app heeft de lijst nodig om een categorie te kiezen.
router.get('/', listCategories);

// De globale lijst wijzigen is voorbehouden aan beheerders.
router.post('/',      requireAdmin, createCategory);
router.put('/:id',    requireAdmin, updateCategory);
router.delete('/:id', requireAdmin, deleteCategory);

export default router;
