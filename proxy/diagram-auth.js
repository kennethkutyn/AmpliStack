export function updateOwnedDiagram(pool, { shortCode, userId, title, stateJson }) {
    return pool.query(
        `UPDATE diagrams SET title = $1, state_json = $2, updated_at = NOW()
         WHERE short_code = $3 AND owner_id = $4
         RETURNING *`,
        [title || 'Untitled Diagram', stateJson, shortCode, userId]
    );
}
