const { pool } = require("../config/database");

const list = async () => (await pool.query("SELECT * FROM fruits ORDER BY fruit_name"))[0];
const findById = async (id) =>
  (await pool.query("SELECT * FROM fruits WHERE fruit_id = ?", [id]))[0][0];

// The fruit and its three empty stock rows are created together, or not at all.
const create = async (data) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      "INSERT INTO fruits (fruit_name, description, status) VALUES (?, ?, ?)",
      [data.fruitName, data.description || null, data.status || "ACTIVE"],
    );
    await connection.query(
      `INSERT INTO stock (fruit_id, packaging_size, available_quantity)
       SELECT ?, size, 0 FROM (SELECT 'SMALL' size UNION ALL SELECT 'MEDIUM' UNION ALL SELECT 'LARGE') sizes`,
      [result.insertId],
    );
    await connection.commit();
    return findById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
const update = async (id, data) => {
  await pool.query(
    "UPDATE fruits SET fruit_name = ?, description = ?, status = ? WHERE fruit_id = ?",
    [data.fruitName, data.description || null, data.status || "ACTIVE", id],
  );
  return findById(id);
};
const stock = async () =>
  (
    await pool.query(
      `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity
   FROM fruits f JOIN stock s ON s.fruit_id = f.fruit_id
   WHERE f.status = 'ACTIVE' ORDER BY f.fruit_name, FIELD(s.packaging_size, 'SMALL','MEDIUM','LARGE')`,
    )
  )[0];
// Low stock means below the threshold, matching the "falls below" wording shown in the app.
const lowStock = async (threshold) =>
  (
    await pool.query(
      `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity
   FROM stock s JOIN fruits f ON f.fruit_id = s.fruit_id
   WHERE f.status = 'ACTIVE' AND s.available_quantity < ?
   ORDER BY s.available_quantity, f.fruit_name, FIELD(s.packaging_size, 'SMALL','MEDIUM','LARGE')`,
      [threshold],
    )
  )[0];

module.exports = { list, findById, create, update, stock, lowStock };
