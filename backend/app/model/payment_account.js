'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, JSON, TINYINT, DECIMAL } = app.Sequelize;

  const PaymentAccount = app.model.define('payment_accounts', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    account_name: { type: STRING(100), allowNull: false, comment: '账户名' },
    account_type: { type: TINYINT, allowNull: false, comment: '1 API, 2 线下' },
    provider: { type: TINYINT, allowNull: false, comment: '1微信, 2支付宝, 3银行, 4现金' },
    api_config: { type: JSON, comment: '配置' },
    fee_rate: { type: DECIMAL(8, 4), defaultValue: 0.0000, comment: '费率' },
    fee_payer: { type: TINYINT, defaultValue: 1, comment: '承担方' },
    is_profit_sharing: { type: TINYINT, defaultValue: 0, comment: '是否启用分账' },
    sharing_ratio: { type: DECIMAL(5, 4), defaultValue: 0.0015, comment: '平台分润比例' },
    balance: { type: DECIMAL(12, 2), defaultValue: 0.00, comment: '可用余额' },
    frozen_balance: { type: DECIMAL(12, 2), defaultValue: 0.00, comment: '冻结余额' },
    status: { type: TINYINT, defaultValue: 1, comment: '1启用, 0停用' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'payment_accounts',
  });

  return PaymentAccount;
};
