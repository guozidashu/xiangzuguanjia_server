import { createStore } from "vuex";
import userMessage from "./userMessage.js";
import project from "./project.js";

export default createStore({
    modules: {
        userMessage,
        project,
    },
});
