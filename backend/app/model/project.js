'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, TINYINT } = app.Sequelize;

  const Project = app.model.define('projects', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    name: { type: STRING(100), allowNull: false, comment: '项目/小区名称' },
    address: { type: STRING(255), comment: '项目地址' },
    description: { type: TEXT, comment: '项目描述' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'projects',
  });

  Project.associate = function() {
    app.model.Project.hasMany(app.model.Room, { foreignKey: 'project_id', as: 'rooms' });
    app.model.Project.belongsTo(app.model.Org, { foreignKey: 'org_id', as: 'organization' });
  };

  return Project;
};
