'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const OrgStaffPermission = app.model.define('org_staff_permissions', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false },
    staff_id: { type: INTEGER, allowNull: false },
    permission_code: { type: STRING(50), allowNull: false },
    created_at: DATE,
  }, {
    tableName: 'org_staff_permissions',
  });

  return OrgStaffPermission;
};
