'use strict';

module.exports = app => {
  const { STRING, INTEGER, DATE, TEXT, TINYINT } = app.Sequelize;

  const LeaseDocument = app.model.define('lease_documents', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
    lease_id: { type: INTEGER, allowNull: false, comment: '主租约ID' },
    doc_type: { type: TINYINT, defaultValue: 1, comment: '1主合同, 2补充, 3退租协议, 4附件' },
    doc_name: { type: STRING(150), allowNull: false, comment: '文件名' },
    file_url: { type: STRING(500), allowNull: false, comment: '云端地址' },
    remark: { type: TEXT, comment: '摘要' },
    uploaded_by: { type: INTEGER, comment: '上传人ID' },
    created_at: { type: DATE, defaultValue: app.Sequelize.literal('CURRENT_TIMESTAMP') },
  }, {
    tableName: 'lease_documents',
  });

  LeaseDocument.associate = function() {
    app.model.LeaseDocument.belongsTo(app.model.Lease, { foreignKey: 'lease_id', as: 'lease' });
  };

  return LeaseDocument;
};
