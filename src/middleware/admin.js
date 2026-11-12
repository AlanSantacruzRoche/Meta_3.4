import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'jwt_token';

export function authenticateJWT(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Sesión no iniciada o expirada.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || !payload.sub || !payload.role) {
      return res.status(401).json({ error: 'Sesión inválida.' });
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role, csrfToken: payload.csrfToken };
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Se requiere el rol Admin.' });
  }
  next();
}

export function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.get('X-CSRF-Token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken ||
      !req.user?.csrfToken || headerToken !== req.user.csrfToken) {
    return res.status(403).json({ error: 'Token CSRF ausente o inválido.' });
  }
  next();
}
