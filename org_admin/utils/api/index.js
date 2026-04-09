import ApiMain from "./apis/api_main";
import ApiPermission from "./apis/api_permission";

export default {
    ...ApiMain, // api_main - 主要业务API
    ...ApiPermission, // api_permission - 权限管理API
};
