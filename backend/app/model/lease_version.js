'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, JSON, TEXT, TINYINT } = app.Sequelize;

  const LeaseVersion = app.model.define('lease_versions', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true, comment: '版本ID' },
    org_id: { type: INTEGER, allowNull: false, comment: '机构ID' },
    lease_id: { type: INTEGER, allowNull: false, comment: '关联租约ID' },
    version_no: { type: INTEGER, defaultValue: 1, comment: '版本号' },
    change_type: { type: TINYINT, defaultValue: 0, comment: '变更类型: 0新签, 1续租, 2换房, 3调整, 4终止' },

    room_id: { type: INTEGER, allowNull: false, comment: '对应房间ID' },
    rent_price: { type: DECIMAL(10, 2), allowNull: false, comment: '租金' },
    deposit_amount: { type: DECIMAL(10, 2), comment: '押金金额' },
    payment_cycle: { type: INTEGER, defaultValue: 1, comment: '付款周期' },
    start_date: { type: DATE, allowNull: false, comment: '版本生效日' },
    end_date: { type: DATE, allowNull: false, comment: '版本结束日' },

    electric_price: { type: DECIMAL(10, 2), comment: '电单价' },
    water_price: { type: DECIMAL(10, 2), comment: '水单价' },
    billing_type: { type: TINYINT, comment: '计费: 1预付, 2后付' },
    initial_electric_reading: { type: DECIMAL(10, 2), comment: '起计电读数' },
    initial_water_reading: { type: DECIMAL(10, 2), comment: '起计水读数' },
    allowed_payment_ids: { type: JSON, comment: '允许支付通道' },

    remark: { type: TEXT, comment: '备注' },
    created_at: { type: DATE },
    updated_at: { type: DATE },
  }, {
    tableName: 'lease_versions',
  });

  LeaseVersion.associate = function() {
    app.model.LeaseVersion.belongsTo(app.model.Lease, { foreignKey: 'lease_id', as: 'lease' });
    app.model.LeaseVersion.belongsTo(app.model.Room, { foreignKey: 'room_id', as: 'room' });
    app.model.LeaseVersion.hasMany(app.model.Bill, { foreignKey: 'lease_version_id', as: 'bills' });
  };

  return LeaseVersion;
};
