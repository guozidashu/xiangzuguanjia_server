'use strict';

const Service = require('egg').Service;

class FinancialService extends Service {
  /**
   * 按状态查询个人账单列表 (跨机构聚合)
   * @param {Object} query - { status }
   */
  async myBills(query) {
    const { ctx } = this;
    const userId = ctx.state.user.uid;
    const { status } = query;

    const tenants = await ctx.model.Tenant.findAll({
      where: { tenant_user_id: userId },
      attributes: ['id'],
    });
    const tenantIds = tenants.map(t => t.id);
    if (!tenantIds || tenantIds.length === 0) return [];

    const where = { tenant_id: tenantIds };
    if (status !== undefined) {
      where.status = status; 
    }

    return await ctx.model.Bill.findAll({
      where,
      include: [
        { 
          model: ctx.model.Room, 
          as: 'room', 
          include: [{ model: ctx.model.Project, as: 'project' }]
        },
        { 
          model: ctx.model.Org, 
          as: 'organization', 
          attributes: ['name', 'logo']
        },
      ],
      order: [['due_date', 'ASC'], ['created_at', 'DESC']],
    });
  }

  /**
   * 查看账单详情
   */
  async detail(id) {
    const { ctx } = this;
    const userId = ctx.state.user.uid;

    const bill = await ctx.model.Bill.findOne({
      where: { id },
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: { tenant_user_id: userId }, 
        },
        { model: ctx.model.Room, as: 'room', include: [{ model: ctx.model.Project, as: 'project' }] },
        { model: ctx.model.Org, as: 'organization' },
        { model: ctx.model.Lease, as: 'lease' },
      ],
    });

    if (!bill) ctx.throw(404, '账单不存在或无权查看');
    return bill;
  }

  /**
   * 获取账单可用的支付方式 (仅限线上 & 白名单过滤)
   */
  async listAvailableMethods(billId) {
    const { ctx } = this;
    const bill = await this.detail(billId);
    if (bill.status === 2) ctx.throw(400, '账单已支付');

    const lease = bill.lease;
    const allowedIds = lease ? lease.allowed_payment_ids : null;

    const where = {
      org_id: bill.org_id,
      account_type: 1, // 仅允许线上支付 (1-API, 2-线下)
      status: 1,       // 已启用
    };

    if (allowedIds && Array.isArray(allowedIds) && allowedIds.length > 0) {
      where.id = allowedIds;
    }

    return await ctx.model.PaymentAccount.findAll({ where });
  }

  /**
   * 预准备支付订单
   */
  async preparePayment(billId, accountId) {
    const { ctx } = this;
    const bill = await this.detail(billId);
    
    // 验证账户是否合法且在线上范围内
    const account = await ctx.model.PaymentAccount.findOne({
      where: { id: accountId, org_id: bill.org_id, account_type: 1, status: 1 }
    });
    if (!account) ctx.throw(404, '指定的支付通道不可用');

    // 针对微信支付，且是服务商模式
    if (account.provider === 1) { // 1-微信
      const subMchId = account.api_config ? account.api_config.sub_mch_id : '';
      if (!subMchId) ctx.throw(400, '该收款通道未配置子商户号');

      const out_trade_no = `TRADE_${Date.now()}_${bill.id}`;
      // 获取用户 openid (来自 tenant_users 表)
      const user = await ctx.model.TenantUser.findByPk(ctx.state.user.uid);
      
      const result = await ctx.service.common.wechatPay.createOrderSP({
        sub_mchid: subMchId,
        description: `房产租赁账单支付-${bill.id}`,
        out_trade_no,
        amount: bill.amount_due - bill.amount_paid,
        payer_openid: user.openid,
      });

      return {
        payment_params: result,
        out_trade_no,
      };
    }

    ctx.throw(400, '目前仅支持微信支付服务商模式');
  }
}

module.exports = FinancialService;
