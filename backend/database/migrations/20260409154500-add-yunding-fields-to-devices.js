'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING } = Sequelize;

    // 1. 给 devices 表增加云丁房间和房源 ID
    await queryInterface.addColumn('devices', 'yunding_room_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁内部房间ID',
    });

    await queryInterface.addColumn('devices', 'yunding_home_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁内部房源ID(home_id)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('devices', 'yunding_room_id');
    await queryInterface.removeColumn('devices', 'yunding_home_id');
  }
};
