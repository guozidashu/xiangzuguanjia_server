'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT, TEXT } = app.Sequelize;

  const LandlordContract = app.model.define('landlord_contracts', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    project_id: { type: INTEGER, comment: '小区ID' },
    room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
    landlord_name: { type: STRING(50), allowNull: false, comment: '业主姓名' },
    landlord_phone: { type: STRING(20), allowNull: false, comment: '电话' },
    id_card: { type: STRING(20), comment: '身份证' },
    bank_account: { type: STRING(100), comment: '打款账号' },
    start_date: { type: DATE, allowNull: false, comment: '开始日' },
    end_date: { type: DATE, allowNull: false, comment: '结束日' },
    rent_cost: { type: DECIMAL(10, 2), allowNull: false, comment: '收房成本' },
    payment_cycle: { type: INTEGER, defaultValue: 1, comment: '周期' },
    free_rent_days: { type: INTEGER, defaultValue: 0, comment: '免租期' },
    status: { type: TINYINT, defaultValue: 1, comment: '1正常, 2解约' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'landlord_contracts',
  });

  return LandlordContract;
};
