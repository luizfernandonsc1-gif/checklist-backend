require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models/db');

const authRoutes = require('./routes/auth');
const checklistRoutes = require('./routes/checklists');
const responseRoutes = require('./routes/responses');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/responses', responseRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3001;

db.initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Erro ao inicializar banco:', err);
    process.exit(1);
  });
