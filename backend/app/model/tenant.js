'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TINYINT } = app.Sequelize;

  const Tenant = app.model.define('tenants', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    name: { type: STRING(50), allowNull: false, comment: '租客姓名' },
    id_card: { type: STRING(20), comment: '身份证号' },
    phone: { type: STRING(20), allowNull: false, comment: '手机号' },
    tenant_user_id: { type: INTEGER, comment: '关联平台账号' },
    gender: { type: TINYINT, comment: '性别: 1男, 2女' },
    status: { type: TINYINT, defaultValue: 1, comment: '状态: 1正常, 0禁用' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'tenants',
  });

  Tenant.associate = function() {
    app.model.Tenant.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
    app.model.Tenant.belongsTo(app.model.TenantUser, { foreignKey: 'tenant_user_id', as: 'account' });
    app.model.Tenant.hasMany(app.model.Lease, { foreignKey: 'tenant_id', as: 'leases' });
  };

  return Tenant;
};
