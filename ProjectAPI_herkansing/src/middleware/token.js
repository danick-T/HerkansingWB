import jwt from 'jsonwebtoken';

/**
 * Maakt het JWT aan na registratie en login.
 *
 * De globale rol zit in het token, zodat requireAdmin geen extra
 * databasequery nodig heeft. De rol per groep zit er bewust NIET in:
 * die verschilt per household en zou het token laten meegroeien met
 * het aantal groepen. Die halen we op in requireMembership.
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}