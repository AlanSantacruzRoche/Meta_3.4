import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import sequelize from './config/database.js';
import './models/index.js';
import jugadoresRoutes from './routes/jugadores.routes.js';
import rostersRoutes from './routes/rosters.routes.js';
import auxiliaresRoutes from './routes/auxiliares.routes.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();
const app = express();
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Permite herramientas sin Origin (p. ej. curl/Postman); navegador debe coincidir con allowlist.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const API = '/api/v1';
app.get(`${API}/health`, async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/jugadores`, jugadoresRoutes);
app.use(`${API}/rosters`, rostersRoutes);
app.use(`${API}`, auxiliaresRoutes);

const openapi = YAML.parse(fs.readFileSync(new URL('../openapi.yaml', import.meta.url), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.resolve(__dirname, '../public')));

app.use((req, res) => res.status(404).json({ error: 'Endpoint no encontrado.' }));
app.use((err, _req, res, _next) => {
  if (err.message === 'Origen no permitido por CORS.') return res.status(403).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const port = Number(process.env.PORT || 3000);
const start = async () => {
  if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en .env. Copia .env.example y configura las variables.');
    process.exit(1);
  }
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Conexión a MySQL establecida.');
    app.listen(port, () => console.log(`API y frontend en http://localhost:${port}`));
  } catch (error) {
    console.error('No se pudo iniciar la API. Revisa MySQL y el archivo .env.', error.message);
    process.exit(1);
  }
};
start();
