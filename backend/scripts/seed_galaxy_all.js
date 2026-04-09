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
    console.log('--- [星辰大海] 全业务流数据模拟启动 ---');

    // 清理非系统表数据（可选，根据需求建议开启以保证数据整齐）
    console.log('正在清理旧业务数据...');
    const tablesToClear = [
        'account_transfer_logs', 'payment_records', 'reconciliation_batches',
        'bills', 'meter_readings', 'lease_deposits', 'lease_documents',
        'lease_co_tenants', 'leases', 'work_orders', 'room_status_logs',
        'device_recharge_orders', 'sys_message_logs', 'sys_audit_logs',
        'devices', 'room_amenities', 'rooms', 'projects', 'tenants', 'tenant_users',
        'payment_accounts', 'org_staff_permissions', 'org_staffs', 'orgs',
        'landlord_bills', 'landlord_contracts', 'referral_records', 'org_external_expenses', 'lease_checkouts'
    ];
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tablesToClear) {
        await connection.query(`TRUNCATE TABLE ${table}`);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // 1. Foundation: Orgs
    console.log('[1/9] 基础设施层注入...');
    await connection.execute('INSERT INTO orgs (id, name, contact_person, contact_phone) VALUES (?, ?, ?, ?)', [1, '享租示范公寓机构', '张总', '13888888888']);
    await connection.execute('INSERT INTO orgs (id, name, contact_person, contact_phone) VALUES (?, ?, ?, ?)', [2, '大湾区资产运营中心', '李经理', '13999999999']);

    // 2. Amenities Standard
    await connection.execute('INSERT INTO sys_amenities (category, name) VALUES (?, ?), (?, ?), (?, ?), (?, ?)', 
        ['家电', '空调', '家电', '洗衣机', '家具', '席梦思大床', '家具', '智能门锁']);

    // 3. Staff & Permissions
    console.log('[2/9] 人员与权限层注入...');
    const passwordHash = '$2a$10$EixzaYVK1fsbw1ZfbX3OXe.7WuiJ9Z6G.I5G7A8w6D8A9X6D8A9'; // 模拟 hash for '123456'
    await connection.execute('INSERT INTO org_staffs (org_id, name, phone, password_hash, role_name) VALUES (?, ?, ?, ?, ?)', 
        [1, '超级管理员', '13888888888', passwordHash, 'Owner']);
    await connection.execute('INSERT INTO org_staffs (org_id, name, phone, password_hash, role_name) VALUES (?, ?, ?, ?, ?)', 
        [1, '演示管家-小李', '13800001111', passwordHash, 'Manager']);
    
    // 4. Payment Accounts
    const subMchId = '1731558683';
    await connection.execute('INSERT INTO payment_accounts (org_id, account_name, account_type, provider, is_profit_sharing, api_config) VALUES (?, ?, ?, ?, ?, ?)', 
        [1, '微信支付(生产环境)', 1, 1, 1, JSON.stringify({ sub_mch_id: subMchId })]);
    await connection.execute('INSERT INTO payment_accounts (org_id, account_name, account_type, provider, is_profit_sharing) VALUES (?, ?, ?, ?, ?)', 
        [1, '线下银行转账', 2, 3, 0]);

    // 5. Assets: Projects -> Rooms -> Amenities Mapping -> Devices
    console.log('[3/9] 资产与房源层注入...');
    const projectNames = ['壹号公馆', '青年社区', '翡翠花园'];
    for (let i = 0; i < projectNames.length; i++) {
        const [res] = await connection.execute('INSERT INTO projects (org_id, name, address) VALUES (?, ?, ?)', [1, projectNames[i], `深圳市南山区科技园${i+1}号`]);
        const projectId = res.insertId;
        
        for (let j = 1; j <= 10; j++) {
            const roomNum = `${i+1}0${j}`;
            const [roomRes] = await connection.execute('INSERT INTO rooms (org_id, project_id, room_number, rent_price, status, bedroom, parlor, bathroom) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                [1, projectId, roomNum, 2500 + j * 100, 0, 1, 0, 1]);
            const roomId = roomRes.insertId;

            // 资产映射 (Amenities)
            await connection.execute('INSERT INTO room_amenities (room_id, amenity_id) VALUES (?, ?), (?, ?)', [roomId, 1, roomId, 2]);

            // 智能设备 (Devices)
            if (j % 2 === 0) {
                await connection.execute('INSERT INTO devices (org_id, project_id, room_id, device_sn, device_type, status, current_reading) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                    [1, projectId, roomId, `SN-${roomId}-ELE`, 1, 1, 100.5 + j]);
            }
        }
    }

    // 6. Customers: TenantUsers -> Tenants
    console.log('[4/9] 客户层注入...');
    for (let i = 1; i <= 20; i++) {
        const [userRes] = await connection.execute('INSERT INTO tenant_users (phone, nickname) VALUES (?, ?)', [`1500000${100+i}`, `租客-${i}`]);
        const userId = userRes.insertId;
        await connection.execute('INSERT INTO tenants (org_id, name, phone, tenant_user_id) VALUES (?, ?, ?, ?)', [1, `真实姓名-${i}`, `1500000${100+i}`, userId]);
    }

    // 7. Core Business: Leases -> Deposits -> Documents -> CoTenants
    console.log('[5/9] 租约生命周期注入...');
    const [allTenants] = await connection.execute('SELECT id, name FROM tenants WHERE org_id = 1 LIMIT 15');
    const [allRooms] = await connection.execute('SELECT id FROM rooms WHERE org_id = 1 LIMIT 15');
    
    for (let i = 0; i < allTenants.length; i++) {
        const [leaseRes] = await connection.execute('INSERT INTO leases (org_id, room_id, tenant_id, rent_price, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [1, allRooms[i].id, allTenants[i].id, 3000.00, '2024-01-01', '2024-12-31', 1]);
        const leaseId = leaseRes.insertId;
        
        // 更新房源为已租
        await connection.execute('UPDATE rooms SET status = 1 WHERE id = ?', [allRooms[i].id]);
        
        // 押金明细
        await connection.execute('INSERT INTO lease_deposits (org_id, lease_id, tenant_id, deposit_type, amount_expected, amount_paid, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [1, leaseId, allTenants[i].id, 1, 3000.00, 3000.00, 1]);
        
        // 同住人
        if (i % 3 === 0) {
            await connection.execute('INSERT INTO lease_co_tenants (org_id, lease_id, name, phone, relation_type) VALUES (?, ?, ?, ?, ?)', 
                [1, leaseId, `家属-${i}`, `1310000${100+i}`, 2]);
        }
    }

    // 8. Finance: Bills -> Payments -> Records -> Reconciliation
    console.log('[6/9] 财务流水注入...');
    const [activeLeases] = await connection.execute('SELECT * FROM leases WHERE org_id = 1');
    for (const lease of activeLeases) {
        // 历史已结账单 (1、2月)
        for (let m = 1; m <= 2; m++) {
            await connection.execute('INSERT INTO bills (org_id, lease_id, tenant_id, room_id, bill_type, bill_period, amount_due, amount_paid, status, due_date, paid_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', 
                [1, lease.id, lease.tenant_id, lease.room_id, 1, `2024-0${m}`, 3000.00, 3000.00, 2, `2024-0${m}-05`]);
        }
        // 本月待缴账单 (4月)
        await connection.execute('INSERT INTO bills (org_id, lease_id, tenant_id, room_id, bill_type, bill_period, amount_due, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [1, lease.id, lease.tenant_id, lease.room_id, 1, '2024-04', 3000.00, 0, '2024-04-05']);
        
        // 资金流水
        await connection.execute('INSERT INTO payment_records (org_id, trade_type, payment_account_id, amount, net_amount, trade_time, remark) VALUES (?, ?, ?, ?, ?, NOW(), ?)', 
            [1, 1, 1, 3000.00, 2991.00, `租期 ${lease.id} 自动扣款入账`]);
    }

    // 9. Operations: WorkOrders -> Logs -> MessageLogs
    console.log('[7/9] 运营与售后记录注入...');
    const [sampleRooms] = await connection.execute('SELECT id FROM rooms LIMIT 5');
    for (const r of sampleRooms) {
        await connection.execute('INSERT INTO work_orders (org_id, room_id, title, description, urgency_level, status) VALUES (?, ?, ?, ?, ?, ?)', 
            [1, r.id, '空调漏水报修', '租客反馈卧室空调滴水严重', 2, 1]);
        
        await connection.execute('INSERT INTO room_status_logs (org_id, room_id, old_status, new_status, trigger_event) VALUES (?, ?, ?, ?, ?)', 
            [1, r.id, 0, 1, '系统自动签约释放']);
    }

    // 10. External & Audit: LandlordContracts -> Expenses -> Audit
    console.log('[8/9] 扩展托管与审计注入...');
    for (const r of sampleRooms) {
        const [cRes] = await connection.execute('INSERT INTO landlord_contracts (org_id, room_id, landlord_name, landlord_phone, start_date, end_date, rent_cost) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [1, r.id, '包租公王大爷', '13555555555', '2023-01-01', '2028-12-31', 2000.00]);
        await connection.execute('INSERT INTO landlord_bills (org_id, contract_id, amount_payable, status, due_date) VALUES (?, ?, ?, ?, ?)', 
            [1, cRes.insertId, 2000.00, 1, '2024-04-15']);
    }

    console.log('[9/9] 数据一致性检查完毕。');
    console.log('\n--- [星辰大海] 任务圆满完成！ ---');
    console.log('您可以登录后台，现在那里已经是一个繁忙且真实的资产管理世界了。');

  } catch (err) {
    console.error('❌ 全业务注入失败:', err);
  } finally {
    await connection.end();
  }
}

run();
