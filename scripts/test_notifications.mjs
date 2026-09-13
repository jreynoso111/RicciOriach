import assert from 'node:assert/strict';
import { ADMIN, PRODUCT, makeDatabase } from './test_commerce.mjs';

async function run() {
  const { db, as } = await makeDatabase();
  let checks = 0;
  const ok = (value) => { assert.ok(value); checks++; };
  const rejects = async (promise, pattern) => { await assert.rejects(promise, pattern); checks++; };
  const subscribe = (email, type, productId = null, consent = true, website = '') => as('anon', async (database) => {
    const result = await database.query(
      'select public.subscribe_notification($1, $2, $3, $4, $5) as value',
      [email, type, productId, consent, website],
    );
    return result.rows[0].value;
  });

  // The honeypot returns a generic success without storing the submitted values.
  const hiddenBot = await subscribe('not-an-email', 'new_events', null, false, 'bot-filled');
  ok(hiddenBot.ok === true);
  ok((await db.query('select count(*)::int as count from public.notification_signups')).rows[0].count === 0);

  // A product signup is valid only for a published product with no stock.
  await db.query('update public.products set capacity = 0, allocated = 0 where id = $1', [PRODUCT]);
  await subscribe('Stock.Alert@Example.test', 'product_stock', PRODUCT);
  const productSignup = (await db.query("select * from public.notification_signups where notification_type = 'product_stock'")).rows[0];
  ok(productSignup.email === 'stock.alert@example.test');
  ok(productSignup.status === 'active');
  await subscribe('Stock.Alert@Example.test', 'product_stock', PRODUCT);
  ok((await db.query("select count(*)::int as count from public.notification_signups where notification_type = 'product_stock'")).rows[0].count === 1);
  await rejects(subscribe('available@example.test', 'product_stock', PRODUCT, false), /Confirma/);

  // Restock creates one pending outbox row and keeps the user's email private.
  await db.query('update public.products set capacity = 4 where id = $1', [PRODUCT]);
  const productJob = (await db.query('select * from public.notification_outbox where product_id = $1', [PRODUCT])).rows[0];
  ok(productJob.status === 'pending');
  ok((await db.query('select status from public.notification_signups where id = $1', [productSignup.id])).rows[0].status === 'queued');
  await rejects(subscribe('available@example.test', 'product_stock', PRODUCT), /disponible/);
  await db.query('update public.products set allocated = 4 where id = $1', [PRODUCT]);
  await db.query('update public.products set capacity = 5 where id = $1', [PRODUCT]);
  ok((await db.query('select count(*)::int as count from public.notification_outbox where product_id = $1', [PRODUCT])).rows[0].count === 1);
  await rejects(as('anon', (database) => database.query('select * from public.notification_signups')), /permission denied/);
  ok((await as('authenticated', (database) => database.query('select * from public.notification_signups'), '55555555-5555-4555-8555-555555555555')).rows.length === 0);
  ok((await as('authenticated', (database) => database.query('select * from public.notification_signups'), ADMIN)).rows.length === 1);

  // Global signups receive one job when a future event becomes published.
  await subscribe('shows@example.test', 'new_events');
  const globalSignup = (await db.query("select * from public.notification_signups where notification_type = 'new_events'")).rows[0];
  const newEvent = '66666666-6666-4666-8666-666666666666';
  await db.query("insert into public.events(id,title,date,status,city,venue) values ($1,'Presentación nueva','2099-11-15','Borrador','Santo Domingo','Sala nueva')", [newEvent]);
  await db.query("update public.events set status = 'Publicado' where id = $1", [newEvent]);
  const eventJob = (await db.query('select * from public.notification_outbox where event_id = $1', [newEvent])).rows[0];
  ok(eventJob.signup_id === globalSignup.id && eventJob.status === 'pending');
  await db.query("update public.events set title = 'Presentación nueva · actualizada' where id = $1", [newEvent]);
  ok((await db.query('select count(*)::int as count from public.notification_outbox where event_id = $1', [newEvent])).rows[0].count === 1);

  // An admin can cancel the signup, which also suppresses its queued messages.
  await as('authenticated', (database) => database.query("update public.notification_signups set status = 'unsubscribed' where id = $1", [globalSignup.id]), ADMIN);
  ok((await db.query('select status from public.notification_outbox where id = $1', [eventJob.id])).rows[0].status === 'cancelled');
  await db.close();
  console.log(`Notification database: ${checks} assertions passed (RLS, opt-in, restock/event queues).`);
}

await run();
