'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TINYINT } = app.Sequelize;

  const OrgStaff = app.model.define('org_staffs', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false },
    name: { type: STRING(50), allowNull: false },
    phone: { type: STRING(20), allowNull: false },
    password_hash: STRING(255),
    role_name: STRING(50),
    status: { type: TINYINT, defaultValue: 1 },
    created_at: DATE,
    updated_at: DATE,
  }, {
    tableName: 'org_staffs',
  });

  OrgStaff.associate = function() {
    app.model.OrgStaff.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
  };

  return OrgStaff;
};
