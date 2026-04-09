'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, TINYINT } = app.Sequelize;

  const Device = app.model.define('devices', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    project_id: { type: INTEGER, comment: '所属项目ID' },
    room_id: { type: INTEGER, comment: '关联房间ID' },
    device_sn: { type: STRING(100), allowNull: false, unique: true, comment: 'SN号' },
    yunding_id: { type: STRING(100), comment: '云丁设备UUID' },
    yunding_room_id: { type: STRING(100), comment: '云丁内部房间ID' },
    yunding_home_id: { type: STRING(100), comment: '云丁内部房源ID(home_id)' },
    device_type: { type: TINYINT, allowNull: false, comment: '1电表, 2水表, 3门锁' },
    status: { type: TINYINT, defaultValue: 1, comment: '0离线, 1在线, 2故障' },
    current_reading: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '当前读数' },
    balance: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '预付费余额' },
    current_price: { type: DECIMAL(10, 2), comment: '下发单价' },
    is_prepaid: { type: TINYINT, comment: '1预付, 2后付' },
    last_sync_time: { type: DATE, comment: '最后同步时间' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'devices',
  });

  Device.associate = function() {
    app.model.Device.belongsTo(app.model.Room, { foreignKey: 'room_id', as: 'room' });
  };

  return Device;
};
