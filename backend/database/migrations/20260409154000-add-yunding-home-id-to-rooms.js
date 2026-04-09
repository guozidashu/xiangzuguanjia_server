'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING } = Sequelize;

    // 为 rooms 表增加 yunding_home_id (云丁所属一套房的 ID)
    await queryInterface.addColumn('rooms', 'yunding_home_id', {
      type: STRING(100),
      allowNull: true,
      comment: '云丁所属房源ID(home_id)',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('rooms', 'yunding_home_id');
  }
};
