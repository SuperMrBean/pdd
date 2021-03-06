import Vue from "vue";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";
import { onGetUrlParams } from "./plugins/utils";
import App from "./app.vue";

const wokooApp = document.createElement("div");
wokooApp.id = "wokooApp-my-plugin-99179";
document.body.appendChild(wokooApp);

Vue.use(ElementUI);
const vm = new Vue({
  el: wokooApp,
  render: (h) => h(App),
  data: function() {
    return {
      token: sessionStorage.getItem("token"), // 全局token
      shopId: sessionStorage.getItem("shopId"),
      pagecode: sessionStorage.getItem("pagecode"),
      pati: sessionStorage.getItem("pati"),
      templateId: sessionStorage.getItem("templateId"),
      isSwitch: "",
      operator: localStorage.getItem("operator") || "",
      env:
        onGetUrlParams("env") && onGetUrlParams("env") === "test"
          ? "yh-test"
          : "yh",
    };
  },
});
