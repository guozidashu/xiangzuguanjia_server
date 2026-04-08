-- ----------------------------
-- Table structure for orgs (机构表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `orgs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT '机构名称',
  `logo` VARCHAR(255) DEFAULT NULL COMMENT '品牌图标',
  `contact_person` VARCHAR(50) DEFAULT NULL COMMENT '主要联系人',
  `contact_phone` VARCHAR(20) DEFAULT NULL COMMENT '商户联系电话',
  `sys_config` JSON DEFAULT NULL COMMENT '机构个性化业务规则配置(如宽限期/客服/滞纳金参数等)',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1正常, 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机构表 (SaaS 租户)';

-- ----------------------------
-- Table structure for projects (房源项目/小区表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `name` VARCHAR(100) NOT NULL COMMENT '项目/小区名称',
  `address` VARCHAR(255) DEFAULT NULL COMMENT '项目地址',
  `description` TEXT DEFAULT NULL COMMENT '描述',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='房源项目表';

-- ----------------------------
-- Table structure for rooms (房间/房源表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` INT NOT NULL COMMENT '所属项目ID',
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `manager_id` INT DEFAULT NULL COMMENT '当前责任管家ID(关联org_staffs)',
  `room_number` VARCHAR(50) NOT NULL COMMENT '房号',
  `building_name` VARCHAR(100) DEFAULT NULL COMMENT '楼栋名称 (可选)',
  `floor` INT DEFAULT NULL COMMENT '楼层',
  `bedroom` TINYINT DEFAULT 1 COMMENT '几室',
  `parlor` TINYINT DEFAULT 0 COMMENT '几厅',
  `bathroom` TINYINT DEFAULT 1 COMMENT '几卫',
  `rent_type` TINYINT DEFAULT NULL COMMENT '租赁类型: 1整租, 2合租, 3公寓',
  `area` DECIMAL(10, 2) DEFAULT NULL COMMENT '面积 (平米)',
  `orientation` TINYINT DEFAULT NULL COMMENT '朝向: 1东, 2南, 3西, 4北...',
  `decoration_level` TINYINT DEFAULT NULL COMMENT '装修程度: 1简装, 2精装, 3豪装',
  `rent_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '租金 (月)',
  `status` TINYINT DEFAULT 0 COMMENT '房源状态: 0空置, 1已租, 2预定, 3维修中, 4下架',
  `description` TEXT DEFAULT NULL COMMENT '房源描述',
  `images` JSON DEFAULT NULL COMMENT '图片列表 (JSON 阵列)',
  `amenities` JSON DEFAULT NULL COMMENT '配套设施 (JSON 阵列)',
  `default_electric_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '默认电费单价',
  `default_water_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '默认水费单价',
  `default_billing_type` TINYINT DEFAULT NULL COMMENT '默认计费方式: 1先付后用, 2先用后付',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_project` (`project_id`),
  INDEX `idx_org` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='房源/房间表';

-- ----------------------------
-- Table structure for tenants (租客表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `id_card` VARCHAR(20) DEFAULT NULL COMMENT '身份证号',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `tenant_user_id` INT DEFAULT NULL COMMENT '关联平台C端登录账号(对应tenant_users)，实现换号不断连',
  `gender` TINYINT DEFAULT NULL COMMENT '性别: 1男, 2女',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1正常, 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租客信息表';

-- ----------------------------
-- Table structure for leases (租约表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `leases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `manager_id` INT DEFAULT NULL COMMENT '签约归属管家ID(业绩所属关联org_staffs)',
  `room_id` INT NOT NULL COMMENT '关联房源ID',
  `tenant_id` INT NOT NULL COMMENT '关联租客ID',
  `previous_lease_id` INT DEFAULT NULL COMMENT '前序租约ID(用于串联续租/换房)',
  `change_type` TINYINT DEFAULT 0 COMMENT '租约来源: 0新签, 1续租, 2换房, 3调整',
  `rental_type` TINYINT DEFAULT 1 COMMENT '租赁类型: 1新租, 2续租',
  `rent_price` DECIMAL(10, 2) NOT NULL COMMENT '实际月租金',
  `payment_cycle` INT DEFAULT 1 COMMENT '支付周期(月): 1付1, 3付3, 12付12',
  `start_date` DATE NOT NULL COMMENT '租约开始日期',
  `end_date` DATE NOT NULL COMMENT '租约结束日期',
  `checkout_date` DATE DEFAULT NULL COMMENT '实际退房日期',
  `status` TINYINT DEFAULT 1 COMMENT '租约状态: 0待签约, 1生效中, 2已到期, 3已退租, 4违约退租, 5已取消',
  `electric_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '生效电费单价',
  `water_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '生效水费单价',
  `billing_type` TINYINT DEFAULT NULL COMMENT '生效计费方式: 1先付后用(预付), 2先用后付(后付)',
  `initial_electric_reading` DECIMAL(10, 2) DEFAULT NULL COMMENT '初始电表读数',
  `initial_water_reading` DECIMAL(10, 2) DEFAULT NULL COMMENT '初始水表读数',
  `allowed_payment_ids` JSON DEFAULT NULL COMMENT '指定允许的收款账户ID集合(如[1,3])',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_room` (`room_id`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租约详细表';

-- ----------------------------
-- Table structure for devices (智能设备表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `project_id` INT DEFAULT NULL COMMENT '所属小区ID',
  `room_id` INT DEFAULT NULL COMMENT '关联房间ID',
  `device_sn` VARCHAR(100) NOT NULL COMMENT '设备唯一序列号(SN)',
  `device_type` TINYINT NOT NULL COMMENT '设备类型: 1智能电表, 2智能水表, 3智能门锁',
  `status` TINYINT DEFAULT 1 COMMENT '设备状态: 0离线, 1在线, 2故障',
  `current_reading` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '当前读数',
  `balance` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '当前余额(适用于预付费表)',
  `current_price` DECIMAL(10, 2) DEFAULT NULL COMMENT '当前设备内下发的单价',
  `is_prepaid` TINYINT DEFAULT NULL COMMENT '硬件当前计费模式: 1预付, 2后付',
  `last_sync_time` DATETIME DEFAULT NULL COMMENT '最后通讯/同步时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_device_sn` (`device_sn`),
  INDEX `idx_org` (`org_id`),
  INDEX `idx_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能设备管理表';

-- ----------------------------
-- Table structure for bills (账单表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `lease_id` INT NOT NULL COMMENT '关联租约ID',
  `tenant_id` INT NOT NULL COMMENT '关联租客ID',
  `room_id` INT NOT NULL COMMENT '关联房间ID',
  `bill_type` TINYINT NOT NULL COMMENT '账单类型: 1租金, 2押金, 3电费, 4水费, 5物业费, 6其他杂费',
  `parent_bill_id` INT DEFAULT NULL COMMENT '拆分/分期来源的父账单ID',
  `batch_no` VARCHAR(50) DEFAULT NULL COMMENT '财务批次号(多期账单可共用)',
  `bill_period` VARCHAR(50) DEFAULT NULL COMMENT '账单期数(如: 2024-01)',
  `amount_due` DECIMAL(10, 2) NOT NULL COMMENT '应收金额',
  `amount_paid` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '已收金额',
  `status` TINYINT DEFAULT 0 COMMENT '支付状态: 0未支付, 1部分支付, 2已结清, 3作废',
  `review_status` TINYINT DEFAULT 1 COMMENT '审核状态: 0待审核, 1已生效(免审), 2已驳回',
  `due_date` DATE DEFAULT NULL COMMENT '最晚应缴日期',
  `paid_time` DATETIME DEFAULT NULL COMMENT '结清时间',
  `remark` TEXT DEFAULT NULL COMMENT '备注(如: 电费期初读数100,期末读数150)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_lease` (`lease_id`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务账单明细表';

-- ----------------------------
-- Table structure for lease_checkouts (退房结算单表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `lease_checkouts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `lease_id` INT NOT NULL COMMENT '关联租约ID',
  `checkout_type` TINYINT NOT NULL COMMENT '退房类型: 1到期正常退房, 2违约退房, 3协议提前退房, 4换房结转',
  `checkout_date` DATE NOT NULL COMMENT '退房结算日期',
  `final_electric_reading` DECIMAL(10, 2) DEFAULT NULL COMMENT '电表期末读数',
  `final_water_reading` DECIMAL(10, 2) DEFAULT NULL COMMENT '水表期末读数',
  `deposit_refundable` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '理论应退押金',
  `penalty_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '违约扣款',
  `damage_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '物品损耗扣款',
  `unpaid_bills_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '历史欠账抵扣',
  `final_refund_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '最终应给租客打款的总金额(负数为租客需补缴)',
  `review_status` TINYINT DEFAULT 0 COMMENT '审核流状态: 0待审核, 1财务已核准通过, 2已驳回',
  `remark` TEXT DEFAULT NULL COMMENT '退租清算备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_lease` (`lease_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退房财务结算单表';

-- ----------------------------
-- Table structure for payment_accounts (收款账户配置表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `payment_accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `account_name` VARCHAR(100) NOT NULL COMMENT '通道名称(如:官方微信支付, xxx银行企业账户)',
  `account_type` TINYINT NOT NULL COMMENT '收单形式: 1 API接口(线上), 2 人工核销(线下)',
  `provider` TINYINT NOT NULL COMMENT '服务商大类: 1 微信, 2 支付宝, 3 银联转账, 4 现金/其它',
  `api_config` JSON DEFAULT NULL COMMENT '接口密钥配置/线下收款开户行信息',
  `fee_rate` DECIMAL(8, 4) DEFAULT 0.0000 COMMENT '手续费率(例: 0.0060 为千分之六)',
  `fee_payer` TINYINT DEFAULT 1 COMMENT '手续费承担方: 1机构内部消化, 2由租客在外加支付',
  `status` TINYINT DEFAULT 1 COMMENT '通道状态: 1启用, 0停用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='组织动态收款配置表';

-- ----------------------------
-- Table structure for payment_records (资金交易流水表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `payment_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `trade_type` TINYINT NOT NULL COMMENT '流水类型: 1进账(收款), 2出账(退款)',
  `payment_account_id` INT DEFAULT NULL COMMENT '关联真正执行交易的收款通道ID',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT '实际交易金额(展示金额)',
  `handling_fee` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '第三方通道/银行所扣取的手续费',
  `net_amount` DECIMAL(10, 2) NOT NULL COMMENT '机构最终实际取得的净收益额',
  `related_bill_ids` VARCHAR(255) DEFAULT NULL COMMENT '本次交易核销的账单ID组合(多次账单合并)',
  `trade_no` VARCHAR(100) DEFAULT NULL COMMENT '第三方支付交易流水号(对账用)',
  `trade_time` DATETIME NOT NULL COMMENT '真实到账时间',
  `operator_id` INT DEFAULT NULL COMMENT '操作人/复核人ID',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_trade_time` (`trade_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务真实资金收支流水表';

-- ----------------------------
-- Table structure for room_status_logs (房源状态变动日志表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `room_status_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `room_id` INT NOT NULL COMMENT '关联房源ID',
  `old_status` TINYINT DEFAULT NULL COMMENT '原状态: 0空置, 1已租...',
  `new_status` TINYINT NOT NULL COMMENT '新状态',
  `trigger_event` VARCHAR(100) DEFAULT NULL COMMENT '触发事件(如: 人工下架, 自动释放)',
  `related_table` VARCHAR(50) DEFAULT NULL COMMENT '关联单据类型(如: lease_checkouts)',
  `related_id` INT DEFAULT NULL COMMENT '关联单据ID',
  `operator_id` INT DEFAULT NULL COMMENT '操作人ID(0代表系统自动)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_room` (`room_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='房源状态生命周期流水表';

-- ----------------------------
-- Table structure for lease_deposits (押金资金池/账本表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `lease_deposits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `lease_id` INT NOT NULL COMMENT '关联租约ID',
  `tenant_id` INT NOT NULL COMMENT '关联租客ID',
  `deposit_type` TINYINT NOT NULL COMMENT '押金科目: 1房屋押金, 2水电押金, 3钥匙门禁押金, 4其他',
  `amount_expected` DECIMAL(10, 2) NOT NULL COMMENT '应收金额(标准量)',
  `amount_paid` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '已收/实收金额',
  `amount_deducted` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '退租时因违约/欠费产生的抵扣消耗金额',
  `amount_refunded` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '退租时已成功原路退回的金额',
  `status` TINYINT DEFAULT 0 COMMENT '账本状态: 0待交齐, 1已交满(在押), 2部分抵扣, 3已结清退完',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_lease` (`lease_id`),
  INDEX `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租约专属多维度押金本';

-- ----------------------------
-- Table structure for tenant_users (租户 C 端登录账号表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `tenant_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `union_id` VARCHAR(100) DEFAULT NULL COMMENT '微信开放平台唯一标识(多端互通)',
  `openid` VARCHAR(100) DEFAULT NULL COMMENT '微信小程序/公众号下的唯一标识',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '绑定手机号(与 tenants 表的 phone 形成实际身份关联)',
  `nickname` VARCHAR(100) DEFAULT NULL COMMENT '微信昵称/显示名',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '头像地址',
  `status` TINYINT DEFAULT 1 COMMENT '账号状态: 1正常, 0冻结拉黑',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_phone` (`phone`),
  INDEX `idx_openid` (`openid`),
  INDEX `idx_union_id` (`union_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租客应用端登录账号体系';

-- ----------------------------
-- Table structure for meter_readings (设备抄表记录表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `meter_readings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `device_id` INT NOT NULL COMMENT '关联的硬件设备ID',
  `room_id` INT NOT NULL COMMENT '关联房源ID',
  `lease_id` INT DEFAULT NULL COMMENT '抄表时如果房间已被租，关联当时的租约ID',
  `meter_type` TINYINT NOT NULL COMMENT '计量表类型: 1电表, 2水表, 3气表',
  `reading_source` TINYINT DEFAULT 1 COMMENT '读数来源: 1手工输入, 2设备IoT直传, 3退租清算出具',
  `reading_value` DECIMAL(10, 2) NOT NULL COMMENT '本次抄表指针快照读数',
  `reading_date` DATETIME NOT NULL COMMENT '实际取数或填写的有效时间',
  `reading_images` JSON DEFAULT NULL COMMENT '表盘留档照片(如手工抄录可用于防客诉扯皮)',
  `related_bill_id` INT DEFAULT NULL COMMENT '系统根据此次抄表推算并出具的新账单ID',
  `operator_id` INT DEFAULT NULL COMMENT '抄表人/系统自动(0)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_device` (`device_id`),
  INDEX `idx_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能/传统水电设备抄表流水快照表';

-- ----------------------------
-- Table structure for reconciliation_batches (第三方财务对账批次单)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_batches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `payment_account_id` INT NOT NULL COMMENT '核对的是哪个支付通道(payment_accounts_id)',
  `batch_date` DATE NOT NULL COMMENT '核对的自然日批次(如 2024-04-07)',
  `system_trade_count` INT DEFAULT 0 COMMENT '我方系统名义记录的当日成功交易总笔数',
  `system_amount` DECIMAL(12, 2) DEFAULT 0.00 COMMENT '我方系统记账的当期净交易额',
  `channel_trade_count` INT DEFAULT 0 COMMENT '第三方或银行回单上的实际过账笔数',
  `channel_amount` DECIMAL(12, 2) DEFAULT 0.00 COMMENT '第三方或银行回单的实际结算金额',
  `diff_amount` DECIMAL(12, 2) DEFAULT 0.00 COMMENT '差异账款(系统-渠道)',
  `status` TINYINT DEFAULT 0 COMMENT '批次对账结果: 0未核对, 1账实完全相符(平), 2长款(存在差异), 3短款(存在差异), 4人工已强制抹平做账',
  `reconciled_by` INT DEFAULT NULL COMMENT '执行本次平账的财务操作员ID',
  `remark` TEXT DEFAULT NULL COMMENT '核销异常说明备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_account_date` (`payment_account_id`, `batch_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='财务日切总归集对账单';

-- ----------------------------
-- Table structure for lease_co_tenants (同住人信息及权限管理表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `lease_co_tenants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `lease_id` INT NOT NULL COMMENT '关联主体租约ID',
  `tenant_user_id` INT DEFAULT NULL COMMENT '如果同住人登录了App，关联其平台C端账号(下发门禁/报修权限)',
  `name` VARCHAR(50) NOT NULL COMMENT '同住人姓名',
  `id_card` VARCHAR(20) DEFAULT NULL COMMENT '身份证号',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '手机号',
  `gender` TINYINT DEFAULT NULL COMMENT '性别: 1男, 2女',
  `relation_type` TINYINT DEFAULT NULL COMMENT '与承租人关系: 1配偶, 2亲属, 3朋友, 4同事, 5其他',
  `status` TINYINT DEFAULT 1 COMMENT '在住状态: 1有效(在住), 0失效(已搬离/撤销权限)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_lease` (`lease_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租约附属同住人及设备授权体系';

-- ----------------------------
-- Table structure for sys_platform_configs (全平台级中央配置表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `sys_platform_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `config_key` VARCHAR(100) NOT NULL COMMENT '配置键名(如: wechat_miniprogram_appid)',
  `config_value` TEXT DEFAULT NULL COMMENT '配置值',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '用途备注',
  `updated_by` INT DEFAULT NULL COMMENT '操作超级管理员ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='SaaS平台全局核心技术配置底座表';

-- ----------------------------
-- Table structure for sys_message_logs (全局消息触达日志/通讯归档表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `sys_message_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT DEFAULT NULL COMMENT '发起方机构ID(0代表平台系统直发)',
  `tenant_user_id` INT DEFAULT NULL COMMENT '消息触达接收方C端用户ID',
  `phone` VARCHAR(20) DEFAULT NULL COMMENT '发送目标手机号(主要针对短信)',
  `msg_channel` TINYINT NOT NULL COMMENT '发送渠道: 1站内信, 2微信模板消息, 3手机短信',
  `busi_type` TINYINT NOT NULL COMMENT '业务预警类型: 1账单催缴, 2合约将到期, 3报修受理进度, 4密码变更通知',
  `title` VARCHAR(150) NOT NULL COMMENT '消息通知主标题',
  `content` TEXT NOT NULL COMMENT '文本体或模板所需JSON填充载荷',
  `related_info` JSON DEFAULT NULL COMMENT '业务跳转附加参数(如记录 {"bill_id": 123})',
  `send_status` TINYINT DEFAULT 0 COMMENT '触达网关状态: 0待发草稿, 1推送成功, 2三方网关抛错失败',
  `read_status` TINYINT DEFAULT 0 COMMENT '用户的阅读状态(针对站内信): 0未读, 1已读',
  `error_reason` TEXT DEFAULT NULL COMMENT '三方渠道(如微信/阿里云)返回的真实报错解析留档',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_tenant_user_status` (`tenant_user_id`, `read_status`),
  INDEX `idx_channel_send` (`msg_channel`, `send_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能化系统全信道触达日志总表';

-- ----------------------------
-- Table structure for org_staffs (机构内部员工与管家架构表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `org_staffs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `name` VARCHAR(50) NOT NULL COMMENT '员工姓名',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号(后台登录凭证)',
  `password_hash` VARCHAR(255) DEFAULT NULL COMMENT '登录密码哈希',
  `role_name` VARCHAR(50) DEFAULT NULL COMMENT '角色名称(如: 店长, 管家, 财务)',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1在职, 0离职冻结',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_phone_org` (`phone`, `org_id`),
  INDEX `idx_org` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机构内控管理与业绩归属人员库';

-- ----------------------------
-- Table structure for landlord_contracts (业主收房/托管底租合同表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `landlord_contracts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `project_id` INT DEFAULT NULL COMMENT '关联小区ID',
  `room_id` INT NOT NULL COMMENT '关联房源ID',
  `landlord_name` VARCHAR(50) NOT NULL COMMENT '原业主/大房东姓名',
  `landlord_phone` VARCHAR(20) NOT NULL COMMENT '联系方式',
  `id_card` VARCHAR(20) DEFAULT NULL COMMENT '业主身份证',
  `bank_account` VARCHAR(100) DEFAULT NULL COMMENT '机构向业主打款的银行卡号',
  `start_date` DATE NOT NULL COMMENT '收房合同开始日',
  `end_date` DATE NOT NULL COMMENT '收房合同结束日',
  `rent_cost` DECIMAL(10, 2) NOT NULL COMMENT '机构需付底租(成本)',
  `payment_cycle` INT DEFAULT 1 COMMENT '给业主的打款周期(月)',
  `free_rent_days` INT DEFAULT 0 COMMENT '免租期天数(摊销计算用)',
  `status` TINYINT DEFAULT 1 COMMENT '托管状态: 1托管中, 2已解约到期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='二房东包租底账/房东托管底表';

-- ----------------------------
-- Table structure for landlord_bills (机构对账业主应付账款表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `landlord_bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `contract_id` INT NOT NULL COMMENT '关联 landlord_contracts ID',
  `bill_period` VARCHAR(50) DEFAULT NULL COMMENT '结算期数格式',
  `amount_payable` DECIMAL(10, 2) NOT NULL COMMENT '机构应付金额(成本指出)',
  `amount_paid` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '机构已打款金额',
  `due_date` DATE DEFAULT NULL COMMENT '最晚应打款日期',
  `pay_time` DATETIME DEFAULT NULL COMMENT '实际打款时间',
  `status` TINYINT DEFAULT 0 COMMENT '结款状态: 0未付款, 1已付款, 2存在争议',
  `remark` TEXT DEFAULT NULL COMMENT '打款备注(如: 抵扣卫生费)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org_contract` (`org_id`, `contract_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机构对业主固定打款成本流水表';

-- ----------------------------
-- Table structure for lease_documents (租约合同附件管理表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `lease_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `lease_id` INT NOT NULL COMMENT '关联主租约ID',
  `doc_type` TINYINT DEFAULT 1 COMMENT '文档归档类型: 1原始主合同, 2租期/租金变动补充协议, 3退租清算协议, 4其他附件',
  `doc_name` VARCHAR(150) NOT NULL COMMENT '签署文件名称(如: 张三02室首次签约合同/续期补充件)',
  `file_url` VARCHAR(500) NOT NULL COMMENT '实际电子版PDF或图片影像的云端存储链接',
  `remark` TEXT DEFAULT NULL COMMENT '变更摘要或说明',
  `uploaded_by` INT DEFAULT NULL COMMENT '执行上传操作的管家ID',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_lease` (`lease_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='记录单租约生命周期下所有衍生合同文件的集散底座';

-- ----------------------------
-- Table structure for work_orders (租客报修与物业巡检工单表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `work_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `room_id` INT NOT NULL COMMENT '关联报修的房源ID',
  `lease_id` INT DEFAULT NULL COMMENT '提单所处的租期边界',
  `tenant_user_id` INT DEFAULT NULL COMMENT '发起报修的租客C端 ID (平台自动单为0或空)',
  `title` VARCHAR(100) NOT NULL COMMENT '工单简述',
  `description` TEXT NOT NULL COMMENT '工单详情',
  `images` JSON DEFAULT NULL COMMENT '报修现场图片证明(最多上传9张)',
  `urgency_level` TINYINT DEFAULT 1 COMMENT '紧急度: 1普通, 2重要, 3极其紧急(如漏水)',
  `status` TINYINT DEFAULT 0 COMMENT '进度状态: 0待接单, 1处理中, 2已上门完工, 3已取消',
  `assigned_worker_id` INT DEFAULT NULL COMMENT '被指派去修的师傅/管家的ID (关联 org_staffs)',
  `expect_time` DATETIME DEFAULT NULL COMMENT '租客期望上门时间',
  `completed_at` DATETIME DEFAULT NULL COMMENT '师傅最终结单时间',
  `expense_amount` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '本次报修产生的实际费用支出',
  `expense_payer` TINYINT DEFAULT NULL COMMENT '费用承担方: 1由机构承担, 2由原大房东承担, 3挂入账单由租客承担',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_room` (`room_id`),
  INDEX `idx_worker_status` (`assigned_worker_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能租后服务与履约工单中心';

-- ----------------------------
-- Table structure for device_recharge_orders (IoT设备预付费充值订单表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `device_recharge_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `device_id` INT NOT NULL COMMENT '被充值的硬件设备ID',
  `lease_id` INT DEFAULT NULL COMMENT '充值所在期间的关联租约ID',
  `tenant_user_id` INT DEFAULT NULL COMMENT '操作发起充值的C端用户ID',
  `recharge_amount` DECIMAL(10, 2) NOT NULL COMMENT '充值购买的金额(或度数额度)',
  `related_payment_id` INT DEFAULT NULL COMMENT '关联真实的 payment_records 资金流水凭证ID',
  `iot_sync_status` TINYINT DEFAULT 0 COMMENT '下发通信状态: 0待下发/失败待重试, 1已成功写入硬件, 2人工干预/中断取消',
  `out_trade_no` VARCHAR(100) DEFAULT NULL COMMENT '向三方硬件厂商系统发起的请求流水号',
  `remark` TEXT DEFAULT NULL COMMENT '备注或因下发失败记录日志追踪用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_device` (`device_id`),
  INDEX `idx_iot_status` (`iot_sync_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预付费水表电表的专属充值分发任务流单';

-- ----------------------------
-- Table structure for org_staff_permissions (员工个性化功能权限表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `org_staff_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `staff_id` INT NOT NULL COMMENT '关联 org_staffs ID',
  `permission_code` VARCHAR(50) NOT NULL COMMENT '权限唯一标识码(如: ROOM_EDIT, BILL_REVIEW, LEASE_DELETE)',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `idx_staff_perm` (`staff_id`, `permission_code`),
  INDEX `idx_org` (`org_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='扁平化员工功能指派表';

-- ----------------------------
-- Table structure for sys_audit_logs (系统全局敏感操作审计日志)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `sys_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `staff_id` INT DEFAULT NULL COMMENT '执行操作的人员ID',
  `table_name` VARCHAR(100) NOT NULL COMMENT '被修改的数据表名',
  `record_id` INT NOT NULL COMMENT '被修改的数据行ID',
  `action_type` VARCHAR(20) NOT NULL COMMENT '操作动作: INSERT, UPDATE, DELETE, LOGIN',
  `old_data` JSON DEFAULT NULL COMMENT '变更前原始数据快照(JSON)',
  `new_data` JSON DEFAULT NULL COMMENT '变更后最新数据报文(JSON)',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT '操作人来源IP',
  `user_agent` VARCHAR(255) DEFAULT NULL COMMENT '操作环境端标识',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_staff_time` (`staff_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关键数据变更溯源证据库';

-- ----------------------------
-- Table structure for sys_amenities (房源配套设施定义表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `sys_amenities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(50) NOT NULL COMMENT '分类: 家电配套, 家具配套, 公共设施',
  `name` VARCHAR(50) NOT NULL COMMENT '设施名称: 如 洗衣机, 冰箱, 床, 电梯',
  `icon` VARCHAR(255) DEFAULT NULL COMMENT '图标URL或代码',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 1有效, 0禁用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='全系统标准房源标签描述库';

-- ----------------------------
-- Table structure for room_amenities (房源配套映射关联表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `room_amenities` (
  `room_id` INT NOT NULL COMMENT '关联房源ID',
  `amenity_id` INT NOT NULL COMMENT '关联设施ID',
  PRIMARY KEY (`room_id`, `amenity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='房源设施点选记录';

-- ----------------------------
-- Table structure for referral_records (中介/推荐佣金归档表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `referral_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `lease_id` INT NOT NULL COMMENT '关联生效的租约ID',
  `referrer_name` VARCHAR(50) NOT NULL COMMENT '中介/推荐人姓名',
  `referrer_phone` VARCHAR(20) DEFAULT NULL COMMENT '联系电话',
  `commission_amount` DECIMAL(10, 2) NOT NULL COMMENT '应付佣金金额',
  `status` TINYINT DEFAULT 0 COMMENT '发放状态: 0待结算, 1已发放, 2已作废取消',
  `pay_time` DATETIME DEFAULT NULL COMMENT '发放打款时间',
  `remark` TEXT DEFAULT NULL COMMENT '发放凭证或备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org` (`org_id`),
  INDEX `idx_lease` (`lease_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='外部拓客佣金与返现成本追踪表';

-- ----------------------------
-- Table structure for org_external_expenses (通用运营与第三方支出表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `org_external_expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `project_id` INT DEFAULT NULL COMMENT '费用涉及小区(可选)',
  `room_id` INT DEFAULT NULL COMMENT '费用涉及房源(可选)',
  `expense_type` VARCHAR(50) NOT NULL COMMENT '开支类型: 1物业费, 2管理费, 3维修费, 4营销费',
  `amount` DECIMAL(12, 2) NOT NULL COMMENT '支付金额',
  `period` VARCHAR(50) DEFAULT NULL COMMENT '涉及账期 (如: 2024年二季度)',
  `payee_name` VARCHAR(100) DEFAULT NULL COMMENT '收款方(如: XX物业公司, XX开发商)',
  `status` TINYINT DEFAULT 0 COMMENT '支付状态: 0未支, 1已支',
  `pay_time` DATETIME DEFAULT NULL COMMENT '实际流出时间',
  `remark` TEXT DEFAULT NULL COMMENT '支出明细说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org_type` (`org_id`, `expense_type`),
  INDEX `idx_room` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='机构运营成本、物业与开发商费用支出台账';

-- ----------------------------
-- Table structure for account_transfer_logs (机构内部资金调拨与提现流水表)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `account_transfer_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `org_id` INT NOT NULL COMMENT '所属机构ID',
  `from_account_id` INT NOT NULL COMMENT '出账账户ID (源收款渠道)',
  `to_account_id` INT NOT NULL COMMENT '入账账户ID (目地归集渠道)',
  `amount` DECIMAL(12, 2) NOT NULL COMMENT '划转总金额',
  `handling_fee` DECIMAL(10, 2) DEFAULT 0.00 COMMENT '划转/提现产生的手续费成本',
  `net_amount` DECIMAL(12, 2) NOT NULL COMMENT '实际到达目的账户的净额',
  `transfer_date` DATE NOT NULL COMMENT '调拨发生的日期',
  `proof_image` VARCHAR(500) DEFAULT NULL COMMENT '打款凭证或提现截图',
  `operator_id` INT DEFAULT NULL COMMENT '执行调账的职员ID',
  `status` TINYINT DEFAULT 1 COMMENT '状态: 0申请中, 1已确认完成, 2失败驳回',
  `remark` TEXT DEFAULT NULL COMMENT '调账原因或备注',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_org_date` (`org_id`, `transfer_date`),
  INDEX `idx_from_to` (`from_account_id`, `to_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='追溯资金在机构内不同金融账户间流动的底账表';
