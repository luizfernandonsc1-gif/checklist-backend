const db = require('../models/db');

function getCurrentPeriod(recurrence) {
  const now = new Date();
  if (recurrence === 'daily') return now.toISOString().split('T')[0];
  if (recurrence === 'weekly') {
    const day = now.getDay();
    const diff = now.getDate() - day;
    const monday = new Date(new Date().setDate(diff));
    return monday.toISOString().split('T')[0];
  }
  if (recurrence === 'monthly') {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return 'none';
}

exports.listAll = async (req, res) => {
  try {
    const responses = await db.query(`
      SELECT r.*, c.title as checklist_title, c.recurrence, u.name as loja_name, u.email as loja_email
      FROM checklist_responses r
      JOIN checklists c ON c.id = r.checklist_id
      JOIN users u ON u.id = r.loja_id
      ORDER BY r.id DESC
    `);

    const withItems = await Promise.all(responses.map(async r => ({
      ...r,
      items: await db.query(`
        SELECT ci.text, ci.item_order, ri.checked
        FROM checklist_response_items ri
        JOIN checklist_items ci ON ci.id = ri.item_id
        WHERE ri.response_id = ?
        ORDER BY ci.item_order
      `, [r.id]),
    })));

    res.json(withItems);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.listMine = async (req, res) => {
  try {
    const responses = await db.query(`
      SELECT r.*, c.title as checklist_title, c.recurrence
      FROM checklist_responses r
      JOIN checklists c ON c.id = r.checklist_id
      WHERE r.loja_id = ?
      ORDER BY r.id DESC
    `, [req.user.id]);

    res.json(responses);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.getMyResponse = async (req, res) => {
  try {
    const cl = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [req.params.checklistId]);
    if (!cl) return res.json(null);

    const period = getCurrentPeriod(cl.recurrence);

    const response = await db.queryOne(`
      SELECT * FROM checklist_responses
      WHERE checklist_id = ? AND loja_id = ? AND period = ?
    `, [req.params.checklistId, req.user.id, period]);

    if (!response) return res.json(null);

    response.items = await db.query(`
      SELECT ri.*, ci.text, ci.item_order
      FROM checklist_response_items ri
      JOIN checklist_items ci ON ci.id = ri.item_id
      WHERE ri.response_id = ?
      ORDER BY ci.item_order
    `, [response.id]);

    res.json(response);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.save = async (req, res) => {
  try {
    const { items } = req.body;
    const { checklistId } = req.params;
    const lojaId = req.user.id;

    const cl = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    if (!cl) return res.status(404).json({ message: 'Checklist não encontrado.' });

    const period = getCurrentPeriod(cl.recurrence);

    let response = await db.queryOne(
      'SELECT * FROM checklist_responses WHERE checklist_id = ? AND loja_id = ? AND period = ?',
      [checklistId, lojaId, period]
    );

    if (!response) {
      const result = await db.run(
        'INSERT INTO checklist_responses (checklist_id, loja_id, status, period) VALUES (?, ?, ?, ?)',
        [checklistId, lojaId, 'pending', period]
      );
      response = await db.queryOne('SELECT * FROM checklist_responses WHERE id = ?', [result.lastInsertRowid]);
    }

    if (response.status === 'completed') {
      return res.status(403).json({ message: 'Checklist já foi concluído e não pode ser editado.' });
    }

    for (const { item_id, checked } of items) {
      await db.run(`
        INSERT INTO checklist_response_items (response_id, item_id, checked)
        VALUES (?, ?, ?)
        ON CONFLICT(response_id, item_id) DO UPDATE SET checked = excluded.checked
      `, [response.id, item_id, checked ? 1 : 0]);
    }

    res.json({ message: 'Progresso salvo.', response_id: response.id });
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.complete = async (req, res) => {
  try {
    const { checklistId } = req.params;
    const lojaId = req.user.id;

    const cl = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    if (!cl) return res.status(404).json({ message: 'Checklist não encontrado.' });

    const period = getCurrentPeriod(cl.recurrence);

    const response = await db.queryOne(
      'SELECT * FROM checklist_responses WHERE checklist_id = ? AND loja_id = ? AND period = ?',
      [checklistId, lojaId, period]
    );

    if (!response) return res.status(404).json({ message: 'Salve o progresso primeiro.' });
    if (response.status === 'completed') return res.status(400).json({ message: 'Já concluído.' });

    await db.run(
      `UPDATE checklist_responses SET status = 'completed', completed_at = datetime('now') WHERE id = ?`,
      [response.id]
    );

    res.json({ message: 'Checklist concluído com sucesso!' });
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};
