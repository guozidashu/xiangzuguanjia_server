'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DATE, DECIMAL, JSON, TEXT, TINYINT, DATEONLY } = Sequelize;

    // 1. Orgs (SaaS Tenants)
    await queryInterface.createTable('orgs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: STRING(100), allowNull: false, comment: '机构名称' },
      logo: { type: STRING(255), comment: '品牌图标' },
      contact_person: { type: STRING(50), comment: '主要联系人' },
      contact_phone: { type: STRING(20), comment: '商户联系电话' },
      sys_config: { type: JSON, comment: '机构个性化业务规则配置(如宽限期/客服/滞纳金参数等)' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态: 1正常, 0禁用' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '机构表 (SaaS 租户)' });

    // 2. Projects (Property Complexes)
    await queryInterface.createTable('projects', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      name: { type: STRING(100), allowNull: false, comment: '项目/小区名称' },
      address: { type: STRING(255), comment: '项目地址' },
      description: { type: TEXT, comment: '描述' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '房源项目表' });

    // 3. Rooms
    await queryInterface.createTable('rooms', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      project_id: { type: INTEGER, allowNull: false, comment: '所属项目ID' },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      manager_id: { type: INTEGER, comment: '当前责任管家ID(关联org_staffs)' },
      room_number: { type: STRING(50), allowNull: false, comment: '房号' },
      building_name: { type: STRING(100), comment: '楼栋名称 (可选)' },
      floor: { type: INTEGER, comment: '楼层' },
      bedroom: { type: TINYINT, defaultValue: 1, comment: '几室' },
      parlor: { type: TINYINT, defaultValue: 0, comment: '几厅' },
      bathroom: { type: TINYINT, defaultValue: 1, comment: '几卫' },
      rent_type: { type: TINYINT, comment: '租赁类型: 1整租, 2合租, 3公寓' },
      area: { type: DECIMAL(10, 2), comment: '面积 (平米)' },
      orientation: { type: TINYINT, comment: '朝向: 1东, 2南, 3西, 4北...' },
      decoration_level: { type: TINYINT, comment: '装修程度: 1简装, 2精装, 3豪装' },
      rent_price: { type: DECIMAL(10, 2), comment: '租金 (月)' },
      status: { type: TINYINT, defaultValue: 0, comment: '房源状态: 0空置, 1已租, 2预定, 3维修中, 4下架' },
      description: { type: TEXT, comment: '房源描述' },
      images: { type: JSON, comment: '图片列表 (JSON 阵列)' },
      amenities: { type: JSON, comment: '配套设施 (JSON 阵列)' },
      default_electric_price: { type: DECIMAL(10, 2), comment: '默认电费单价' },
      default_water_price: { type: DECIMAL(10, 2), comment: '默认水费单价' },
      default_billing_type: { type: TINYINT, comment: '默认计费方式: 1先付后用, 2先用后付' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '房源/房间表' });

    // 4. Tenants
    await queryInterface.createTable('tenants', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      name: { type: STRING(50), allowNull: false, comment: '姓名' },
      id_card: { type: STRING(20), comment: '身份证号' },
      phone: { type: STRING(20), allowNull: false, comment: '手机号' },
      tenant_user_id: { type: INTEGER, comment: '关联平台C端登录账号(对应tenant_users)' },
      gender: { type: TINYINT, comment: '性别: 1男, 2女' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态: 1正常, 0禁用' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '租客信息表' });

    // 5. Tenant Users (C-end Accounts)
    await queryInterface.createTable('tenant_users', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      union_id: { type: STRING(100), unique: true, comment: '微信开放平台唯一标识' },
      openid: { type: STRING(100), unique: true, comment: '微信小程序唯一标识' },
      phone: { type: STRING(20), unique: true, comment: '绑定手机号' },
      nickname: { type: STRING(100), comment: '微信昵称' },
      avatar: { type: STRING(255), comment: '头像地址' },
      status: { type: TINYINT, defaultValue: 1, comment: '账号状态: 1正常, 0冻结拉黑' },
      last_login_time: { type: DATE, comment: '最后登录时间' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '租客应用端登录账号体系' });

    // 6. Leases
    await queryInterface.createTable('leases', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      manager_id: { type: INTEGER, comment: '签约归属管家ID' },
      room_id: { type: INTEGER, allowNull: false, comment: '关联房源ID' },
      tenant_id: { type: INTEGER, allowNull: false, comment: '关联租客ID' },
      previous_lease_id: { type: INTEGER, comment: '前序租约ID' },
      change_type: { type: TINYINT, defaultValue: 0, comment: '租约来源: 0新签, 1续租, 2换房, 3调整' },
      rental_type: { type: TINYINT, defaultValue: 1, comment: '租赁类型: 1新租, 2续租' },
      rent_price: { type: DECIMAL(10, 2), allowNull: false, comment: '实际月租金' },
      payment_cycle: { type: INTEGER, defaultValue: 1, comment: '支付周期(月)' },
      start_date: { type: DATE, allowNull: false, comment: '租约开始日期' },
      end_date: { type: DATE, allowNull: false, comment: '租约结束日期' },
      checkout_date: { type: DATE, comment: '实际退房日期' },
      status: { type: TINYINT, defaultValue: 1, comment: '租约状态: 1生效中, 2已到期, 3已退租, 4违约退租' },
      electric_price: { type: DECIMAL(10, 2), comment: '生效电费单价' },
      water_price: { type: DECIMAL(10, 2), comment: '生效水费单价' },
      billing_type: { type: TINYINT, comment: '生效计费方式: 1预付, 2后付' },
      initial_electric_reading: { type: DECIMAL(10, 2), comment: '初始电表读数' },
      initial_water_reading: { type: DECIMAL(10, 2), comment: '初始水表读数' },
      allowed_payment_ids: { type: JSON, comment: '指定允许的收款账户ID集合' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '租约详细表' });

    // 7. Bills
    await queryInterface.createTable('bills', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '关联租约ID' },
      tenant_id: { type: INTEGER, allowNull: false, comment: '关联租客ID' },
      room_id: { type: INTEGER, allowNull: false, comment: '关联房间ID' },
      bill_type: { type: TINYINT, allowNull: false, comment: '账单类型: 1租金, 2押金, 3电费, 4水费, 5物业费, 6其他' },
      parent_bill_id: { type: INTEGER, comment: '父账单ID' },
      batch_no: { type: STRING(50), comment: '财务批次号' },
      bill_period: { type: STRING(50), comment: '账单期数' },
      amount_due: { type: DECIMAL(10, 2), allowNull: false, comment: '应收金额' },
      amount_paid: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '已收金额' },
      status: { type: TINYINT, defaultValue: 0, comment: '支付状态: 0未支付, 1部分支付, 2已结清, 3作废' },
      review_status: { type: TINYINT, defaultValue: 1, comment: '审核状态: 0待审核, 1已生效' },
      due_date: { type: DATE, comment: '最晚应缴日期' },
      paid_time: { type: DATE, comment: '结清时间' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '财务账单明细表' });

    // 8. Payment Accounts
    await queryInterface.createTable('payment_accounts', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      account_name: { type: STRING(100), allowNull: false, comment: '通道名称' },
      account_type: { type: TINYINT, allowNull: false, comment: '收单形式: 1线上, 2线下' },
      provider: { type: TINYINT, allowNull: false, comment: '服务商: 1微信, 2支付宝, 3银行, 4现金' },
      api_config: { type: JSON, comment: '配置信息' },
      fee_rate: { type: DECIMAL(8, 4), defaultValue: 0.0000, comment: '手续费率' },
      fee_payer: { type: TINYINT, defaultValue: 1, comment: '费率承担方' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '组织动态收款配置表' });

    // 9. Payment Records
    await queryInterface.createTable('payment_records', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      trade_type: { type: TINYINT, allowNull: false, comment: '流水类型: 1进账, 2出账' },
      payment_account_id: { type: INTEGER, comment: '关联通道ID' },
      amount: { type: DECIMAL(10, 2), allowNull: false, comment: '交易金额' },
      handling_fee: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '手续费' },
      net_amount: { type: DECIMAL(10, 2), allowNull: false, comment: '净额' },
      related_bill_ids: { type: STRING(255), comment: '核销账单ID' },
      trade_no: { type: STRING(100), comment: '流水号' },
      trade_time: { type: DATE, allowNull: false, comment: '到账时间' },
      operator_id: { type: INTEGER, comment: '操作员ID' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '财务真实资金收支流水表' });

    // 10. Devices
    await queryInterface.createTable('devices', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      project_id: { type: INTEGER, comment: '所属小区ID' },
      room_id: { type: INTEGER, comment: '关联房间ID' },
      device_sn: { type: STRING(100), allowNull: false, unique: true, comment: '序列号' },
      device_type: { type: TINYINT, allowNull: false, comment: '类型: 1电表, 2水表, 3门锁' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态' },
      current_reading: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '当前读数' },
      balance: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '当前余额' },
      current_price: { type: DECIMAL(10, 2), comment: '下发单价' },
      is_prepaid: { type: TINYINT, comment: '硬件模式' },
      last_sync_time: { type: DATE, comment: '最后通信时间' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '智能设备管理表' });

    // 11. Lease Checkouts
    await queryInterface.createTable('lease_checkouts', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '关联租约ID' },
      checkout_type: { type: TINYINT, allowNull: false, comment: '退房类型: 1正常, 2违约, 3协议, 4结转' },
      checkout_date: { type: DATE, allowNull: false, comment: '结算日期' },
      final_electric_reading: { type: DECIMAL(10, 2), comment: '电末读数' },
      final_water_reading: { type: DECIMAL(10, 2), comment: '水末读数' },
      deposit_refundable: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '应退押金' },
      penalty_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '违约扣款' },
      damage_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '损坏扣款' },
      unpaid_bills_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '欠款抵扣' },
      final_refund_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '实际打款' },
      review_status: { type: TINYINT, defaultValue: 0, comment: '审核状态' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '退房财务结算单表' });

    // 12. Lease Deposits
    await queryInterface.createTable('lease_deposits', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '关联租约ID' },
      tenant_id: { type: INTEGER, allowNull: false, comment: '关联租客ID' },
      deposit_type: { type: TINYINT, allowNull: false, comment: '押金科目: 1房屋, 2水电, 3门锁, 4其他' },
      amount_expected: { type: DECIMAL(10, 2), allowNull: false, comment: '应收金额' },
      amount_paid: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '实收金额' },
      amount_deducted: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '抵扣金额' },
      amount_refunded: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '已退金额' },
      status: { type: TINYINT, defaultValue: 0, comment: '账本状态' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '租约专属多维度押金本' });

    // 13. Meter Readings
    await queryInterface.createTable('meter_readings', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      device_id: { type: INTEGER, allowNull: false, comment: '硬件ID' },
      room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
      lease_id: { type: INTEGER, comment: '期间租约ID' },
      meter_type: { type: TINYINT, allowNull: false, comment: '类型: 1电, 2水, 3气' },
      reading_source: { type: TINYINT, defaultValue: 1, comment: '来源: 1人工, 2IoT, 3清算' },
      reading_value: { type: DECIMAL(10, 2), allowNull: false, comment: '快照读数' },
      reading_date: { type: DATE, allowNull: false, comment: '时间' },
      reading_images: { type: JSON, comment: '照片证据' },
      related_bill_id: { type: INTEGER, comment: '关联账单ID' },
      operator_id: { type: INTEGER, comment: '操作人' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '智能/传统水电设备抄表流水快照表' });

    // 14. Org Staffs
    await queryInterface.createTable('org_staffs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      name: { type: STRING(50), allowNull: false, comment: '姓名' },
      phone: { type: STRING(20), allowNull: false, comment: '手机号' },
      password_hash: { type: STRING(255), comment: '密码哈希' },
      role_name: { type: STRING(50), comment: '角色' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '机构内控管理与业绩归属人员库' });

    // 15. Landlord Contracts
    await queryInterface.createTable('landlord_contracts', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      project_id: { type: INTEGER, comment: '小区ID' },
      room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
      landlord_name: { type: STRING(50), allowNull: false, comment: '房东姓名' },
      landlord_phone: { type: STRING(20), allowNull: false, comment: '房东电话' },
      id_card: { type: STRING(20), comment: '业主身份证' },
      bank_account: { type: STRING(100), comment: '业主卡号' },
      start_date: { type: DATE, allowNull: false, comment: '开始日' },
      end_date: { type: DATE, allowNull: false, comment: '结束日' },
      rent_cost: { type: DECIMAL(10, 2), allowNull: false, comment: '成本底租' },
      payment_cycle: { type: INTEGER, defaultValue: 1, comment: '周期' },
      free_rent_days: { type: INTEGER, defaultValue: 0, comment: '免租期' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '二房东包租底账/房东托管底表' });

    // 16. Reconciliation Batches
    await queryInterface.createTable('reconciliation_batches', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      payment_account_id: { type: INTEGER, allowNull: false, comment: '通道ID' },
      batch_date: { type: DATEONLY, allowNull: false, comment: '对账批次日' },
      system_trade_count: { type: INTEGER, defaultValue: 0, comment: '系统笔数' },
      system_amount: { type: DECIMAL(12, 2), defaultValue: 0.00, comment: '系统金额' },
      channel_trade_count: { type: INTEGER, defaultValue: 0, comment: '渠道笔数' },
      channel_amount: { type: DECIMAL(12, 2), defaultValue: 0.00, comment: '渠道金额' },
      diff_amount: { type: DECIMAL(12, 2), defaultValue: 0.00, comment: '差异额' },
      status: { type: TINYINT, defaultValue: 0, comment: '状态: 1相符, 2差异...' },
      reconciled_by: { type: INTEGER, comment: '财务员ID' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '财务日切总归集对账单' });

    // 17. Lease Co-Tenants
    await queryInterface.createTable('lease_co_tenants', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '主租约ID' },
      tenant_user_id: { type: INTEGER, comment: '关联账号' },
      name: { type: STRING(50), allowNull: false, comment: '姓名' },
      id_card: { type: STRING(20), comment: '身份证' },
      phone: { type: STRING(20), comment: '电话' },
      gender: { type: TINYINT, comment: '性别' },
      relation_type: { type: TINYINT, comment: '关系' },
      status: { type: TINYINT, defaultValue: 1, comment: '在住状态' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '租约附属同住人及设备授权体系' });

    // 18. Sys Platform Configs
    await queryInterface.createTable('sys_platform_configs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      config_key: { type: STRING(100), allowNull: false, unique: true, comment: '配置键名' },
      config_value: { type: TEXT, comment: '配置值' },
      remark: { type: STRING(255), comment: '备注' },
      updated_by: { type: INTEGER, comment: '更新人' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: 'SaaS平台全局核心技术配置底座表' });

    // 19. Sys Message Logs
    await queryInterface.createTable('sys_message_logs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, comment: '发起方ID' },
      tenant_user_id: { type: INTEGER, comment: '接收方ID' },
      phone: { type: STRING(20), comment: '目标电话' },
      msg_channel: { type: TINYINT, allowNull: false, comment: '渠道' },
      busi_type: { type: TINYINT, allowNull: false, comment: '预警类型' },
      title: { type: STRING(150), allowNull: false, comment: '标题' },
      content: { type: TEXT, allowNull: false, comment: '内容' },
      related_info: { type: JSON, comment: '业务跳转参数' },
      send_status: { type: TINYINT, defaultValue: 0, comment: '发送状态' },
      read_status: { type: TINYINT, defaultValue: 0, comment: '阅读状态' },
      error_reason: { type: TEXT, comment: '原因' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '智能化系统全信道触达日志总表' });

    // 20. Landlord Bills
    await queryInterface.createTable('landlord_bills', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      contract_id: { type: INTEGER, allowNull: false, comment: '底租合同ID' },
      bill_period: { type: STRING(50), comment: '结算期' },
      amount_payable: { type: DECIMAL(10, 2), allowNull: false, comment: '应付金额' },
      amount_paid: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '已付金额' },
      due_date: { type: DATEONLY, comment: '最晚日' },
      pay_time: { type: DATE, comment: '打款时间' },
      status: { type: TINYINT, defaultValue: 0, comment: '结款状态' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '机构对业主固定打款成本流水表' });

    // 21. Lease Documents
    await queryInterface.createTable('lease_documents', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '主租约ID' },
      doc_type: { type: TINYINT, defaultValue: 1, comment: '类型: 1合同, 2协议, 3附件' },
      doc_name: { type: STRING(150), allowNull: false, comment: '文件名' },
      file_url: { type: STRING(500), allowNull: false, comment: '存储链' },
      remark: { type: TEXT, comment: '说明' },
      uploaded_by: { type: INTEGER, comment: '管家ID' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '记录单租约生命周期下所有衍生合同文件的集散底座' });

    // 22. Work Orders
    await queryInterface.createTable('work_orders', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
      lease_id: { type: INTEGER, comment: '租期ID' },
      tenant_user_id: { type: INTEGER, comment: '发起人ID' },
      title: { type: STRING(100), allowNull: false, comment: '简述' },
      description: { type: TEXT, allowNull: false, comment: '详情' },
      images: { type: JSON, comment: '照片证据' },
      urgency_level: { type: TINYINT, defaultValue: 1, comment: '紧急度' },
      status: { type: TINYINT, defaultValue: 0, comment: '进度' },
      assigned_worker_id: { type: INTEGER, comment: '处理师傅ID' },
      expect_time: { type: DATE, comment: '期望时间' },
      completed_at: { type: DATE, comment: '完工时间' },
      expense_amount: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '费用' },
      expense_payer: { type: TINYINT, comment: '承担方' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '智能租后服务与履约工单中心' });

    // 23. Device Recharge Orders
    await queryInterface.createTable('device_recharge_orders', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      device_id: { type: INTEGER, allowNull: false, comment: '设备ID' },
      lease_id: { type: INTEGER, comment: '租约ID' },
      tenant_user_id: { type: INTEGER, comment: '用户ID' },
      recharge_amount: { type: DECIMAL(10, 2), allowNull: false, comment: '金额' },
      related_payment_id: { type: INTEGER, comment: '凭证ID' },
      iot_sync_status: { type: TINYINT, defaultValue: 0, comment: '下发状态' },
      out_trade_no: { type: STRING(100), comment: '外部单号' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    }, { comment: '预付费水表电表的专属充值分发任务流单' });

    // 24. Org Staff Permissions
    await queryInterface.createTable('org_staff_permissions', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      staff_id: { type: INTEGER, allowNull: false, comment: '员工ID' },
      permission_code: { type: STRING(50), allowNull: false, comment: '码' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '扁平化员工功能指派表' });

    // 25. Sys Audit Logs
    await queryInterface.createTable('sys_audit_logs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      staff_id: { type: INTEGER, comment: '人员ID' },
      table_name: { type: STRING(100), allowNull: false, comment: '表名' },
      record_id: { type: INTEGER, allowNull: false, comment: '行ID' },
      action_type: { type: STRING(20), allowNull: false, comment: '动作' },
      old_data: { type: JSON, comment: '旧快照' },
      new_data: { type: JSON, comment: '新报文' },
      ip_address: { type: STRING(50), comment: 'IP' },
      user_agent: { type: STRING(255), comment: '环境' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '关键数据变更溯源证据库' });

    // 26. Sys Amenities
    await queryInterface.createTable('sys_amenities', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      category: { type: STRING(50), allowNull: false, comment: '分类' },
      name: { type: STRING(50), allowNull: false, comment: '设施名称' },
      icon: { type: STRING(255), comment: '图标' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '全系统标准房源标签描述库' });

    // 27. Room Amenities
    await queryInterface.createTable('room_amenities', {
      room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
      amenity_id: { type: INTEGER, allowNull: false, comment: '设施ID' },
    }, { comment: '房源设施点选记录' });

    // 28. Referral Records
    await queryInterface.createTable('referral_records', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      lease_id: { type: INTEGER, allowNull: false, comment: '生效租约ID' },
      referrer_name: { type: STRING(50), allowNull: false, comment: '人姓名' },
      referrer_phone: { type: STRING(20), comment: '电话' },
      commission_amount: { type: DECIMAL(10, 2), allowNull: false, comment: '佣金' },
      status: { type: TINYINT, defaultValue: 0, comment: '状态' },
      pay_time: { type: DATE, comment: '日期' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '外部拓客佣金与返现成本追踪表' });

    // 29. Org External Expenses
    await queryInterface.createTable('org_external_expenses', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      project_id: { type: INTEGER, comment: '关系小区' },
      room_id: { type: INTEGER, comment: '关系房源' },
      expense_type: { type: STRING(50), allowNull: false, comment: '类型' },
      amount: { type: DECIMAL(12, 2), allowNull: false, comment: '支付金额' },
      period: { type: STRING(50), comment: '涉及账期' },
      payee_name: { type: STRING(100), comment: '收款方' },
      status: { type: TINYINT, defaultValue: 0, comment: '状态' },
      pay_time: { type: DATE, comment: '流出时间' },
      remark: { type: TEXT, comment: '明细' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '机构运营成本、物业与开发商费用支出台账' });

    // 30. Account Transfer Logs
    await queryInterface.createTable('account_transfer_logs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      from_account_id: { type: INTEGER, allowNull: false, comment: '出账ID' },
      to_account_id: { type: INTEGER, allowNull: false, comment: '入账ID' },
      amount: { type: DECIMAL(12, 2), allowNull: false, comment: '总金额' },
      handling_fee: { type: DECIMAL(10, 2), defaultValue: 0.00, comment: '手续费' },
      net_amount: { type: DECIMAL(12, 2), allowNull: false, comment: '净额' },
      transfer_date: { type: DATEONLY, allowNull: false, comment: '调拨日期' },
      proof_image: { type: STRING(500), comment: '截图凭证' },
      operator_id: { type: INTEGER, comment: '职员ID' },
      status: { type: TINYINT, defaultValue: 1, comment: '状态' },
      remark: { type: TEXT, comment: '备注' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '追溯资金在机构内不同金融账户间流动的底账表' });

    // 31. Room Status Logs
    await queryInterface.createTable('room_status_logs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      org_id: { type: INTEGER, allowNull: false, comment: '所属机构ID' },
      room_id: { type: INTEGER, allowNull: false, comment: '房源ID' },
      old_status: { type: TINYINT, comment: '原状态' },
      new_status: { type: TINYINT, allowNull: false, comment: '新状态' },
      trigger_event: { type: STRING(100), comment: '触发事件' },
      related_table: { type: STRING(50), comment: '关联单据类型' },
      related_id: { type: INTEGER, comment: '单据ID' },
      operator_id: { type: INTEGER, comment: '操作人' },
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    }, { comment: '房源状态生命周期流水表' });

    // Extra Indexes
    await queryInterface.addIndex('rooms', ['org_id']);
    await queryInterface.addIndex('leases', ['org_id', 'room_id', 'status']);
    await queryInterface.addIndex('bills', ['lease_id', 'status']);
    await queryInterface.addIndex('org_staffs', ['phone', 'org_id'], { unique: true });
    await queryInterface.addIndex('reconciliation_batches', ['payment_account_id', 'batch_date']);
    await queryInterface.addIndex('sys_audit_logs', ['org_id', 'table_name']);
  },

  async down(queryInterface, Sequelize) {
    // Drop all 31 tables in reverse order
    await queryInterface.dropTable('room_status_logs');
    await queryInterface.dropTable('account_transfer_logs');
    await queryInterface.dropTable('org_external_expenses');
    await queryInterface.dropTable('referral_records');
    await queryInterface.dropTable('room_amenities');
    await queryInterface.dropTable('sys_amenities');
    await queryInterface.dropTable('sys_audit_logs');
    await queryInterface.dropTable('org_staff_permissions');
    await queryInterface.dropTable('device_recharge_orders');
    await queryInterface.dropTable('work_orders');
    await queryInterface.dropTable('lease_documents');
    await queryInterface.dropTable('landlord_bills');
    await queryInterface.dropTable('sys_message_logs');
    await queryInterface.dropTable('sys_platform_configs');
    await queryInterface.dropTable('lease_co_tenants');
    await queryInterface.dropTable('reconciliation_batches');
    await queryInterface.dropTable('landlord_contracts');
    await queryInterface.dropTable('org_staffs');
    await queryInterface.dropTable('meter_readings');
    await queryInterface.dropTable('lease_deposits');
    await queryInterface.dropTable('lease_checkouts');
    await queryInterface.dropTable('devices');
    await queryInterface.dropTable('payment_records');
    await queryInterface.dropTable('payment_accounts');
    await queryInterface.dropTable('bills');
    await queryInterface.dropTable('leases');
    await queryInterface.dropTable('tenant_users');
    await queryInterface.dropTable('tenants');
    await queryInterface.dropTable('rooms');
    await queryInterface.dropTable('projects');
    await queryInterface.dropTable('orgs');
  }
};
