/*
  Categorieen zijn in dit datamodel globaal en hebben geen type-kolom:
  de API kan dus niet zeggen of een categorie bij een uitgave of bij een
  betaling hoort. We leiden dat af uit de naam.

  Wil je dit netter, dan hoort er een kolom 'type' bij categories in de API.
*/
export const PAYMENT_CATEGORY_NAMES = [
  'top up',
  'topup',
  'payment',
  'betaling',
  'income',
  'inkomsten'
];

export function isPaymentCategory(category) {
  return PAYMENT_CATEGORY_NAMES.includes(String(category?.name ?? '').trim().toLowerCase());
}
