/* Заводит учётку для админки.
   bun scripts/create-user.ts <email> <пароль> <имя> [owner|manager] */

import process from 'node:process';

/* Node 22 умеет loadEnvFile, Bun читает .env сам — поэтому вызов необязательный. */
process.loadEnvFile?.('.env');

if (!process.env.DATABASE_URL) {
  console.error('Нет DATABASE_URL — скопируйте .env.example в .env');
  process.exit(1);
}

/* Динамический импорт: модули читают process.env на этапе загрузки,
   а он наполняется только после loadEnvFile выше. */
const { db } = await import('../src/db/index');
const { users } = await import('../src/db/schema');
const { hashPassword } = await import('../src/lib/auth/password');

const [email, password, name, role = 'owner'] = process.argv.slice(2);

if (!email || !password || !name) {
  console.error('Использование: bun scripts/create-user.ts <email> <пароль> <имя> [owner|manager]');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Пароль короче 8 символов');
  process.exit(1);
}

if (role !== 'owner' && role !== 'manager') {
  console.error('Роль может быть только owner или manager');
  process.exit(1);
}

const [created] = await db
  .insert(users)
  .values({
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    name,
    role,
  })
  .returning({ id: users.id, email: users.email, role: users.role });

console.log('Создан:', created);
process.exit(0);
