require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/models/db');

async function seed() {
  await db.initSchema();

  const hash = (p) => bcrypt.hashSync(p, 10);

  // Limpa dados existentes
  await db.run('DELETE FROM checklist_response_items');
  await db.run('DELETE FROM checklist_responses');
  await db.run('DELETE FROM checklist_items');
  await db.run('DELETE FROM checklists');
  await db.run('DELETE FROM users');

  // Cria usuários
  await db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Admin Boticario', 'admin@boticario.com', hash('admin123'), 'admin']
  );
  await db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Loja Centro', 'loja@boticario.com', hash('loja123'), 'loja']
  );

  const adminUser = await db.queryOne("SELECT id FROM users WHERE role = 'admin'");

  const cl = await db.run(
    'INSERT INTO checklists (title, created_by) VALUES (?, ?)',
    ['Checklist de Abertura de Loja', adminUser.id]
  );

  const items = [
    'Verificar estoque de produtos',
    'Limpar vitrines e balcoes',
    'Testar terminais de pagamento',
    'Conferir escala de funcionarios',
    'Ativar sistema de monitoramento',
  ];

  for (let i = 0; i < items.length; i++) {
    await db.run(
      'INSERT INTO checklist_items (checklist_id, text, item_order) VALUES (?, ?, ?)',
      [cl.lastInsertRowid, items[i], i]
    );
  }

  console.log('Seed concluido!');
  console.log('   Admin: admin@boticario.com / admin123');
  console.log('   Loja:  loja@boticario.com  / loja123');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
