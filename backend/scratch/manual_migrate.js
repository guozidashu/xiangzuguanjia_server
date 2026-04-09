const Sequelize = require('sequelize');
const fs = require('fs');
const path = require('path');

// 1. 配置
const dbConfig = {
  dialect: 'mysql',
  host: '120.27.221.222',
  port: 3306,
  database: 'xiangzuguanjia',
  username: 'xiangzuguanjia',
  password: 'xiangzuguanjia',
  logging: false // 保持干净的输出
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  dialect: dbConfig.dialect,
  port: dbConfig.port,
  logging: false
});

async function run() {
  try {
    const queryInterface = sequelize.getQueryInterface();

    // 2. 确保 SequelizeMeta 表存在
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS SequelizeMeta (
        name VARCHAR(255) NOT NULL PRIMARY KEY
      ) ENGINE=InnoDB;
    `);

    // 3. 获取已存在的迁移
    const [executedMigrations] = await sequelize.query('SELECT name FROM SequelizeMeta');
    const executedNames = executedMigrations.map(m => m.name);

    // 4. 读取待执行的迁移
    const migrationDir = path.join(__dirname, '../database/migrations');
    const files = fs.readdirSync(migrationDir).sort();

    console.log('--- Starting Resilient Manual Migration ---');

    for (const file of files) {
      if (executedNames.includes(file)) {
        console.log(`[Skip] ${file} already in Meta.`);
        continue;
      }

      console.log(`[Executing] ${file} ...`);
      const migration = require(path.join(migrationDir, file));
      
      try {
        // 执行 UP 逻辑
        await migration.up(queryInterface, Sequelize);
        console.log(`[Success] ${file}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column name')) {
          console.warn(`[Warning] ${file} failed with Duplicate Column (already applied manually). Mark as success.`);
        } else if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY' || err.message.includes('check that column/key exists')) {
          console.warn(`[Warning] ${file} failed with Missing Column (already dropped manually). Mark as success.`);
        } else {
          console.error(`[Error] ${file} failed severely:`, err.message);
          throw err; // 严重错误暂停
        }
      }

      // 记入 Meta 表
      await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', {
        replacements: [file],
        type: Sequelize.QueryTypes.INSERT
      });
    }

    console.log('--- Migration Finished Successfully ---');
  } catch (err) {
    console.error('Migration Engine halted:', err);
  } finally {
    await sequelize.close();
  }
}

run();
