'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, DATE, DECIMAL, JSON, STRING, TINYINT, TEXT } = Sequelize;

    // 1. 创建 lease_versions 表 (租约版本表)
    await queryInterface.createTable('lease_versions', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true, comment: '版本ID' },
      org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '租约ID' },
      version_no: { type: INTEGER, defaultValue: 1, comment: '版本号' },
      change_type: { type: TINYINT, defaultValue: 0, comment: '变更类型: 0新签, 1续租, 2换房, 3调整, 4终止' },
      
      room_id: { type: INTEGER, allowNull: false, comment: '房间ID' },
      rent_price: { type: DECIMAL(10, 2), allowNull: false, comment: '月租金' },
      deposit_amount: { type: DECIMAL(10, 2), comment: '押金金额' },
      payment_cycle: { type: INTEGER, defaultValue: 1, comment: '付款周期(付几)' },
      start_date: { type: DATE, allowNull: false, comment: '版本生效日' },
      end_date: { type: DATE, allowNull: false, comment: '版本结束日' },
      
      electric_price: { type: DECIMAL(10, 2), comment: '电单价' },
      water_price: { type: DECIMAL(10, 2), comment: '水单价' },
      billing_type: { type: TINYINT, comment: '计费: 1预付, 2后付' },
      initial_electric_reading: { type: DECIMAL(10, 2), comment: '初始电读数' },
      initial_water_reading: { type: DECIMAL(10, 2), comment: '初始水读数' },
      allowed_payment_ids: { type: JSON, comment: '允许通道' },
      
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), comment: '创建时间' },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), comment: '更新时间' },
    });
    // 添加表备注 (MySQL 特有)
    await queryInterface.sequelize.query("ALTER TABLE lease_versions COMMENT = '租约版本历史表'");

    // 2. 创建 bill_adjustments 表 (账单调整表)
    await queryInterface.createTable('bill_adjustments', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true, comment: '调整ID' },
      org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
      bill_id: { type: INTEGER, allowNull: false, comment: '账单ID' },
      type: { type: TINYINT, comment: '调整类型: 1优惠, 2违约金, 3退款, 4手动' },
      amount: { type: DECIMAL(10, 2), allowNull: false, comment: '调整金额' },
      remark: { type: TEXT, comment: '备注' },
      operator_id: { type: INTEGER, comment: '操作人ID' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), comment: '创建时间' },
    });
    await queryInterface.sequelize.query("ALTER TABLE bill_adjustments COMMENT = '账单金额调整明细表'");

    // 3. 创建 lease_transfers 表 (换房记录表)
    await queryInterface.createTable('lease_transfers', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true, comment: '记录ID' },
      org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '租约ID' },
      from_room_id: { type: INTEGER, allowNull: false, comment: '原房间ID' },
      to_room_id: { type: INTEGER, allowNull: false, comment: '新房间ID' },
      transfer_date: { type: DATE, allowNull: false, comment: '换房日期' },
      fee: { type: DECIMAL(10, 2), defaultValue: 0, comment: '手续费' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'), comment: '创建时间' },
    });
    await queryInterface.sequelize.query("ALTER TABLE lease_transfers COMMENT = '租约换房事件记录表'");

    // 4. 修改 leases 表，增加 current_version_id
    await queryInterface.addColumn('leases', 'current_version_id', {
      type: INTEGER,
      comment: '当前生效版本ID',
      after: 'status'
    });

    // 5. 修改 bills 表，增加 lease_version_id
    await queryInterface.addColumn('bills', 'lease_version_id', {
      type: INTEGER,
      comment: '关联租约版本ID',
      after: 'lease_id'
    });

    // 6. 数据迁移：为现有租约创建第一个版本记录
    await queryInterface.sequelize.query(`
      INSERT INTO lease_versions (
        org_id, lease_id, version_no, change_type, 
        room_id, rent_price, deposit_amount, payment_cycle, 
        start_date, end_date, electric_price, water_price, 
        billing_type, initial_electric_reading, initial_water_reading, 
        allowed_payment_ids, remark, created_at, updated_at
      )
      SELECT 
        org_id, id, 1, change_type,
        room_id, rent_price, rent_price, payment_cycle, 
        start_date, end_date, electric_price, water_price, 
        billing_type, initial_electric_reading, initial_water_reading, 
        allowed_payment_ids, remark, created_at, updated_at
      FROM leases;
    `);

    // 7. 回填 leases.current_version_id
    await queryInterface.sequelize.query(`
      UPDATE leases l
      JOIN lease_versions lv ON lv.lease_id = l.id AND lv.version_no = 1
      SET l.current_version_id = lv.id;
    `);

    // 8. 回填 bills.lease_version_id
    await queryInterface.sequelize.query(`
      UPDATE bills b
      JOIN lease_versions lv ON lv.lease_id = b.lease_id AND lv.version_no = 1
      SET b.lease_version_id = lv.id;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('bills', 'lease_version_id');
    await queryInterface.removeColumn('leases', 'current_version_id');
    await queryInterface.dropTable('lease_transfers');
    await queryInterface.dropTable('bill_adjustments');
    await queryInterface.dropTable('lease_versions');
  }
};
