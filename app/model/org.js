'use strict';

module.exports = app => {
  const { STRING, INTEGER, JSON, DATE, TINYINT } = app.Sequelize;

  const Org = app.model.define('orgs', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: STRING(100), allowNull: false },
    logo: STRING(255),
    contact_person: STRING(50),
    contact_phone: STRING(20),
    sys_config: JSON,
    status: { type: TINYINT, defaultValue: 1 },
    created_at: DATE,
    updated_at: DATE,
  });

  return Org;
};
