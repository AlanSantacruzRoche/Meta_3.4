import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const jwtCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: Number(process.env.JWT_COOKIE_MAX_AGE || 3600000)
});

const csrfCookieOptions = () => ({
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: Number(process.env.JWT_COOKIE_MAX_AGE || 3600000)
});

export function login(req, res) {
  const { email, password } = req.body || {};
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword || !process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Configura ADMIN_EMAIL, ADMIN_PASSWORD y JWT_SECRET en .env.' });
  }

  // Demo académica: credenciales de Admin desde variables de entorno.
  // Para producción, sustituir por usuarios en BD y hashes Argon2/bcrypt.
  const emailOk = typeof email === 'string' && email === adminEmail;
  const passwordOk = typeof password === 'string' &&
    Buffer.byteLength(password) === Buffer.byteLength(adminPassword) &&
    crypto.timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword));

  if (!emailOk || !passwordOk) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  const csrfToken = crypto.randomBytes(32).toString('hex');
  const token = jwt.sign(
    { email: adminEmail, role: 'Admin', csrfToken },
    process.env.JWT_SECRET,
    { subject: 'admin', expiresIn: process.env.JWT_EXPIRES_IN || '1h', issuer: 'esports-api', audience: 'esports-admin-frontend' }
  );

  res.cookie('jwt_token', token, jwtCookieOptions());
  res.cookie('csrf_token', csrfToken, csrfCookieOptions());
  res.json({ message: 'Sesión iniciada.', user: { email: adminEmail, role: 'Admin' }, csrfToken });
}

export function me(req, res) {
  res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role }, csrfToken: req.user.csrfToken });
}

export function logout(_req, res) {
  const base = { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' };
  res.clearCookie('jwt_token', { ...base, httpOnly: true });
  res.clearCookie('csrf_token', { ...base, httpOnly: false });
  res.status(204).end();
}
