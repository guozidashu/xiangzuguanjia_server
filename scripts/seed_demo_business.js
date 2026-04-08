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
    console.log('--- 开始注入全业务演示数据 ---');

    // 1. 获取或创建机构
    console.log('正在初始化机构...');
    let orgId;
    const [orgs] = await connection.execute('SELECT id FROM orgs WHERE name = ?', ['享租演示机构']);
    if (orgs.length === 0) {
      const [res] = await connection.execute(
        'INSERT INTO orgs (name, contact_person, contact_phone, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
        ['享租演示机构', '演示管理员', '13888888888']
      );
      orgId = res.insertId;
      console.log(`✅ 创建新机构: ${orgId}`);
    } else {
      orgId = orgs[0].id;
      console.log(`ℹ️ 使用现有机构: ${orgId}`);
    }

    // 2. 获取或创建收款账户
    console.log('正在初始化收款账户...');
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
        [orgId, '官方微信支付-分账演示', 1, 1, 1, 0.0015, JSON.stringify({ sub_mch_id: subMchId }), 1]
      );
      console.log('✅ 创建支付账户成功');
    }

    // 3. 创建演示项目 (Projects)
    console.log('正在创建项目...');
    const projectsData = [
      ['享租民治中心店', '深圳市龙华区民治大道101号'],
      ['享租白石龙公寓', '深圳市龙华区白石龙路202号'],
    ];
    const projectIds = [];
    for (const [name, address] of projectsData) {
      const [p] = await connection.execute('SELECT id FROM projects WHERE name = ? AND org_id = ?', [name, orgId]);
      if (p.length === 0) {
        const [res] = await connection.execute(
          'INSERT INTO projects (org_id, name, address, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [orgId, name, address]
        );
        projectIds.push(res.insertId);
      } else {
        projectIds.push(p[0].id);
      }
    }

    // 3. 创建房源 (Rooms)
    console.log('正在创建房源...');
    const roomIds = [];
    for (let i = 0; i < projectIds.length; i++) {
      for (let j = 1; j <= 5; j++) {
        const roomNumber = `${i + 1}0${j}`;
        const [r] = await connection.execute('SELECT id FROM rooms WHERE room_number = ? AND project_id = ?', [roomNumber, projectIds[i]]);
        if (r.length === 0) {
          const [res] = await connection.execute(
            'INSERT INTO rooms (org_id, project_id, room_number, rent_price, status, bedroom, parlor, bathroom, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [orgId, projectIds[i], roomNumber, 2500.00 + (j * 100), 0, 1, 0, 1]
          );
          roomIds.push(res.insertId);
        } else {
          roomIds.push(r[0].id);
        }
      }
    }

    // 4. 创建租客 (Tenants)
    console.log('正在创建租客...');
    const tenantsData = [
      ['张三', '13811112222'],
      ['李四', '13933334444'],
      ['王五', '13755556666'],
    ];
    const tenantIds = [];
    for (const [name, phone] of tenantsData) {
      const [t] = await connection.execute('SELECT id FROM tenants WHERE phone = ? AND org_id = ?', [phone, orgId]);
      if (t.length === 0) {
        const [res] = await connection.execute(
          'INSERT INTO tenants (org_id, name, phone, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
          [orgId, name, phone]
        );
        tenantIds.push(res.insertId);
      } else {
        tenantIds.push(t[0].id);
      }
    }

    // 5. 创建生效中的租约 (Leases) & 更新房源状态
    console.log('正在创建生效租约...');
    for (let i = 0; i < tenantIds.length; i++) {
        const targetRoomId = roomIds[i]; // 给前三个房间分配租客
        const [l] = await connection.execute('SELECT id FROM leases WHERE room_id = ? AND status = 1', [targetRoomId]);
        
        if (l.length === 0) {
            // 创建租约
            const [res] = await connection.execute(
                'INSERT INTO leases (org_id, room_id, tenant_id, rent_price, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [orgId, targetRoomId, tenantIds[i], 3000.00, '2024-04-01', '2025-03-31', 1]
            );
            const leaseId = res.insertId;

            // 更新房间状态为已租(1)
            await connection.execute('UPDATE rooms SET status = 1 WHERE id = ?', [targetRoomId]);

            // 6. 为每个租约创建初始账单 (Bills)
            console.log(`正在为租约 ${leaseId} 创建初始化账单...`);
            // 租金账单
            await connection.execute(
                'INSERT INTO bills (org_id, lease_id, tenant_id, room_id, bill_type, bill_period, amount_due, status, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [orgId, leaseId, tenantIds[i], targetRoomId, 1, '2024-04', 3000.00, 0, '2024-04-05']
            );
            // 押金账单
            await connection.execute(
                'INSERT INTO bills (org_id, lease_id, tenant_id, room_id, bill_type, bill_period, amount_due, status, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [orgId, leaseId, tenantIds[i], targetRoomId, 2, '首期押金', 3000.00, 0, '2024-04-01']
            );
        }
    }

    console.log('\n--- 全业务演示数据注入完成 ---');
    console.log(`- 项目: ${projectIds.length} 个`);
    console.log(`- 房源: ${roomIds.length} 间`);
    console.log(`- 租客: ${tenantIds.length} 名`);
    console.log(`- 生效租约: ${tenantIds.length} 份`);

  } catch (err) {
    console.error('❌ 数据注入失败:', err);
  } finally {
    await connection.end();
  }
}

run();
