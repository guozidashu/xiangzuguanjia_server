'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT, TEXT } = app.Sequelize;

  const OrgExpense = app.model.define('org_expenses', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
    project_id: { type: INTEGER, comment: '项目ID' },
    room_id: { type: INTEGER, comment: '房屋ID' },
    expense_type: { type: TINYINT, allowNull: false, comment: '1房东租金, 2运营成本, 3佣金/提成, 4维修/保洁, 5其他' },
    fee_item_id: { type: INTEGER, comment: '关联科目ID (支出科目)' },
    amount: { type: DECIMAL(10, 2), allowNull: false, comment: '支出金额' },
    payment_account_id: { type: INTEGER, comment: '支出账户ID' },
    pay_time: { type: DATE, comment: '实际支付时间' },
    status: { type: TINYINT, defaultValue: 1, comment: '0待付, 1已付, 2作废' },
    related_table: { type: STRING(50), comment: '关联业务表 (landlord_bills/external_expenses)' },
    related_id: { type: INTEGER, comment: '关联业务ID' },
    remark: { type: TEXT, comment: '备注' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'org_expenses',
  });

  OrgExpense.associate = function() {
    app.model.OrgExpense.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
    app.model.OrgExpense.belongsTo(app.model.Project, { foreignKey: 'project_id', as: 'project' });
    app.model.OrgExpense.belongsTo(app.model.Room, { foreignKey: 'room_id', as: 'room' });
    app.model.OrgExpense.belongsTo(app.model.OrgFeeItem, { foreignKey: 'fee_item_id', as: 'fee_item' });
    app.model.OrgExpense.belongsTo(app.model.PaymentAccount, { foreignKey: 'payment_account_id', as: 'account' });
  };

  return OrgExpense;
};
