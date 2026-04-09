'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, JSON, TEXT, TINYINT } = app.Sequelize;

  const Lease = app.model.define('leases', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    manager_id: { type: INTEGER, comment: '签约管家ID' },
    room_id: { type: INTEGER, allowNull: false, comment: '房间ID' },
    tenant_id: { type: INTEGER, allowNull: false, comment: '租客ID' },
    previous_lease_id: { type: INTEGER, comment: '前序租约ID' },
    change_type: { type: TINYINT, defaultValue: 0, comment: '来源: 0新签, 1续租, 2换房, 3调整' },
    rental_type: { type: TINYINT, defaultValue: 1, comment: '1新租, 2续租' },
    rent_price: { type: DECIMAL(10, 2), allowNull: false, comment: '月租金' },
    payment_cycle: { type: INTEGER, defaultValue: 1, comment: '付几(周期)' },
    start_date: { type: DATE, allowNull: false, comment: '开始日期' },
    end_date: { type: DATE, allowNull: false, comment: '结束日期' },
    checkout_date: { type: DATE, comment: '实际退房日期' },
    status: { type: TINYINT, defaultValue: 1, comment: '状态: 0待生效, 1生效中, 2已到期, 3已解约, 4已续租, 5已调整' },
    electric_price: { type: DECIMAL(10, 2), comment: '电单价' },
    water_price: { type: DECIMAL(10, 2), comment: '水单价' },
    billing_type: { type: TINYINT, comment: '计费: 1预付, 2后付' },
    initial_electric_reading: { type: DECIMAL(10, 2), comment: '初始电读数' },
    initial_water_reading: { type: DECIMAL(10, 2), comment: '初始水读数' },
    allowed_payment_ids: { type: JSON, comment: '允许收款通道' },
    remark: { type: TEXT, comment: '备注' },
    current_version_id: { type: INTEGER, comment: '当前生效版本ID' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'leases',
  });

  Lease.associate = function () {
    app.model.Lease.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
    app.model.Lease.belongsTo(app.model.Room, { foreignKey: 'room_id', as: 'room' });
    app.model.Lease.belongsTo(app.model.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    app.model.Lease.belongsTo(app.model.OrgStaff, { foreignKey: 'manager_id', as: 'manager' });
    app.model.Lease.hasMany(app.model.Bill, { foreignKey: 'lease_id', as: 'bills' });
    app.model.Lease.hasMany(app.model.LeaseVersion, { foreignKey: 'lease_id', as: 'versions' });
    app.model.Lease.belongsTo(app.model.LeaseVersion, { foreignKey: 'current_version_id', as: 'current_version' });
    app.model.Lease.hasMany(app.model.LeaseDeposit, { foreignKey: 'lease_id', as: 'deposits' });
    app.model.Lease.hasMany(app.model.LeaseDocument, { foreignKey: 'lease_id', as: 'documents' });
    app.model.Lease.hasMany(app.model.LeaseCoTenant, { foreignKey: 'lease_id', as: 'co_tenants' });
  };

  return Lease;
};
