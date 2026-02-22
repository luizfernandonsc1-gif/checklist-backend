const db = require('../models/db');

exports.list = async (req, res) => {
  try {
    const checklists = await db.query(`
      SELECT c.*, u.name as creator_name
      FROM checklists c
      JOIN users u ON u.id = c.created_by
      ORDER BY c.created_at DESC
    `);

    const withItems = await Promise.all(checklists.map(async cl => {
      const items = await db.query(
        'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
        [cl.id]
      );
      const assignments = await db.query(
        'SELECT loja_id FROM checklist_assignments WHERE checklist_id = ?',
        [cl.id]
      );
      return {
        ...cl,
        items,
        assigned_lojas: assignments.map(a => Number(a.loja_id)),
      };
    }));

    // Se for loja, filtra apenas os checklists que ela tem acesso
    if (req.user.role === 'loja') {
      const filtered = withItems.filter(cl =>
        Number(cl.is_global) === 1 ||
        cl.assigned_lojas.includes(Number(req.user.id))
      );
      return res.json(filtered);
    }

    res.json(withItems);
  } catch (e) {
    console.error(e);
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
    const assignments = await db.query(
      'SELECT loja_id FROM checklist_assignments WHERE checklist_id = ?',
      [cl.id]
    );
    cl.assigned_lojas = assignments.map(a => Number(a.loja_id));

    res.json(cl);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, items, is_global, assigned_lojas } = req.body;
    if (!title) return res.status(400).json({ message: 'Título é obrigatório.' });

    const result = await db.run(
      'INSERT INTO checklists (title, created_by, is_global) VALUES (?, ?, ?)',
      [title, req.user.id, is_global ? 1 : 0]
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

    if (!is_global && assigned_lojas && assigned_lojas.length > 0) {
      for (const lojaId of assigned_lojas) {
        await db.run(
          'INSERT OR IGNORE INTO checklist_assignments (checklist_id, loja_id) VALUES (?, ?)',
          [checklistId, lojaId]
        );
      }
    }

    const created = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    created.items = await db.query(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
      [checklistId]
    );
    const assignments = await db.query(
      'SELECT loja_id FROM checklist_assignments WHERE checklist_id = ?',
      [checklistId]
    );
    created.assigned_lojas = assignments.map(a => Number(a.loja_id));

    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, items, is_global, assigned_lojas } = req.body;
    const { id } = req.params;

    const cl = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [id]);
    if (!cl) return res.status(404).json({ message: 'Checklist não encontrado.' });

    if (title) await db.run(
      'UPDATE checklists SET title = ?, is_global = ? WHERE id = ?',
      [title, is_global ? 1 : 0, id]
    );

    if (items) {
      await db.run('DELETE FROM checklist_items WHERE checklist_id = ?', [id]);
      for (let idx = 0; idx < items.length; idx++) {
        await db.run(
          'INSERT INTO checklist_items (checklist_id, text, item_order) VALUES (?, ?, ?)',
          [id, items[idx], idx]
        );
      }
    }

    await db.run('DELETE FROM checklist_assignments WHERE checklist_id = ?', [id]);
    if (!is_global && assigned_lojas && assigned_lojas.length > 0) {
      for (const lojaId of assigned_lojas) {
        await db.run(
          'INSERT OR IGNORE INTO checklist_assignments (checklist_id, loja_id) VALUES (?, ?)',
          [id, lojaId]
        );
      }
    }

    const updated = await db.queryOne('SELECT * FROM checklists WHERE id = ?', [id]);
    updated.items = await db.query(
      'SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY item_order',
      [id]
    );
    const assignments = await db.query(
      'SELECT loja_id FROM checklist_assignments WHERE checklist_id = ?',
      [id]
    );
    updated.assigned_lojas = assignments.map(a => Number(a.loja_id));

    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.remove = async (req, res) => {
  try {
    await db.run('DELETE FROM checklist_assignments WHERE checklist_id = ?', [req.params.id]);
    const result = await db.run('DELETE FROM checklists WHERE id = ?', [req.params.id]);
    if (result.changes === 0)
      return res.status(404).json({ message: 'Checklist não encontrado.' });
    res.json({ message: 'Checklist excluído com sucesso.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};

exports.getLojas = async (req, res) => {
  try {
    const lojas = await db.query(
      "SELECT id, name, email FROM users WHERE role = 'loja' ORDER BY name"
    );
    res.json(lojas);
  } catch (e) {
    res.status(500).json({ message: 'Erro interno.' });
  }
};
