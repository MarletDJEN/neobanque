export async function insertNotification(client, userId, title, message) {
  await client.query(
    `INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)`,
    [userId, title, message]
  );
}
