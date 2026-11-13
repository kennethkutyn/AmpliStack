import assert from 'node:assert/strict';
import test from 'node:test';
import { newDb } from 'pg-mem';
import { updateOwnedDiagram } from './diagram-auth.js';

test('a link visitor cannot change a diagram owned by another user', async () => {
    const db = newDb();
    db.public.none(`CREATE TABLE diagrams (
        id INTEGER PRIMARY KEY,
        short_code TEXT UNIQUE NOT NULL,
        owner_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        state_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    db.public.none(`INSERT INTO diagrams (id, short_code, owner_id, title, state_json)
                    VALUES (1, 'testcode', 7, 'Original', '{}')`);
    const { Pool } = db.adapters.createPg();
    const pool = new Pool();

    const visitor = await updateOwnedDiagram(pool, {
        shortCode: 'testcode', userId: 8, title: 'Tampered', stateJson: { changed: true }
    });
    assert.equal(visitor.rows.length, 0);
    const afterVisitor = await pool.query('SELECT title, state_json FROM diagrams WHERE id = 1');
    assert.equal(afterVisitor.rows[0].title, 'Original');
    assert.deepEqual(afterVisitor.rows[0].state_json, {});

    const owner = await updateOwnedDiagram(pool, {
        shortCode: 'testcode', userId: 7, title: 'Owner edit', stateJson: { changed: true }
    });
    assert.equal(owner.rows.length, 1);
    assert.equal(owner.rows[0].title, 'Owner edit');
    assert.deepEqual(owner.rows[0].state_json, { changed: true });
    await pool.end();
});
