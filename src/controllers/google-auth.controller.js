import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.model.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const STATE_COOKIE = 'google_oauth_state';
let cachedKeys = null;
let keysExpiresAt = 0;

const cookieBase = () => ({
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: Number(process.env.JWT_COOKIE_MAX_AGE || 3600000)
});

const setSessionCookies = (res, user) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const token = jwt.sign(
    { email: user.email, role: user.rol, csrfToken },
    process.env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: 'esports-api',
      audience: 'esports-admin-frontend'
    }
  );
  res.cookie('jwt_token', token, { ...cookieBase(), httpOnly: true });
  res.cookie('csrf_token', csrfToken, { ...cookieBase(), httpOnly: false });
};

function getGoogleConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    throw new Error('Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_CALLBACK_URL en .env.');
  }
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, callbackUrl: GOOGLE_CALLBACK_URL };
}

export function googleLogin(_req, res, next) {
  try {
    const { clientId, callbackUrl } = getGoogleConfig();
    const state = crypto.randomBytes(32).toString('hex');
    res.cookie(STATE_COOKIE, state, { ...cookieBase(), httpOnly: true, maxAge: 10 * 60 * 1000 });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account'
    });
    return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  } catch (error) {
    next(error);
  }
}

async function exchangeCode(code, config) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.callbackUrl,
      grant_type: 'authorization_code'
    })
  });
  const data = await response.json();
  if (!response.ok || !data.id_token) throw new Error('Google no pudo validar el código de autorización.');
  return data.id_token;
}

async function getGoogleSigningKey(kid) {
  if (!cachedKeys || Date.now() >= keysExpiresAt) {
    const response = await fetch(GOOGLE_JWKS_URL);
    if (!response.ok) throw new Error('No fue posible consultar las claves públicas de Google.');
    const body = await response.json();
    cachedKeys = body.keys || [];
    const cacheControl = response.headers.get('cache-control') || '';
    const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
    keysExpiresAt = Date.now() + maxAge * 1000;
  }
  const jwk = cachedKeys.find(key => key.kid === kid && key.use === 'sig');
  if (!jwk) throw new Error('La firma del token de Google no es válida.');
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

async function verifyGoogleIdToken(idToken, expectedAudience) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Token de Google malformado.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Algoritmo de firma de Google no admitido.');

  const key = await getGoogleSigningKey(header.kid);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  if (!verifier.verify(key, Buffer.from(parts[2], 'base64url'))) throw new Error('Firma del token de Google inválida.');

  const now = Math.floor(Date.now() / 1000);
  const validIssuer = ['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss);
  if (!validIssuer || payload.aud !== expectedAudience || !payload.sub || !Number.isFinite(payload.exp) || payload.exp <= now || payload.iat > now + 60 || payload.email_verified !== true || typeof payload.email !== 'string' || !payload.email) {
    throw new Error('El token de Google no cumple con los requisitos de validación.');
  }
  return payload;
}

export async function googleCallback(req, res, next) {
  try {
    const { clientId } = getGoogleConfig();
    const stateCookie = req.cookies?.[STATE_COOKIE];
    const stateQuery = req.query.state;
    res.clearCookie(STATE_COOKIE, { ...cookieBase(), httpOnly: true });

    if (req.query.error) return res.status(401).send('El inicio de sesión con Google fue cancelado. Puedes cerrar esta pestaña.');
    if (!req.query.code || !stateCookie || typeof stateQuery !== 'string' || stateCookie !== stateQuery) {
      return res.status(400).send('Solicitud OAuth inválida: el parámetro state no coincide.');
    }

    const idToken = await exchangeCode(String(req.query.code), getGoogleConfig());
    const profile = await verifyGoogleIdToken(idToken, clientId);
    const googleId = String(profile.sub);
    const email = String(profile.email).toLowerCase();
    const nombre = String(profile.name || email);
    const foto = typeof profile.picture === 'string' ? profile.picture : null;

    let user = await Usuario.findOne({ where: { google_id: googleId } });
    if (!user) {
      const emailOwner = await Usuario.findOne({ where: { email } });
      if (emailOwner) return res.status(409).send('Este correo ya está asociado a otra cuenta. Contacta al administrador.');
      user = await Usuario.create({ google_id: googleId, email, nombre, foto, proveedor: 'google', rol: 'Public' });
    } else {
      await user.update({ email, nombre, foto });
    }

    setSessionCookies(res, user);
    const redirectTo = process.env.GOOGLE_SUCCESS_REDIRECT || '/';
    return res.redirect(redirectTo);
  } catch (error) {
    next(error);
  }
}
