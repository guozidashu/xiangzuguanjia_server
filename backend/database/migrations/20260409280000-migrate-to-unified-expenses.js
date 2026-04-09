'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 将现有的外部支出 (org_external_expenses) 迁移到统一支出表
    const [ externalExpenses ] = await queryInterface.sequelize.query(
      "SELECT id, org_id, project_id, room_id, amount, status, pay_time, remark, expense_type FROM org_external_expenses"
    );

    for (const exp of externalExpenses) {
      // 映射费用类型 (简单映射)
      let type = 2; // 默认运营成本
      if (exp.expense_type.includes('维修') || exp.expense_type.includes('保洁')) type = 4;
      
      // 尝试寻找匹配的科目 ID (支出的杂费科目)
      const [ items ] = await queryInterface.sequelize.query(
        `SELECT id FROM org_fee_items WHERE org_id = ${exp.org_id} AND name = '杂费' AND direction = 2 LIMIT 1`
      );
      const feeItemId = items.length > 0 ? items[0].id : null;

      await queryInterface.sequelize.query(`
        INSERT INTO org_expenses (org_id, project_id, room_id, expense_type, fee_item_id, amount, pay_time, status, related_table, related_id, remark)
        VALUES (${exp.org_id}, ${exp.project_id || 'NULL'}, ${exp.room_id || 'NULL'}, ${type}, ${feeItemId || 'NULL'}, ${exp.amount}, ${exp.pay_time ? `'${exp.pay_time.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'}, ${exp.status}, 'org_external_expenses', ${exp.id}, '${exp.remark || ''}')
      `);
    }

    // 2. 将现有的房东合约成本 (landlord_contracts) 迁移到统一支出表 (作为首笔支出记录)
    const [ landlordContracts ] = await queryInterface.sequelize.query(
      "SELECT id, org_id, project_id, room_id, rent_cost, start_date FROM landlord_contracts WHERE status = 1"
    );

    for (const contract of landlordContracts) {
      // 寻找或创建“房东租金”支出科目
      let [ items ] = await queryInterface.sequelize.query(
        `SELECT id FROM org_fee_items WHERE org_id = ${contract.org_id} AND name = '收房成本' AND direction = 2 LIMIT 1`
      );
      
      let feeItemId;
      if (items.length === 0) {
        await queryInterface.sequelize.query(`
          INSERT INTO org_fee_items (org_id, name, direction, system_type)
          VALUES (${contract.org_id}, '收房成本', 2, 1)
        `);
        const [ inserted ] = await queryInterface.sequelize.query("SELECT LAST_INSERT_ID() as id");
        feeItemId = inserted[0].id;
      } else {
        feeItemId = items[0].id;
      }

      await queryInterface.sequelize.query(`
        INSERT INTO org_expenses (org_id, project_id, room_id, expense_type, fee_item_id, amount, pay_time, status, related_table, related_id, remark)
        VALUES (${contract.org_id}, ${contract.project_id || 'NULL'}, ${contract.room_id}, 1, ${feeItemId}, ${contract.rent_cost}, '${contract.start_date.toISOString().slice(0, 19).replace('T', ' ')}', 1, 'landlord_contracts', ${contract.id}, '合约初始化成本导入')
      `);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("DELETE FROM org_expenses WHERE related_table IN ('org_external_expenses', 'landlord_contracts')");
  }
};
