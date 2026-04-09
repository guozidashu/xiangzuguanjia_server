'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TEXT, TINYINT } = app.Sequelize;

  const BillAdjustment = app.model.define('bill_adjustments', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true, comment: '调整ID' },
    org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
    bill_id: { type: INTEGER, allowNull: false, comment: '账单ID' },
    type: { type: TINYINT, comment: '类型: 1优惠, 2违约金, 3退款, 4手动' },
    amount: { type: DECIMAL(10, 2), allowNull: false, comment: '调整金额' },
    remark: { type: TEXT, comment: '备注' },
    operator_id: { type: INTEGER, comment: '操作人' },
    created_at: { type: DATE },
  }, {
    tableName: 'bill_adjustments',
    updatedAt: false,
  });

  BillAdjustment.associate = function() {
    app.model.BillAdjustment.belongsTo(app.model.Bill, { foreignKey: 'bill_id', as: 'bill' });
    app.model.BillAdjustment.belongsTo(app.model.OrgStaff, { foreignKey: 'operator_id', as: 'operator' });
  };

  return BillAdjustment;
};
