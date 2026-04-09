'use strict';

module.exports = app => {
  const { INTEGER, DATE, DECIMAL, TINYINT, JSON } = app.Sequelize;

  const MeterReading = app.model.define('meter_readings', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    device_id: { type: INTEGER, allowNull: false, comment: '硬件ID' },
    room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
    lease_id: { type: INTEGER, comment: '签约期租约ID' },
    meter_type: { type: TINYINT, allowNull: false, comment: '1电, 2水, 3气' },
    reading_source: { type: TINYINT, defaultValue: 1, comment: '1人工, 2IoT, 3清算' },
    reading_value: { type: DECIMAL(10, 2), allowNull: false, comment: '读数快照' },
    reading_date: { type: DATE, allowNull: false, comment: '抄表时间' },
    reading_images: { type: JSON, comment: '照片' },
    related_bill_id: { type: INTEGER, comment: '关联账单ID' },
    operator_id: { type: INTEGER, comment: '操作人' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'meter_readings',
    updatedAt: false,
  });

  return MeterReading;
};
