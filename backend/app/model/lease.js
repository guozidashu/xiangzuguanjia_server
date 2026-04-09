'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, JSON, TEXT, TINYINT } = app.Sequelize;

  const Lease = app.model.define('leases', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    manager_id: { type: INTEGER, comment: '签约管家ID' },
    room_id: { type: INTEGER, allowNull: false, comment: '房间ID' },
    tenant_id: { type: INTEGER, allowNull: false, comment: '租客ID' },
    
    // 以下原本在租约表的字段已全部移除，请通过 current_version 访问
    // rent_price, payment_cycle, start_date, end_date, etc.
    
    checkout_date: { type: DATE, comment: '实际退房日期' },
    status: { type: TINYINT, defaultValue: 1, comment: '状态: 0待生效, 1生效中, 2已到期, 3已解约' },
    current_version_id: { type: INTEGER, comment: '当前生效版本ID' },
    
    remark: { type: TEXT, comment: '备注' },
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
