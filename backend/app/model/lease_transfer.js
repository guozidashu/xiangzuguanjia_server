'use strict';

module.exports = app => {
  const { INTEGER, DATE, DECIMAL, TEXT } = app.Sequelize;

  const LeaseTransfer = app.model.define('lease_transfers', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false },
    lease_id: { type: INTEGER, allowNull: false, comment: '关联租约ID' },
    from_room_id: { type: INTEGER, allowNull: false, comment: '原房间ID' },
    to_room_id: { type: INTEGER, allowNull: false, comment: '新房间ID' },
    transfer_date: { type: DATE, allowNull: false, comment: '换房日期' },
    fee: { type: DECIMAL(10, 2), defaultValue: 0, comment: '换房手续费' },
    remark: { type: TEXT, comment: '备注' },
    created_at: { type: DATE },
  }, {
    tableName: 'lease_transfers',
    updatedAt: false,
  });

  LeaseTransfer.associate = function() {
    app.model.LeaseTransfer.belongsTo(app.model.Lease, { foreignKey: 'lease_id', as: 'lease' });
    app.model.LeaseTransfer.belongsTo(app.model.Room, { foreignKey: 'from_room_id', as: 'from_room' });
    app.model.LeaseTransfer.belongsTo(app.model.Room, { foreignKey: 'to_room_id', as: 'to_room' });
  };

  return LeaseTransfer;
};
