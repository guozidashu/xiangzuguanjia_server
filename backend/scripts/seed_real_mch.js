'use strict';

const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '120.27.221.222',
    user: 'xiangzuguanjia',
    password: 'xiangzuguanjia',
    database: 'xiangzuguanjia',
  });

  try {
    console.log('--- 开始初始化生产环境测试数据 ---');

    // 1. 查找或创建演示机构
    const [orgs] = await connection.execute('SELECT id FROM orgs WHERE name = ?', ['享租演示机构']);
    let orgId;
    if (orgs.length === 0) {
      const [result] = await connection.execute(
        'INSERT INTO orgs (name, contact_name, contact_phone, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        ['享租演示机构', '演示管理员', '13888888888']
      );
      orgId = result.insertId;
      console.log(`✅ 创建新机构: ${orgId}`);
    } else {
      orgId = orgs[0].id;
      console.log(`ℹ️ 机构已存在: ${orgId}`);
    }

    // 2. 查找或更新支付账户
    const subMchId = '1731558683';
    const [accounts] = await connection.execute(
      'SELECT id FROM payment_accounts WHERE org_id = ? AND api_config LIKE ?',
      [orgId, `%${subMchId}%`]
    );

    if (accounts.length === 0) {
      await connection.execute(
        `INSERT INTO payment_accounts 
        (org_id, account_name, account_type, provider, is_profit_sharing, sharing_ratio, api_config, status, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          orgId, 
          '官方微信支付-生产测试', 
          1, 1, 1, 
          0.0015, 
          JSON.stringify({ sub_mch_id: subMchId }), 
          1
        ]
      );
      console.log(`✅ 创建支付账户成功, 关联商户号: ${subMchId}`);
    } else {
      console.log(`ℹ️ 支付账户已存在, ID: ${accounts[0].id}`);
    }

    console.log('\n--- 初始化完成 ---');
    console.log(`机构 ID: ${orgId}`);
    console.log(`测试时请在接口请求头或 Payload 中指定 org_id 为 ${orgId}`);

  } catch (err) {
    console.error('❌ 初始化失败:', err);
  } finally {
    await connection.end();
  }
}

run();
