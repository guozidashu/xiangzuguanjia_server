'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, JSON } = app.Sequelize;

  const SysAuditLog = app.model.define('sys_audit_logs', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    staff_id: { type: INTEGER, comment: '操作员' },
    table_name: { type: STRING(100), allowNull: false, comment: '修改表名' },
    record_id: { type: INTEGER, allowNull: false, comment: '修改行ID' },
    action_type: { type: STRING(20), allowNull: false, comment: 'INSERT/UPDATE/DELETE' },
    old_data: { type: JSON, comment: '原快照' },
    new_data: { type: JSON, comment: '新报文' },
    ip_address: { type: STRING(50), comment: '源IP' },
    user_agent: { type: STRING(255), comment: 'UA描述' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'sys_audit_logs',
    updatedAt: false,
  });

  return SysAuditLog;
};
