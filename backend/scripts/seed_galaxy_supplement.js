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
    console.log('--- [星辰大海] 辅助逻辑补完计划启动 ---');

    console.log('[1/4] 正在填充运营底层记录 (Config, Audit, Messages)...');
    
    // 1. Sys Platform Configs
    await connection.execute('INSERT IGNORE INTO sys_platform_configs (config_key, config_value, remark) VALUES (?, ?, ?)', 
        ['wechat_sp_appid', 'wxc6916a2a19e72014', '微信服务商AppID']);
    await connection.execute('INSERT IGNORE INTO sys_platform_configs (config_key, config_value, remark) VALUES (?, ?, ?)', 
        ['allow_sharing_max_ratio', '0.02', '允许的最大分账比例(2%)']);

    // 2. Sys Audit Logs
    await connection.execute('INSERT IGNORE INTO sys_audit_logs (org_id, staff_id, table_name, record_id, action_type, new_data) VALUES (?, ?, ?, ?, ?, ?)', 
        [1, 1, 'rooms', 5, 'UPDATE', JSON.stringify({ rent_price: 3200 })]);

    // 3. Sys Message Logs
    await connection.execute('INSERT IGNORE INTO sys_message_logs (org_id, tenant_user_id, phone, msg_channel, busi_type, title, content, send_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [1, 1, '13811112222', 2, 1, '催缴通知', '您的 4 月房租账单已出，请及时支付。', 1]);

    console.log('[2/4] 正在填充 IoT 与智能设备流水 (Readings, Recharges)...');
    
    // 4. Meter Readings
    const [devices] = await connection.execute('SELECT id, room_id, org_id FROM devices LIMIT 5');
    for (const dev of devices) {
        await connection.execute('INSERT IGNORE INTO meter_readings (org_id, device_id, room_id, meter_type, reading_value, reading_date) VALUES (?, ?, ?, ?, ?, ?)', 
            [dev.org_id, dev.id, dev.room_id, 1, 150.75, '2024-04-01 09:00:00']);
    }

    // 5. Device Recharge Orders
    if (devices.length > 0) {
        await connection.execute('INSERT IGNORE INTO device_recharge_orders (org_id, device_id, recharge_amount, iot_sync_status) VALUES (?, ?, ?, ?)', 
            [1, devices[0].id, 100.00, 1]);
    }

    console.log('[3/4] 正在填充财务扩展逻辑 (Referrals, Expenses, Checkouts)...');

    // 6. Referral Records (居间费/中介费)
    const [leases] = await connection.execute('SELECT id FROM leases LIMIT 3');
    if (leases.length > 0) {
        await connection.execute('INSERT IGNORE INTO referral_records (org_id, lease_id, referrer_name, referrer_phone, commission_amount, status) VALUES (?, ?, ?, ?, ?, ?)', 
            [1, leases[0].id, '贝壳找房-陈经纪', '13399990000', 1500.00, 0]); // 待发放
        await connection.execute('INSERT IGNORE INTO referral_records (org_id, lease_id, referrer_name, referrer_phone, commission_amount, status, pay_time) VALUES (?, ?, ?, ?, ?, ?, NOW())', 
            [1, leases[1].id, '链家-王小二', '13388881111', 1500.00, 1]); // 已发放
    }

    // 7. Org External Expenses (外部支出)
    await connection.execute('INSERT IGNORE INTO org_external_expenses (org_id, expense_type, amount, payee_name, status, pay_time) VALUES (?, ?, ?, ?, ?, NOW())', 
        [1, '物业费', 500.00, '万科物业', 1]);
    await connection.execute('INSERT IGNORE INTO org_external_expenses (org_id, expense_type, amount, payee_name, status) VALUES (?, ?, ?, ?, ?)', 
        [1, '维修费', 120.00, '水电工张师傅', 0]);

    // 8. Lease Checkouts (退租结算)
    if (leases.length > 2) {
        await connection.execute('INSERT IGNORE INTO lease_checkouts (org_id, lease_id, checkout_type, checkout_date, final_refund_amount, review_status) VALUES (?, ?, ?, ?, ?, ?)', 
            [1, leases[2].id, 1, '2024-03-31', 2500.00, 1]); // 结算单
    }

    console.log('[4/4] 正在填充财务对账与出款记录 (Transfers, Reconciliation)...');

    // 9. Account Transfer Logs (内部调拨/提现)
    await connection.execute('INSERT IGNORE INTO account_transfer_logs (org_id, from_account_id, to_account_id, amount, net_amount, transfer_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [1, 1, 2, 5000.00, 4995.00, '2024-04-07', 1]); // 提现记录

    // 10. Reconciliation Batches (财务日结对账单)
    await connection.execute('INSERT IGNORE INTO reconciliation_batches (org_id, payment_account_id, batch_date, status) VALUES (?, ?, ?, ?)', 
        [1, 1, '2024-04-07', 1]);

    // 11. Staff Permissions
    const [staffs] = await connection.execute('SELECT id FROM org_staffs LIMIT 2');
    for (const s of staffs) {
        await connection.execute('INSERT IGNORE INTO org_staff_permissions (org_id, staff_id, permission_code) VALUES (?, ?, ?)', 
            [1, s.id, 'BILL_VIEW']);
        await connection.execute('INSERT IGNORE INTO org_staff_permissions (org_id, staff_id, permission_code) VALUES (?, ?, ?)', 
            [1, s.id, 'LEASE_MANAGE']);
    }

    // 12. Lease Documents (合同附件)
    if (leases.length > 0) {
        await connection.execute('INSERT IGNORE INTO lease_documents (org_id, lease_id, doc_name, file_url) VALUES (?, ?, ?, ?)', 
            [1, leases[0].id, '标准租赁合同-V1', 'http://cdn.example.com/docs/lease_1_v1.pdf']);
    }

    console.log('\n--- [星辰大海] 辅助逻辑模拟圆满完成！ ---');
    console.log('现在数据库 31 张表已全线连通并充满数据。');

  } catch (err) {
    console.error('❌ 辅助注入失败:', err);
  } finally {
    await connection.end();
  }
}

run();
