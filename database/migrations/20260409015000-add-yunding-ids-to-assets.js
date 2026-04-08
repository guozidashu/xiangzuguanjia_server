'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING } = Sequelize;

    // 1. 给 projects 表增加 yunding_id (home_id)
    await queryInterface.addColumn('projects', 'yunding_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁房源ID(home_id)',
    });

    // 2. 给 rooms 表增加 yunding_id (room_id)
    await queryInterface.addColumn('rooms', 'yunding_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁房间ID(room_id)',
    });

    // 3. 给 devices 表增加 yunding_id (uuid)
    await queryInterface.addColumn('devices', 'yunding_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁设备UUID',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('projects', 'yunding_id');
    await queryInterface.removeColumn('rooms', 'yunding_id');
    await queryInterface.removeColumn('devices', 'yunding_id');
  }
};
