import express from "express";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import {
  TralsePostgreSQL,
  extractRows,
  getPostgres,
} from "@tralse/postgres-middleware";

const app = express();

const port = process.env.PORT || 3000;

const __dirname = dirname(fileURLToPath(import.meta.url));

// Serve static files from the "public" directory
app.use(express.static(join(__dirname, "public")));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const DBNAME = "main";

app.use(express.json());
app.use(TralsePostgreSQL(pool, DBNAME));

app.get("/hello", (req, res) => {
  res.send({ message: "Hello, World!" });
});

app.get("/username/:id", async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).send({ error: "Missing ID!" });

  let instance;

  try {
    instance = getPostgres(req, DBNAME);
    await instance.initializeConnection();
    const { rows } = await instance.query(
      `SELECT username FROM my_schema."Accounts" WHERE id=$1`,
      [id]
    );

    if (rows.length === 0)
      res.status(404).send({ error: `Username with id ${id} not found.` });

    return res.send(rows[0]);
  } catch (error) {
    res.status(500).send({ error: error.message });
  } finally {
    await instance.releaseConnection();
  }
});

app.get("/pressure/:payload", async (req, res) => {
  const id = 1;

  let { payload } = req.params;
  let { isParallel } = req.query;

  if (!payload) return res.status(400).send({ error: "Missing payload!" });

  let count = parseInt(payload);

  let sql = [];
  let params = [];

  while (count--) {
    sql.push(`SELECT username FROM my_schema."Accounts" WHERE id=$1`);
    params.push([id]);
  }

  let instance;

  try {
    instance = getPostgres(req, DBNAME);
    await instance.initializeConnection();

    /**
     * @type {pg.QueryResult<any>[]>}
     */
    const result = isParallel
      ? await instance.query(sql, params, { parallel: true })
      : await instance.query(sql, params);

    if (result[0].rowCount === 0)
      res.status(404).send({ error: `Username with id ${id} not found.` });

    const rows = extractRows(result);

    return res.send(rows);
  } catch (error) {
    res.status(500).send({ error: error.message });
  } finally {
    await instance.releaseConnection();
  }
});

app.post("/new", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).send({
      error: "Fields username and password are required to make this request.",
    });
  }

  let instance;
  let transaction;

  try {
    instance = getPostgres(req, DBNAME);
    await instance.initializeConnection();

    transaction = await instance.transaction();

    await transaction.init();

    let result;

    try {
      result = await transaction.query(
        `INSERT INTO my_schema."Accounts" (username, password) VALUES ($1, $2) RETURNING id;`,
        [username, password]
      );
    } catch (error) {
      if (error.code === "23505") {
        await transaction.rollback();
        return res.status(409).send({
          error:
            "Duplicate key error: A user with this username already exists.",
        });
      } else {
        throw err;
      }
    }

    await transaction.commit();

    const { id } = result.rows[0];

    res.send({ id });
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    res.status(500).send({ error: error.message });
  } finally {
    await instance.releaseConnection();
  }
});

app.patch("/edit", async (req, res) => {
  let { id, username, password } = req.body;

  if (!id) return res.status(400).send({ error: "Missing ID!" });

  let instance;
  let transaction;

  let sql = [];
  let params = [];
  let counter = 0;

  if (username) {
    sql.push(`username=$${++counter}`);
    params.push(username);
    username = username.trim();
  }
  if (password) {
    sql.push(`password=$${++counter}`);
    params.push(password);
    password = password.trim();
  }
  params.push(id);

  try {
    instance = getPostgres(req, DBNAME);
    await instance.initializeConnection();

    transaction = await instance.transaction();

    await transaction.init();

    /**
     * @type {pg.QueryResult<any>[]>}
     */
    const [result, _] = await transaction.query(
      [
        `SELECT username, password FROM my_schema."Accounts" WHERE id=$1`,
        `
        UPDATE my_schema."Accounts"
        SET
          ${sql.join(",")}
        WHERE id=$${++counter}
      `,
      ],
      [[id], params]
    );

    if (result.rowCount === 0) {
      await transaction.rollback();
      return res
        .status(404)
        .send({ error: `Username with id ${id} not found.` });
    }

    const { username: u, password: p } = result.rows[0];

    if (u === username) {
      await transaction.rollback();
      return res.status(409).send({ error: "Cannot change same username." });
    }
    if (p === password) {
      await transaction.rollback();
      return res.status(409).send({ error: "Cannot change same password." });
    }

    await transaction.commit();

    res.send("OK");
  } catch (error) {
    await transaction.rollback();
    res.status(500).send({ error: error.message });
  } finally {
    await instance.releaseConnection();
  }
});

app.delete("/delete", async (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    res.status(400).send({
      error: "Fields id and password are required to make this request.",
    });
  }

  let instance;
  let transaction;

  try {
    instance = getPostgres(req, DBNAME);
    await instance.initializeConnection();

    transaction = await instance.transaction();

    await transaction.init();

    const result = await transaction.query(
      `DELETE FROM my_schema."Accounts" WHERE id=$1 AND password=$2`,
      [id, password]
    );

    if (result.rowCount === 0) {
      await transaction.rollback();
      return res.status(404).send({
        error:
          "Deletion unsuccessful. It is either caused by a non-existing id or wrong password.",
      });
    }

    await transaction.commit();

    res.send("OK");
  } catch (error) {
    console.log(error);
    await transaction.rollback();
    res.status(500).send({ error: error.message });
  } finally {
    await instance.releaseConnection();
  }
});

process.on("exit", async (code) => {
  await pool.end();
  console.log(`Exited with code ${code}`);
});

export default app;
