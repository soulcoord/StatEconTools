const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const XLSX = require('xlsx');

const DB_FILE = path.join(__dirname, 'data.db');
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 初始化 DB（若不存在就建立）
function initDb() {
  const first = !fs.existsSync(DB_FILE);
  const db = new sqlite3.Database(DB_FILE);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room TEXT NOT NULL,          -- A/B/C/D
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      m1_prev INTEGER DEFAULT 0,
      m1_curr INTEGER DEFAULT 0,
      m2_prev INTEGER DEFAULT 0,
      m2_curr INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 6,
      fixed_fee REAL DEFAULT 0,
      note TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);
  });
  return db;
}

const db = initDb();

// API: 取得某房間某年月紀錄或全部
app.get('/api/records', (req, res) => {
  const { room, year, month } = req.query;
  let q = 'SELECT * FROM readings WHERE 1=1';
  const params = [];
  if (room) { q += ' AND room = ?'; params.push(room); }
  if (year) { q += ' AND year = ?'; params.push(Number(year)); }
  if (month) { q += ' AND month = ?'; params.push(Number(month)); }
  q += ' ORDER BY year DESC, month DESC, room, id DESC';
  db.all(q, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: 新增或更新紀錄（如果有 id 則 update，沒有就 insert）
app.post('/api/records', (req, res) => {
  const r = req.body;
  if (r.id) {
    const sql = `UPDATE readings SET
      room = ?, year = ?, month = ?, m1_prev = ?, m1_curr = ?, m2_prev = ?, m2_curr = ?,
      unit_price = ?, fixed_fee = ?, note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`;
    const params = [r.room, r.year, r.month, r.m1_prev, r.m1_curr, r.m2_prev, r.m2_curr,
      r.unit_price, r.fixed_fee, r.note || '', r.id];
    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changed: this.changes });
    });
  } else {
    const sql = `INSERT INTO readings
      (room, year, month, m1_prev, m1_curr, m2_prev, m2_curr, unit_price, fixed_fee, note)
      VALUES (?,?,?,?,?,?,?,?,?,?)`;
    const params = [r.room, r.year, r.month, r.m1_prev, r.m1_curr, r.m2_prev, r.m2_curr,
      r.unit_price, r.fixed_fee, r.note || ''];
    db.run(sql, params, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    });
  }
});

// API: 刪除紀錄
app.delete('/api/records/:id', (req, res) => {
  db.run('DELETE FROM readings WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// API: 匯出 SQL dump（把 table 建表 SQL + INSERT 轉成純文字）
app.get('/export/sql', (req, res) => {
  // 產生簡單 dump：CREATE TABLE + INSERT values
  db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='readings'", [], (err, rows) => {
    if (err) return res.status(500).send('error');
    const create = rows[0] && rows[0].sql ? rows[0].sql : '';
    db.all('SELECT * FROM readings', [], (err2, dataRows) => {
      if (err2) return res.status(500).send('error2');
      let dump = '';
      dump += create + ';\n\n';
      for (const r of dataRows) {
        // 轉換 null 與字串處理
        const vals = [
          r.id,
          `'${String(r.room).replace(/'/g,"''")}'`,
          r.year,
          r.month,
          r.m1_prev ?? 0,
          r.m1_curr ?? 0,
          r.m2_prev ?? 0,
          r.m2_curr ?? 0,
          r.unit_price ?? 0,
          r.fixed_fee ?? 0,
          `'${String(r.note || '').replace(/'/g,"''")}'`,
          `'${r.updated_at || ''}'`
        ];
        dump += `INSERT INTO readings (id,room,year,month,m1_prev,m1_curr,m2_prev,m2_curr,unit_price,fixed_fee,note,updated_at) VALUES (${vals.join(',')});\n`;
      }
      res.setHeader('Content-disposition', 'attachment; filename=readings_dump.sql');
      res.setHeader('Content-Type', 'text/sql; charset=utf-8');
      res.send(dump);
    });
  });
});

// API: 匯出 Excel（選擇 year&month 或全部）
app.get('/export/excel', (req, res) => {
  const { year, month } = req.query;
  let q = 'SELECT * FROM readings';
  const params = [];
  if (year) { q += ' WHERE year = ?'; params.push(Number(year)); }
  if (month) {
    if (params.length === 0) q += ' WHERE month = ?';
    else q += ' AND month = ?';
    params.push(Number(month));
  }
  db.all(q, params, (err, rows) => {
    if (err) return res.status(500).send('err');
    // 轉成 worksheet
    const sheetData = [
      ['id','room','year','month','m1_prev','m1_curr','m2_prev','m2_curr','kwh1','kwh2','total_kwh','unit_price','energy_fee','fixed_fee','total_amount','note','updated_at']
    ];
    for (const r of rows) {
      const kwh1 = (r.m1_curr - r.m1_prev);
      const kwh2 = (r.m2_curr - r.m2_prev);
      const total = kwh1 + kwh2;
      const energy = total * r.unit_price;
      const totalAmount = energy + r.fixed_fee;
      sheetData.push([r.id, r.room, r.year, r.month, r.m1_prev, r.m1_curr, r.m2_prev, r.m2_curr, kwh1, kwh2, total, r.unit_price, energy, r.fixed_fee, totalAmount, r.note, r.updated_at]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'readings');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-disposition', 'attachment; filename=readings.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server started on', PORT);
});
