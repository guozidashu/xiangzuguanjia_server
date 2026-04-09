'use strict';
const Controller = require('egg').Controller;
class WechatController extends Controller {
  /**
   * 微信支付回调通知 (POST /api/app/wechat/notify)
   */
  async paymentNotify() {
    const { ctx, service, logger } = this;
    const headers = ctx.headers;
    const body = ctx.request.body;
    logger.info('Received WeChat Pay Notify:', body);
    try {
      // 1. 验签并解密数据
      const data = await service.common.wechatPay.handleNotify(headers, body);
      logger.info('Decrypted WeChat Pay Data:', data);

      // data 结构参考微信 V3 报文: { out_trade_no, transaction_id, trade_state, amount: { total, payer_total, currency, payer_currency } }
      if (data.trade_state === 'SUCCESS') {
        const out_trade_no = data.out_trade_no;
        const transaction_id = data.transaction_id;
        const total_amount = data.amount.total / 100; // 微信是分，转换成元

        // 2. 查找持久化订单及明细
        const order = await ctx.model.PaymentOrder.findOne({
          where: { pay_order_no: out_trade_no },
          include: [{ model: ctx.model.PaymentOrderItem, as: 'items' }]
        });

        if (!order) {
          logger.warn(`WeChat Pay Notify: Order ${out_trade_no} not found in DB!`);
          return;
        }

        if (order.status !== 0) {
          logger.info(`WeChat Pay Notify: Order ${out_trade_no} already processed (Status: ${order.status}).`);
          return;
        }

        // 3. 执行业务结算与对账 (启动事务)
        await ctx.model.transaction(async t => {
          // A. 更新订单主表状态
          await order.update({
            status: 1, // 已支付
            transaction_id: transaction_id,
            pay_time: new Date(),
          }, { transaction: t });

          // B. 寻找关联账户并锁定 (用于更新余额)
          const account = await ctx.model.PaymentAccount.findByPk(order.payment_account_id, { 
            transaction: t,
            lock: true // 悲观锁防并发
          });

          // C. 创建流水记录 (Audit Trail)
          const record = await ctx.model.PaymentRecord.create({
            org_id: order.org_id,
            trade_type: 1, // 进账
            payment_account_id: order.payment_account_id,
            amount: order.amount,
            net_amount: order.amount, // 初始不计费率
            trade_no: transaction_id,
            trade_time: new Date(),
            remark: `微信线上合并支付-单号:${out_trade_no}`,
          }, { transaction: t });

          // D. 遍历订单明细，逐一结算业务
          for (const item of order.items) {
            // 目前仅处理账单 (related_type = 1)
            if (item.related_type === 1 && item.bill_id) {
              const bill = await ctx.model.Bill.findByPk(item.bill_id, { transaction: t });
              if (bill && bill.status !== 2) {
                // 更新账单已付金额和状态
                await bill.update({
                  amount_paid: item.amount,
                  status: 2, // 已清
                  paid_time: new Date(),
                }, { transaction: t });

                // 建立流水与账单的核销关联
                await ctx.model.PaymentBillMap.create({
                  org_id: order.org_id,
                  payment_record_id: record.id,
                  bill_id: bill.id,
                  amount_applied: item.amount,
                }, { transaction: t });

                // [特殊逻辑] 如果是押金账单，同步更新押金本
                const feeItem = await ctx.model.OrgFeeItem.findByPk(bill.fee_item_id, { transaction: t });
                if (feeItem && feeItem.bill_type_map === 2) {
                  await ctx.model.LeaseDeposit.update(
                    { amount_paid: bill.amount_due, status: 1 },
                    { where: { lease_id: bill.lease_id, org_id: order.org_id }, transaction: t }
                  );
                }
              }
            }
          }

          // E. 同步账户余额 (Ledger Sync)
          if (account) {
            const new_balance = parseFloat(account.balance) + parseFloat(order.amount);
            await account.update({ balance: new_balance }, { transaction: t });
          }

          // F. 检查并执行平台分账逻辑
          if (account && account.is_profit_sharing === 1 && total_amount >= 10) {
            let shareAmount = order.amount * account.sharing_ratio;
            if (shareAmount > total_amount) shareAmount = total_amount;

            if (shareAmount > 0) {
              try {
                await ctx.service.common.wechatPay.startProfitSharing({
                  sub_mchid: account.api_config.sub_mch_id,
                  transaction_id: transaction_id,
                  total_amount: order.amount,
                  out_order_no: `SHARING_${Date.now()}_${order.id}`,
                  receivers: [
                    {
                      type: 'MERCHANT_ID',
                      account: this.config.wechatPay.sp_mchid,
                      amount: shareAmount,
                      description: `平台服务费-订单:${order.pay_order_no}`,
                    }
                  ]
                });
                logger.info(`Combined Profit sharing initiated for Order ${order.id}, amount: ${shareAmount}`);
              } catch (sharingError) {
                logger.error('Combined Profit sharing Error:', sharingError);
              }
            }
          }
        });
      }

      // 4. 返回微信要求的成功报文
      ctx.status = 200;
      ctx.body = { code: 'SUCCESS', message: 'OK' };
    } catch (err) {
      logger.error('WeChat Notify Error:', err);
      ctx.status = 500;
      ctx.body = { code: 'FAIL', message: err.message };
    }
  }
}

module.exports = WechatController;
