// 初始化项目状态
let currentProject = null; // 当前选择的项目
let projects = [];        // 项目列表

try {
    // 从本地缓存获取项目信息
    currentProject = uni.getStorageSync("currentProject");
    projects = uni.getStorageSync("projects") || [];

    // 如果当前项目不在项目列表中，清空当前项目
    if (currentProject && projects.length > 0) {
        const exists = projects.find(p => p.id === currentProject.id);
        if (!exists) {
            currentProject = null;
            uni.removeStorageSync("currentProject");
        }
    }
} catch (error) {
    console.error("项目状态初始化失败:", error);
    currentProject = null;
    projects = [];
}

export default {
    namespaced: true,
    state: {
        currentProject,     // 当前选择的项目
        projects,          // 项目列表
        loading: false     // 加载状态
    },
    mutations: {
        /**
         * 设置项目列表
         */
        setProjects(state, projects) {
            state.projects = projects || [];
            uni.setStorageSync("projects", state.projects);
        },

        /**
         * 设置当前选择的项目
         */
        setCurrentProject(state, project) {
            state.currentProject = project;
            if (project) {
                uni.setStorageSync("currentProject", project);
            } else {
                uni.removeStorageSync("currentProject");
            }
        },

        /**
         * 设置加载状态
         */
        setLoading(state, loading) {
            state.loading = loading;
        },

        /**
         * 清除项目数据
         */
        clearProjectData(state) {
            state.currentProject = null;
            state.projects = [];
            uni.removeStorageSync("currentProject");
            uni.removeStorageSync("projects");
        }
    },
    actions: {
        /**
         * [NEW] 从登录结果初始化项目数据
         */
        initProjectsFromLogin({ commit, state }, projects) {
            if (projects && projects.length > 0) {
                commit("setProjects", projects);
                // 仅在当前没有选中项目时，才自动选中第一个
                if (!state.currentProject) {
                    commit("setCurrentProject", projects[0]);
                }
            }
        },
        /**
         * 加载项目列表
         */
        async loadProjects({ commit, state }) {
            if (state.projects.length > 0) {
                return state.projects; // 如果已有数据，直接返回
            }

            try {
                commit("setLoading", true);
                const response = await uni.api.getProjectList({
                    page: 1,
                    pageSize: 100 // 获取所有项目
                });

                if (response.data && response.data.list) {
                    const projects = response.data.list;
                    commit("setProjects", projects);

                    // 如果没有当前项目但有项目列表，默认选择第一个
                    if (!state.currentProject && projects.length > 0) {
                        commit("setCurrentProject", projects[0]);
                    }

                    return projects;
                }
            } catch (error) {
                console.error("加载项目列表失败:", error);
                uni.showToast({
                    title: "加载项目列表失败",
                    icon: "none"
                });
            } finally {
                commit("setLoading", false);
            }
        },

        /**
         * 切换项目
         */
        async switchProject({ commit }, project) {
            if (project) {
                commit("setCurrentProject", project);
                // 显示切换提示
                uni.showToast({
                    title: '切换成功',
                    icon: 'success',
                    duration: 1000
                });
                // 延迟500ms后重新加载当前页面
                setTimeout(() => {
                    // 使用reLaunch会关闭所有页面并重新打开指定页面
                    uni.reLaunch({
                        url: `/pages/index/index`
                    });
                }, 500);

                return project;
            }
        },

        /**
         * 确保项目数据已准备好（如果没有则自动加载）
         * 返回当前项目信息，页面只需要确保有一个可用的项目即可
         */
        async ensureProjectReady({ dispatch, state }) {
            // 如果已经有当前项目，直接返回
            if (state.currentProject) {
                return state.currentProject;
            }

            // 如果没有项目列表，先加载项目列表
            if (state.projects.length === 0) {
                await dispatch('loadProjects');
            }

            // 返回当前项目（loadProjects 会自动设置第一个项目为当前项目）
            return state.currentProject;
        },

        /**
         * 刷新项目列表
         */
        async refreshProjects({ dispatch, commit }) {
            commit("setProjects", []); // 清空现有数据
            return await dispatch("loadProjects");
        },
        /**
         * [NEW] 清除项目数据 (供登出时调用)
         */
        clearProjectData({ commit }) {
            commit("clearProjectData");
        }
    },
    getters: {
        /**
         * 获取当前项目
         */
        currentProject: state => state.currentProject,

        /**
         * 获取项目列表
         */
        projects: state => state.projects,

        /**
         * 是否有项目数据
         */
        hasProjects: state => state.projects.length > 0,

        /**
         * 加载状态
         */
        loading: state => state.loading,

        /**
         * 当前项目ID
         */
        currentProjectId: state => state.currentProject?.id || null,

        /**
         * 当前项目名称
         */
        currentProjectName: state => state.currentProject?.project_name || ""
    }
};
