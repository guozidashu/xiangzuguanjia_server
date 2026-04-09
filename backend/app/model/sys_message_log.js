'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TINYINT, JSON, TEXT } = app.Sequelize;

  const SysMessageLog = app.model.define('sys_message_logs', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, comment: '发起方ID' },
    tenant_user_id: { type: INTEGER, comment: '接收方ID' },
    phone: { type: STRING(20), comment: '目标手机' },
    msg_channel: { type: TINYINT, allowNull: false, comment: '1内站, 2模板, 3短信' },
    busi_type: { type: TINYINT, allowNull: false, comment: '1催缴, 2到期' },
    title: { type: STRING(150), allowNull: false, comment: '消息主标题' },
    content: { type: TEXT, allowNull: false, comment: '消息文本' },
    related_info: { type: JSON, comment: '附件参数' },
    send_status: { type: TINYINT, defaultValue: 0, comment: '网关状态' },
    read_status: { type: TINYINT, defaultValue: 0, comment: '阅读状态' },
    error_reason: { type: TEXT, comment: '错误明细' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'sys_message_logs',
    updatedAt: false,
  });

  return SysMessageLog;
};
