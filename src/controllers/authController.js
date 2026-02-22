const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });

    const user = await db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });

    if (Number(user.active) === 0)
      return res.status(403).json({ message: 'Usuário desativado. Contate o administrador.' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Credenciais inválidas.' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.me = (req, res) => {
  res.json({ user: req.user });
};

// Lista todos os usuários (admin)
exports.listUsers = async (req, res) => {
  try {
    const users = await db.query(
      'SELECT id, name, email, role, active, created_at FROM users ORDER BY role, name'
    );
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

// Cria novo usuário (admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    if (!['admin', 'loja'].includes(role))
      return res.status(400).json({ message: 'Role inválido.' });

    const existing = await db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existing)
      return res.status(400).json({ message: 'E-mail já cadastrado.' });

    const hash = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)',
      [name, email, hash, role]
    );

    const user = await db.queryOne(
      'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?',
      [result.lastInsertRowid]
    );
    res.status(201).json(user);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

// Edita usuário (admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const { id } = req.params;

    const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    if (email && email !== user.email) {
      const existing = await db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) return res.status(400).json({ message: 'E-mail já cadastrado.' });
    }

    const newName = name || user.name;
    const newEmail = email || user.email;
    const newRole = role || user.role;
    const newHash = password ? bcrypt.hashSync(password, 10) : user.password_hash;

    await db.run(
      'UPDATE users SET name = ?, email = ?, password_hash = ?, role = ? WHERE id = ?',
      [newName, newEmail, newHash, newRole, id]
    );

    const updated = await db.queryOne(
      'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?',
      [id]
    );
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

// Ativa ou desativa usuário (admin)
exports.toggleUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    if (user.email === 'admin@boticario.com')
      return res.status(400).json({ message: 'Não é possível desativar o admin principal.' });

    const newActive = Number(user.active) === 1 ? 0 : 1;
    await db.run('UPDATE users SET active = ? WHERE id = ?', [newActive, id]);

    res.json({ message: newActive === 1 ? 'Usuário ativado.' : 'Usuário desativado.', active: newActive });
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};
