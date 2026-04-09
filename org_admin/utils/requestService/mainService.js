import Request from '@/utils/utils/luch-request'
import Store from '@/utils/store'
import { baseApi } from '@/config/config.js'

function debounce(fn, wait = 500, isImmediate = false) { // 防抖
    let timerId = null;
    let flag = true;
    if (isImmediate) {
        return function () {
            clearTimeout(timerId);
            if (flag) {
                fn.apply(this, arguments);
                flag = false
            }
            timerId = setTimeout(() => {
                flag = true
            }, wait)
        }
    }
    return function () {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
            fn.apply(this, arguments)
        }, wait)
    }
}
const reLaunchLogin = debounce(function (msg) { //重新登录
    Store.dispatch('userMessage/logout')
    uni.reLaunch({
        url: '/pages/login/login'
    })
}, 1000, true)
const http = new Request() //创建实例
http.setConfig((config) => {
    /* 设置全局配置 */
    config.baseURL = baseApi
    config.header = {
        ...config.header,
        'content-type': 'application/json;charset=utf-8',
    }
    config.custom = {
        token: true, // 是否传递accesstoken
        loading: true, //是否需要加载logo等待
    }
    return config
})

http.interceptors.request.use(async (config) => {
    /* 请求之前拦截器。可以使用async await 做异步操作 */
    if (config.custom.loading) { //需要loading
        uni.showLoading({
            title: '请求中...',
            mask: true
        });
    }
    let token = Store.state.userMessage.token;
    if (token) {
        config.header['Authorization'] = token
    }

    // 自动携带项目ID到header（默认开启，可通过custom.project控制）
    if (config.custom.project !== false) {
        const currentProject = Store.state.project?.currentProject;
        if (currentProject?.id) {
            config.header['x-project-id'] = currentProject.id;
        }
    }

    // if (config.custom.token) { //需要token
    //     let token = Store.state.userMessage.token;
    //     if (!token) {
    //         // const tokenData = 获取新的token
    //         // if (!tokenData.token) { //未登录跳转
    //         //     reLaunchLogin('您还未登录,请先登录;')
    //         //     return Promise.reject(config)
    //         // } else {
    //         //     token = tokenData.token
    //         // }
    //     }
    //     config.header['Authorization'] = token
    // }
    return config
}, (config) => {
    return Promise.reject(config)
})
http.interceptors.response.use(async (response) => {
    /* 请求之后拦截器。可以使用async await 做异步操作  */
    if (response.config.custom.loading) uni.hideLoading();
    if (response.statusCode == 200) {
        if (response.data.code == 200) {
            return response.data;
        } else if (response.data.code == 202) {
            uni.showToast({
                icon: 'none',
                title: response.data.msg || '操作失败',
                duration: 2000
            })
            return Promise.reject(response.data);
        } else if (response.data.code == 401) {
            reLaunchLogin('您还未登录,请先登录;')
            return Promise.reject(response.data);
        } else { //非已知的错误 做兜底处理
            uni.showToast({
                icon: 'none',
                title: response.data.msg || '服务器错误',
                duration: 2000
            })
            return Promise.reject(response.data || {});
        }
    }
}, async (response) => { // 请求错误做点什么。可以使用async await 做异步操作
    uni.hideLoading() //可能获取不到custom的配置，默认全部关闭
    return Promise.reject(response)
})

/**
 * 避免进入死循环，重新new一个用于重新发起请求的实例
 */
const againHttp = new Request({ baseURL: baseApi })
againHttp.interceptors.request.use(config => { return config }, error => { return Promise.reject(error) })
export { http, againHttp }
