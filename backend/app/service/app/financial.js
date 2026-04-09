'use strict';

const Service = require('egg').Service;

class FinancialService extends Service {
  /**
   * 按状态查询个人账单列表 (跨机构聚合)
   * @param {Object} query - { status }
   */
  async myBills(query) {
    const { ctx } = this;
    const user_id = ctx.state.user.uid;
    const { status } = query;

    const tenants = await ctx.model.Tenant.findAll({
      where: { tenant_user_id: user_id },
      attributes: ['id'],
    });
    const tenant_ids = tenants.map(t => t.id);
    if (!tenant_ids || tenant_ids.length === 0) return [];

    const where = { tenant_id: tenant_ids };
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
    const user_id = ctx.state.user.uid;

    const bill = await ctx.model.Bill.findOne({
      where: { id },
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: { tenant_user_id: user_id }, 
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
  async listAvailableMethods(bill_id) {
    const { ctx } = this;
    const bill = await this.detail(bill_id);
    if (bill.status === 2) ctx.throw(400, '账单已支付');

    const lease = bill.lease;
    const allowed_ids = lease ? lease.allowed_payment_ids : null;

    const where = {
      org_id: bill.org_id,
      account_type: 1, // 仅允许线上支付 (1-API, 2-线下)
      status: 1,       // 已启用
    };

    if (allowed_ids && Array.isArray(allowed_ids) && allowed_ids.length > 0) {
      where.id = allowed_ids;
    }

    return await ctx.model.PaymentAccount.findAll({ where });
  }

  /**
   * 预准备支付订单 (支持合并支付 & 持久化记录)
   * @param {Array} bill_ids - 账单ID数组
   * @param {Number} account_id - 支付账户ID
   */
  async preparePayment(bill_ids, account_id) {
    const { ctx } = this;
    const user_id = ctx.state.user.uid;

    if (!Array.isArray(bill_ids) || bill_ids.length === 0) ctx.throw(400, '请选择要支付的账单');

    // 1. 获取账单详情并校验权限
    const bills = await ctx.model.Bill.findAll({
      where: { id: bill_ids },
      include: [
        { 
          model: ctx.model.Tenant, 
          as: 'tenant', 
          where: { tenant_user_id: user_id }, 
        },
      ],
    });

    if (bills.length !== bill_ids.length) ctx.throw(404, '部分账单不存在或无权访问');
    if (bills.some(b => b.status === 2)) ctx.throw(400, '选中的账单包含已支付项');

    const total_amount = bills.reduce((sum, b) => sum + (parseFloat(b.amount_due) - parseFloat(b.amount_paid)), 0).toFixed(2);
    const org_id = bills[0].org_id; // 假设合并支付必须属于同一机构

    // 2. 验证账户是否合法
    const account = await ctx.model.PaymentAccount.findOne({
      where: { id: account_id, org_id, account_type: 1, status: 1 }
    });
    if (!account) ctx.throw(404, '指定的支付通道不可用');

    return await ctx.model.transaction(async t => {
      // 3. 创建持久化支付订单 (PaymentOrder)
      const out_trade_no = `TRADE_${Date.now()}_${user_id}_${Math.floor(Math.random() * 1000)}`;
      
      const order = await ctx.model.PaymentOrder.create({
        org_id,
        tenant_user_id: user_id,
        pay_order_no: out_trade_no,
        pay_type: 1, // 账单合并支付
        amount: total_amount,
        status: 0,
        payment_account_id: account_id,
      }, { transaction: t });

      // 4. 创建子单明细 (PaymentOrderItem)
      for (const bill of bills) {
        await ctx.model.PaymentOrderItem.create({
          payment_order_id: order.id,
          bill_id: bill.id,
          related_type: 1,
          amount: parseFloat(bill.amount_due) - parseFloat(bill.amount_paid),
        }, { transaction: t });
      }

      // 5. 针对微信支付服务商模式发送请求
      if (account.provider === 1) {
        const sub_mch_id = account.api_config ? account.api_config.sub_mch_id : '';
        if (!sub_mch_id) ctx.throw(400, '该收款通道未配置子商户号');

        const user = await ctx.model.TenantUser.findByPk(user_id);
        
        try {
          const result = await ctx.service.common.wechatPay.createOrderSP({
            sub_mchid: sub_mch_id,
            description: `房产租赁账单支付-${bills.length}笔`,
            out_trade_no,
            amount: total_amount,
            payer_openid: user.openid,
          });

          // 回填微信 prepay_id
          await order.update({ prepay_id: result.package }, { transaction: t });

          return {
            payment_params: result,
            pay_order_no: out_trade_no,
          };
        } catch (err) {
          logger.error('Prepare Payment Error:', err);
          throw err;
        }
      }

      ctx.throw(400, '目前仅支持微信支付服务商模式');
    });
  }
}

module.exports = FinancialService;
