require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/models/db');

async function seed() {
  await db.initSchema();

  const hash = (p) => bcrypt.hashSync(p, 10);

  await db.run('DELETE FROM checklist_assignments');
  await db.run('DELETE FROM checklist_response_items');
  await db.run('DELETE FROM checklist_responses');
  await db.run('DELETE FROM checklist_items');
  await db.run('DELETE FROM checklists');
  await db.run('DELETE FROM users');

  // Admin
  await db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Admin', 'admin@boticario.com', hash('admin123'), 'admin']
  );

  // 7 Lojas
  const lojas = [
    { name: 'Joaçaba',        email: 'joacaba@boticario.com',      senha: 'joacaba123' },
    { name: 'Caitá',          email: 'caita@boticario.com',         senha: 'caita123' },
    { name: 'Herval D\'Oeste',email: 'herval@boticario.com',        senha: 'herval123' },
    { name: 'Capinzal',       email: 'capinzal@boticario.com',      senha: 'capinzal123' },
    { name: 'Treze Tílias',   email: 'trezetilias@boticario.com',   senha: 'trezetilias123' },
    { name: 'Campos Novos',   email: 'camposnovos@boticario.com',   senha: 'camposnovos123' },
    { name: 'Venda Direta',   email: 'vendadireta@boticario.com',   senha: 'vendadireta123' },
  ];

  for (const loja of lojas) {
    await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [loja.name, loja.email, hash(loja.senha), 'loja']
    );
  }

  // Checklist de exemplo global
  const admin = await db.queryOne("SELECT id FROM users WHERE role = 'admin'");
  const cl = await db.run(
    'INSERT INTO checklists (title, created_by, is_global) VALUES (?, ?, ?)',
    ['Checklist de Abertura de Loja', admin.id, 1]
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
  console.log('Admin: admin@boticario.com / admin123');
  console.log('Lojas criadas:');
  lojas.forEach(l => console.log(`  ${l.name}: ${l.email} / ${l.senha}`));
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
