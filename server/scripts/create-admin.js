// Crea (o promueve) un administrador. Uso: npm run create-admin
// Pide los datos por consola; la contraseña no se muestra ni queda en el historial de comandos.
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import bcrypt from 'bcryptjs';
import { connect, migrate, one, close } from '../src/db/index.js';
import { emailField, nameField, newPasswordField } from '../src/modules/auth/auth.schemas.js';

const rl = readline.createInterface({ input: stdin, output: stdout });

/** Pregunta sin mostrar lo que se escribe (para la contraseña). */
async function askHidden(question) {
  const original = rl._writeToOutput;
  rl._writeToOutput = (text) => (text.startsWith(question) ? stdout.write(question) : undefined);
  const answer = await rl.question(question);
  rl._writeToOutput = original;
  stdout.write('\n');
  return answer;
}

try {
  const name = nameField.parse(await rl.question('Nombre completo: '));
  const email = emailField.parse(await rl.question('Correo: '));
  const password = newPasswordField.parse(await askHidden('Contraseña (8+ caracteres, letras y números): '));
  await connect();
  await migrate();
  const user = await one(
    `insert into app.users (name, email, password_hash, role, email_verified)
     values ($1, $2, $3, 'ADMIN', true)
     on conflict (email) do update set role = 'ADMIN', password_hash = excluded.password_hash, status = 'ACTIVE', updated_at = now()
     returning id`,
    [name, email, await bcrypt.hash(password, 12)]
  );
  await one(
    "insert into app.audit_log (actor_id, action, target_type, target_id) values ($1, 'user.admin_created_cli', 'user', $1) returning id",
    [user.id]
  );
  console.log(`✔ Administrador listo: ${email}`);
} catch (err) {
  console.error('✖ No se pudo crear el administrador:', err.issues?.[0]?.message ?? err.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await close();
}
