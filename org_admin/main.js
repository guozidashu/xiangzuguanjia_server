import App from './App'
import { debounce, throttle } from "@/utils/utils/throttle.js"; //防抖截流
import api from "@/utils/api/index.js"; //api接口
import store from "@/utils/store/index.js"; //store
import tools from "@/utils/utils/tools.js"; //工具
import { createSSRApp } from 'vue'
App.mpType = 'app'
// 将防抖截流和api接口挂载到uni
uni.debounce = debounce;
uni.throttle = throttle;
uni.api = api;
uni.tools = tools;

export function createApp() {
  const app = createSSRApp(App)
  // 在Vue 3中，需要使用app.use()来挂载store
  app.use(store)
  // 将工具方法挂载到全局属性
  app.config.globalProperties.$tools = {
    ...tools,
  };
  app.config.globalProperties.$debounce = debounce;
  app.config.globalProperties.$throttle = throttle;
  return {
    app
  }
}