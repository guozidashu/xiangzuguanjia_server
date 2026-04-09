

const platform = uni.getSystemInfoSync().platform

export default {
    desensitization(str, beginLen, endLen) { //脱敏
        function desensitizationMethods(str, beginLen, endLen) {
            var len = str.length;
            var firstStr = str.substr(0, beginLen);
            var lastStr = str.substr(endLen);
            var middleStr = str.substring(beginLen, len - Math.abs(endLen)).replace(/[\s\S]/ig, '*');
            return firstStr + middleStr + lastStr;
        };
        str = str + ""
        const len = str.length;
        if (!beginLen || !endLen) {
            // 智能手机号脱敏
            if (len === 11) return desensitizationMethods(str, 3, -4)

            // 智能身份证号脱敏
            if (len === 11) return desensitizationMethods(str, 2, -2)

            // 未匹配到可用的智能脱敏则使用通用截取方式脱敏
            return desensitizationMethods(str, 1, -2)
        } else {
            // 手动脱敏
            return desensitizationMethods(str, beginLen, endLen)
        }
    },
    format_num_data(str) {
        // 将字符串转换为数字
        let num = parseFloat(str);
        // 如果转换失败，返回原始字符串
        if (isNaN(num)) {
            return str;
        }
        // 将数字转换为字符串，并去除末尾的 0
        return num.toString().replace(/(?:\.0*|(\.\d*[1-9])0+)$/, '$1');
    },
    formatDFormatSunday(dateStr) {
        const date = new Date(dateStr.replace(/-/g, '/')); // 避免 Safari UTC 问题
        const today = new Date();
        const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
        // 判断是否为明天
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const isTomorrow = date.getFullYear() === tomorrow.getFullYear() && date.getMonth() === tomorrow.getMonth() && date.getDate() === tomorrow.getDate();

        const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        let dayOfWeek;
        if (isToday) {
            dayOfWeek = '今天';
        } else if (isTomorrow) {
            dayOfWeek = '明天';
        } else {
            dayOfWeek = `周${weekdays[date.getDay()]}`;
        }
        return {
            date: monthDay,
            day: dayOfWeek
        };
    },

    /**
     * 格式化日期 (YYYY-MM-DD)
     * - 支持 ISO 字符串（带 T）
     * - 支持普通日期字符串（自动替换 - 兼容 iOS）
     * - 支持时间戳数字与 Date 实例
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        let date;

        if (dateStr instanceof Date) {
            date = dateStr;
        } else if (typeof dateStr === 'number') {
            // 认为是时间戳
            date = new Date(dateStr);
        } else if (typeof dateStr === 'string') {
            // 纯数字字符串也按时间戳处理
            if (/^\d+$/.test(dateStr)) {
                date = new Date(Number(dateStr));
            } else {
                const normalized = dateStr.includes('T')
                    ? dateStr // ISO 字符串，直接交给 Date 解析
                    : dateStr.replace(/-/g, '/'); // 普通日期，兼容 iOS
                date = new Date(normalized);
            }
        } else {
            return '';
        }

        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 格式化日期时间 (YYYY-MM-DD HH:mm:ss)
     */
    formatDateTime(dateStr, showTime = true) {
        if (!dateStr) return '--';
        let date;
        if (typeof dateStr === 'string') {
            // 兼容 ISO 字符串和普通日期字符串
            const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(/-/g, '/');
            date = new Date(normalized);
        } else if (dateStr instanceof Date) {
            date = dateStr;
        } else if (typeof dateStr === 'number') {
            // 时间戳
            date = new Date(dateStr);
        } else {
            return '';
        }

        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateFormatted = `${year}-${month}-${day}`;
        if (!showTime) return dateFormatted;
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${dateFormatted} ${hours}:${minutes}:${seconds}`;
    },

    /**
     * 格式化金额
     * - 两位小数
     * - 千分位
     * - 兜底 0.00
     */
    formatMoney(amount) {
        if (amount === null || amount === undefined || amount === '') return '0.00';
        const num = parseFloat(amount);
        if (!isFinite(num)) return '0.00';
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * 校验金额格式（前端表单使用）
     * - 正数
     * - 最多两位小数
     * - 不允许异常前导0（如 00.1, 01）
     */
    isValidAmountFormat(val) {
        const str = (val || '').toString().trim();
        const regex = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
        if (!str || !regex.test(str)) return false;
        const num = parseFloat(str);
        return isFinite(num) && num > 0;
    },

    /**
     * 规范化金额输入（实时清洗）
     * - 仅保留数字和一个小数点
     * - 限制两位小数
     * - 避免异常前导 0（允许 "0.xx"，不允许 "00.1"、"01"）
     */
    normalizeAmountInput(val) {
        let v = (val || '').toString();
        // 仅保留数字和小数点
        v = v.replace(/[^\d.]/g, '');
        // 只保留第一个小数点
        const firstDot = v.indexOf('.');
        if (firstDot !== -1) {
            v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
        }
        // 限制两位小数
        v = v.replace(/^(\d+)\.(\d{0,2}).*$/, '$1.$2');
        // 处理前导0：允许 "0."，不允许 "00" 或 "01"
        if (v.startsWith('0') && v.length > 1 && v[1] !== '.') {
            v = v.replace(/^0+/, '');
        }
        return v;
    },

    /**
     * 格式化手机号 (支持脱敏)
     */
    formatPhone(phone, desensitize = false) {
        if (!phone) return '';
        const phoneStr = String(phone);
        if (desensitize) {
            // 手机号脱敏 138****1234
            if (phoneStr.length === 11) {
                return phoneStr.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
            }
            // 其他长度号码脱敏
            if (phoneStr.length > 4) {
                return phoneStr.substr(0, 2) + '*'.repeat(phoneStr.length - 4) + phoneStr.substr(-2);
            }
        }
        return phoneStr;
    },

    /**
     * 获取状态文本
     */
    getStatusText(type, status) {
        const statusMaps = {
            lease_status: {
                1: '待生效',
                2: '生效中',
                3: '已到期',
                4: '已解约',
                5: '续租'
            },

            bill_status: {
                1: '待支付',
                2: '部分支付',
                3: '已支付',
                4: '逾期',
                5: '已取消'
            },

            bill_type: {
                1: '租金',
                3: '水费',
                4: '电费',
                5: '燃气',
                6: '管理费',
                7: '滞纳金',
                8: '损坏赔偿',
                99: '其他'
            },

            repair_status: {
                1: '待处理',
                2: '进行中',
                3: '已完成',
                4: '已取消'
            },

            room_status: {
                1: '空房可租',
                2: '已出租',
                3: '维护中'
            },

            payment_cycle: {
                1: '月付',
                2: '二月付',
                3: '季付',
                4: '四月付',
                5: '五月付',
                6: '半年付',
                7: '七月付',
                8: '八月付',
                9: '九月付',
                10: '十月付',
                11: '十一月付',
                12: '年付'
            },


            deposit_status: {
                1: '待收取',
                2: '已收取',
                3: '部分退还',
                4: '已退还',
                5: '部分扣除',
                6: '已全额扣除',
                7: '已关闭'
            },


            announcement_status: {
                1: '草稿',
                2: '已发布',
                3: '已过期'
            }
        };
        return statusMaps[type]?.[status] || status || '未知';
    },

    /**
     * 获取状态颜色
     */
    getStatusColor(type, status) {
        const colorMaps = {
            lease_status: {
                active: '#52c41a',      // 绿色
                expired: '#faad14',     // 橙色
                terminated: '#ff4d4f',   // 红色
                pending: '#1890ff'       // 蓝色
            },
            bill_status: {
                1: '#faad14',      // 待支付 - 橙色
                2: '#1890ff',      // 部分支付 - 蓝色
                3: '#52c41a',      // 已支付 - 绿色
                4: '#ff4d4f',      // 逾期 - 红色
                5: '#d9d9d9'       // 已取消 - 灰色
            },
            repair_status: {
                1: '#faad14',     // 待处理 - 橙色
                2: '#1890ff',    // 进行中 - 蓝色
                3: '#52c41a',    // 已完成 - 绿色
                4: '#d9d9d9'     // 已取消 - 灰色
            },
            room_status: {
                2: '#1890ff',    // 已出租 - 蓝色
                3: '#faad14' // 维护中 - 橙色
            },
            deposit_status: {
                1: '#faad14',  // 待收取 - 橙色
                2: '#1890ff',  // 已收取 - 蓝色
                3: '#52c41a',  // 部分退还 - 绿色
                4: '#13c2c2',  // 已退还 - 青色
                5: '#722ed1',  // 部分扣除 - 紫色
                6: '#ff4d4f',  // 全额扣除 - 红色
                7: '#9ca3af'   // 已关闭 - 灰色
            },
            announcement_status: {
                1: '#3b82f6', // 草稿 - 蓝色(Tailwind blue-500 approx)
                2: '#52c41a', // 已发布 - 绿色
                3: '#9ca3af'  // 已过期 - 灰色
            }
        };

        return colorMaps[type]?.[status] || '#d9d9d9'; // 默认灰色
    },

}
