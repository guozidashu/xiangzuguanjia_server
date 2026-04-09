'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { TINYINT } = Sequelize;

    // 更新 leases 表的 status 字段注释，对齐新标准
    // 标准：0待生效, 1生效中, 2已到期, 3已解约, 4已续租, 5已调整
    await queryInterface.changeColumn('leases', 'status', {
      type: TINYINT,
      defaultValue: 1,
      comment: '状态: 0待生效, 1生效中, 2已到期, 3已解约, 4已续租, 5已调整',
    });

    // 数据清洗（可选）：如果存在旧的 0 状态，目前保持其含义为待生效
    // await queryInterface.sequelize.query("UPDATE leases SET status = 1 WHERE status = 0"); 
    // 注意：除非明确旧数据 0 表示生效中，否则此处不建议自动刷数据，由业务逻辑在 sign 时处理。
  },

  async down(queryInterface, Sequelize) {
    const { TINYINT } = Sequelize;
    await queryInterface.changeColumn('leases', 'status', {
      type: TINYINT,
      defaultValue: 1,
      comment: '状态: 0待签约, 1生效中, 2期满, 3退租, 4违约',
    });
  }
};
