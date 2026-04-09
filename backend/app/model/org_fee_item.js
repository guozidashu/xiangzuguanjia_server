'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TINYINT } = app.Sequelize;

  const OrgFeeItem = app.model.define('org_fee_items', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    name: { type: STRING(50), allowNull: false, comment: '科目名称' },
    direction: { type: TINYINT, defaultValue: 1, comment: '1收入, 2支出' },
    system_type: { type: TINYINT, defaultValue: 0, comment: '是否系统预置(1是, 0否)' },
    bill_type_map: { type: TINYINT, comment: '映射的原 bill_type' },
    status: { type: TINYINT, defaultValue: 1, comment: '1启用, 0停用' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'org_fee_items',
  });

  OrgFeeItem.associate = function() {
    app.model.OrgFeeItem.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
    app.model.OrgFeeItem.hasMany(app.model.Bill, { foreignKey: 'fee_item_id', as: 'bills' });
  };

  return OrgFeeItem;
};
