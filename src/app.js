require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models/db');

const authRoutes = require('./routes/auth');
const checklistRoutes = require('./routes/checklists');
const responseRoutes = require('./routes/responses');

const app = express();

app.use(cors({
  origin: '*',
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
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend rodando na porta ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erro ao inicializar banco:', err);
    process.exit(1);
  });
