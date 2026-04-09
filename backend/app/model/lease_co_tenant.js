'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TINYINT } = app.Sequelize;

  const LeaseCoTenant = app.model.define('lease_co_tenants', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    lease_id: { type: INTEGER, allowNull: false, comment: '主租约ID' },
    tenant_user_id: { type: INTEGER, comment: '同住人账号ID' },
    name: { type: STRING(50), allowNull: false, comment: '姓名' },
    id_card: { type: STRING(20), comment: '身份证' },
    phone: { type: STRING(20), comment: '手机号' },
    gender: { type: TINYINT, comment: '性别' },
    relation_type: { type: TINYINT, comment: '关系' },
    status: { type: TINYINT, defaultValue: 1, comment: '1有效, 0搬离' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'lease_co_tenants',
  });

  LeaseCoTenant.associate = function() {
    app.model.LeaseCoTenant.belongsTo(app.model.Lease, { foreignKey: 'lease_id', as: 'lease' });
  };

  return LeaseCoTenant;
};
