'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT } = app.Sequelize;

  const OrgExternalExpense = app.model.define('org_external_expenses', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    project_id: { type: INTEGER, comment: '涉及小区' },
    room_id: { type: INTEGER, comment: '涉及房源' },
    expense_type: { type: STRING(50), allowNull: false, comment: '物业/管理/维修费' },
    amount: { type: DECIMAL(12, 2), allowNull: false, comment: '金额' },
    period: { type: STRING(50), comment: '期数' },
    payee_name: { type: STRING(100), comment: '收款方' },
    status: { type: TINYINT, defaultValue: 1, comment: '1已付, 0未付' },
    pay_time: { type: DATE, comment: '支出时间' },
    remark: { type: STRING(255), comment: '备注' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'org_external_expenses',
    updatedAt: false,
  });

  return OrgExternalExpense;
};
