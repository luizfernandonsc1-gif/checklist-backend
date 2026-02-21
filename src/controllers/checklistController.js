const db = require('../models/db');

exports.list = async (req, res) => {
  try {
    const checklists = await db.query(`
      SELECT c.*, u.name as creator_name
      FROM checklists c
      JOIN users u ON u.id = c.created_by
      ORDER BY c.created_at DESC
    `);

    const withItems = await Promise.all(checklists.map(async cl => ({
      ...cl,
      items: await db.query(
        'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
        [cl.id]
      ),
    })));

    res.json(withItems);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const cl = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [req.params.id]);
    if (!cl) return res.status(404).json({ message: 'Checklist não encontrado.' });

    cl.items = await db.query(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
      [cl.id]
    );

    res.json(cl);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, items } = req.body;
    if (!title) return res.status(400).json({ message: 'Título é obrigatório.' });

    const result = await db.run(
      'INSERT INTO checklists (title, created_by) VALUES (?, ?)',
      [title, req.user.id]
    );
    const checklistId = result.lastInsertRowid;

    if (items && items.length > 0) {
      for (let idx = 0; idx < items.length; idx++) {
        await db.run(
          'INSERT INTO checklist_items (checklist_id, text, item_order) VALUES (?, ?, ?)',
          [checklistId, items[idx], idx]
        );
      }
    }

    const created = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    created.items = await db.query(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
      [checklistId]
    );

    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, items } = req.body;
    const { id } = req.params;

    const cl = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [id]);
    if (!cl) return res.status(404).json({ message: 'Checklist não encontrado.' });

    if (title) await db.run('UPDATE checklists SET title = ? WHERE id = ?', [title, id]);

    if (items) {
      await db.run('DELETE FROM checklist_items WHERE checklist_id = ?', [id]);
      for (let idx = 0; idx < items.length; idx++) {
        await db.run(
          'INSERT INTO checklist_items (checklist_id, text, item_order) VALUES (?, ?, ?)',
          [id, items[idx], idx]
        );
      }
    }

    const updated = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [id]);
    updated.items = await db.query(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
      [id]
    );

    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.run('DELETE FROM checklists WHERE id = ?', [req.params.id]);
    if (result.changes === 0)
      return res.status(404).json({ message: 'Checklist não encontrado.' });
    res.json({ message: 'Checklist excluído com sucesso.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};
