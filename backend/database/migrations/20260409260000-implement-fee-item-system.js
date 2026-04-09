'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TINYINT, DATE } = Sequelize;

    // 1. 创建 org_fee_items 表 (费用科目表)
    await queryInterface.createTable('org_fee_items', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      name: { type: STRING(50), allowNull: false, comment: '科目名称' },
      direction: { type: TINYINT, defaultValue: 1, comment: '1收入, 2支出' },
      system_type: { type: TINYINT, defaultValue: 0, comment: '是否系统预置(1是, 0否)' },
      bill_type_map: { type: TINYINT, comment: '映射的原 bill_type' },
      status: { type: TINYINT, defaultValue: 1, comment: '1启用, 0停用' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.sequelize.query("ALTER TABLE org_fee_items COMMENT = '组织费用科目(科目体系)'");

    // 2. 为 bills 表增加 fee_item_id
    await queryInterface.addColumn('bills', 'fee_item_id', {
      type: INTEGER,
      comment: '关联费用科目ID'
    });

    // 3. 数据初始化：为每个已有机构创建默认科目并回填 bills
    const [ orgs ] = await queryInterface.sequelize.query("SELECT id FROM orgs");
    
    const defaultItems = [
      { name: '租金', bill_type: 1, direction: 1 },
      { name: '押金', bill_type: 2, direction: 1 },
      { name: '电费', bill_type: 3, direction: 1 },
      { name: '水费', bill_type: 4, direction: 1 },
      { name: '物业费', bill_type: 5, direction: 1 },
      { name: '杂费', bill_type: 6, direction: 1 },
    ];

    for (const org of orgs) {
      for (const item of defaultItems) {
        // 插入科目
        await queryInterface.sequelize.query(`
          INSERT INTO org_fee_items (org_id, name, direction, system_type, bill_type_map)
          VALUES (${org.id}, '${item.name}', ${item.direction}, 1, ${item.bill_type})
        `);
        
        // 获取刚插入的 ID
        const [ inserted ] = await queryInterface.sequelize.query("SELECT LAST_INSERT_ID() as id");
        const feeItemId = inserted[0].id;

        // 回填该机构下对应类型的账单
        await queryInterface.sequelize.query(`
          UPDATE bills SET fee_item_id = ${feeItemId} 
          WHERE org_id = ${org.id} AND bill_type = ${item.bill_type}
        `);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('org_fee_items');
    await queryInterface.removeColumn('bills', 'fee_item_id');
  }
};
