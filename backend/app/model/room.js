'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, DECIMAL, JSON, TEXT, TINYINT } = app.Sequelize;

  const Room = app.model.define('rooms', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    project_id: { type: INTEGER, allowNull: false, comment: '所属项目ID' },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    manager_id: { type: INTEGER, comment: '当前责任管家ID(关联org_staffs)' },
    room_number: { type: STRING(50), allowNull: false, comment: '房号' },
    building_name: { type: STRING(100), comment: '楼栋名称' },
    floor: { type: INTEGER, comment: '楼层' },
    bedroom: { type: TINYINT, defaultValue: 1, comment: '几室' },
    parlor: { type: TINYINT, defaultValue: 0, comment: '几厅' },
    bathroom: { type: TINYINT, defaultValue: 1, comment: '几卫' },
    rent_type: { type: TINYINT, comment: '租赁类型: 1整租, 2合租, 3公寓' },
    area: { type: DECIMAL(10, 2), comment: '面积 (平米)' },
    orientation: { type: TINYINT, comment: '朝向' },
    decoration_level: { type: TINYINT, comment: '装修程度' },
    rent_price: { type: DECIMAL(10, 2), comment: '租金 (月)' },
    status: { type: TINYINT, defaultValue: 0, comment: '房源状态: 0空置, 1已租, 2预定, 3维修中, 4下架' },
    description: { type: TEXT, comment: '房源描述' },
    images: { type: JSON, comment: '图片列表 (JSON)' },
    amenities: { type: JSON, comment: '配套设施 (JSON)' },
    default_electric_price: { type: DECIMAL(10, 2), comment: '默认电费单价' },
    default_water_price: { type: DECIMAL(10, 2), comment: '默认水费单价' },
    default_billing_type: { type: TINYINT, comment: '默认计费方式: 1预付, 2后付' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'rooms',
  });

  Room.associate = function () {
    app.model.Room.belongsTo(app.model.Project, { foreignKey: 'project_id', as: 'project' });
    app.model.Room.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
    app.model.Room.belongsTo(app.model.OrgStaff, { foreignKey: 'manager_id', as: 'manager' });
    
    // [NEW] 关联当前租约：用于列表页展示租客及租金信息
    app.model.Room.hasOne(app.model.Lease, { foreignKey: 'room_id', as: 'current_lease' });
  };

  return Room;
};
