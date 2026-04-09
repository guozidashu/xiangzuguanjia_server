// 请求相关
const isLocalhost = () => {
    const host = typeof window !== 'undefined' ? window.location.host : '';
    return host.includes('localhost') ||
        host.includes('127.0.0.1') ||
        host.match(/^192\.168\./) ||
        host.match(/^10\./) ||
        host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
};

export const baseApi = isLocalhost()
    ? "http://127.0.0.1:7001/api/admin/v1"
    : "https://api.xy.shangbanbj.cn/api/admin/v1";



export const userLoginUrl = "/user/login"; // 用户静默登陆接口地址
export const userLoginPage = "/"; //登陆页