/**
 * Seed script: Crea una cuenta de desarrollador con acceso total.
 *
 * Uso:
 *   docker exec -it shopsphere-backend npx tsx src/scripts/seed-dev-account.ts
 *
 * Credenciales generadas:
 *   Email:    dev@shopsphere.com
 *   Password: DevAdmin2024!
 *   Role:     admin
 *   XP:       999999
 */

import bcrypt from 'bcryptjs';
import { db } from '../shared/db/index.js';
import { users } from '../shared/db/schema.js';
import { eq } from 'drizzle-orm';
import { pool } from '../shared/db/index.js';

const DEV_EMAIL = 'dev@shopsphere.com';
const DEV_USERNAME = 'developer';
const DEV_PASSWORD = 'DevAdmin2024!';
const DEV_ROLE = 'admin' as const;
const DEV_XP = 999999;
const DEV_LEVEL = 10;

async function seedDevAccount(): Promise<void> {
  console.log('🔧 Creando cuenta de desarrollador...\n');

  // Verificar si ya existe
  const [existing] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, DEV_EMAIL))
    .limit(1);

  if (existing) {
    // Actualizar la cuenta existente para asegurar que tiene los valores correctos
    console.log('⚠️  La cuenta ya existe. Actualizando parámetros...');
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

    await db
      .update(users)
      .set({
        role: DEV_ROLE,
        xpTotal: DEV_XP,
        currentLevel: DEV_LEVEL,
        isActive: true,
        emailVerified: true,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));

    console.log('✅ Cuenta actualizada exitosamente.\n');
  } else {
    // Crear nueva cuenta
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        email: DEV_EMAIL,
        username: DEV_USERNAME,
        passwordHash,
        role: DEV_ROLE,
        xpTotal: DEV_XP,
        currentLevel: DEV_LEVEL,
        isActive: true,
        emailVerified: true,
      })
      .returning({ id: users.id });

    console.log(`✅ Cuenta creada exitosamente. ID: ${newUser!.id}\n`);
  }

  console.log('╔══════════════════════════════════════════╗');
  console.log('║     CREDENCIALES DE DESARROLLADOR        ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Email:    ${DEV_EMAIL.padEnd(28)}║`);
  console.log(`║  Password: ${DEV_PASSWORD.padEnd(28)}║`);
  console.log(`║  Role:     ${DEV_ROLE.padEnd(28)}║`);
  console.log(`║  XP:       ${String(DEV_XP).padEnd(28)}║`);
  console.log(`║  Level:    ${String(DEV_LEVEL).padEnd(28)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('\n🔓 Todos los niveles estarán desbloqueados para esta cuenta.');
}

seedDevAccount()
  .then(() => {
    console.log('\n✨ Script completado.');
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error al crear cuenta de desarrollador:', err);
    void pool.end().then(() => process.exit(1));
  });
