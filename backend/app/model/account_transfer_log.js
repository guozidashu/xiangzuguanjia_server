'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT, TEXT, DATEONLY } = app.Sequelize;

  const AccountTransferLog = app.model.define('account_transfer_logs', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    from_account_id: { type: INTEGER, allowNull: false, comment: '出发账户ID' },
    to_account_id: { type: INTEGER, allowNull: false, comment: '目的账户ID' },
    amount: { type: DECIMAL(12, 2), allowNull: false, comment: '金额' },
    handling_fee: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '手续费' },
    net_amount: { type: DECIMAL(12, 2), allowNull: false, comment: '净额' },
    transfer_date: { type: DATEONLY, allowNull: false, comment: '划转日期' },
    proof_image: { type: STRING(500), comment: '凭证图片' },
    operator_id: { type: INTEGER, comment: '操作人' },
    status: { type: TINYINT, defaultValue: 1, comment: '状态' },
    remark: { type: TEXT, comment: '备注' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'account_transfer_logs',
    updatedAt: false,
  });

  return AccountTransferLog;
};
