'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TINYINT } = app.Sequelize;

  const RoomStatusLog = app.model.define('room_status_logs', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    room_id: { type: INTEGER, allowNull: false, comment: '关联房源ID' },
    old_status: { type: TINYINT, comment: '原状态' },
    new_status: { type: TINYINT, allowNull: false, comment: '新状态' },
    trigger_event: { type: STRING(100), comment: '触发事件符 (如: ROOM_CREATE)' },
    related_table: { type: STRING(50), comment: '关联业务表' },
    related_id: { type: INTEGER, comment: '业务单据ID' },
    operator_id: { type: INTEGER, comment: '操作人UID' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'room_status_logs',
  });

  return RoomStatusLog;
};
