<template>
  <div class="w-full h-full absolute inset-0 flex justify-center items-center">
    <div class="w-full h-full absolute indent-0 bg-black opacity-80 rounded-lg z-10" @click="$emit('closeWindow')"></div>
    <div class="support-modal-content">
      <div class="content">
        <support-modal-box
          :box-title="$t('supportModal.support')"
          box-image-path="/img/icon/base-header-icons/help-modal-support.png"
          :box-text="$t('supportModal.supportText')"
          @card-action="OpenStereumDiscord"
        ></support-modal-box>
        <support-modal-box
          :box-title="$t('supportModal.bugReport')"
          box-image-path="/img/icon/base-header-icons/help-modal-bug-report.png"
          :box-text="$t('supportModal.supportText')"
          @card-action="OpenStereumGithub"
        ></support-modal-box>
        <support-modal-box
          :box-title="$t('supportModal.docsTitle')"
          box-image-path="/img/icon/base-header-icons/help-modal-doc-stereum_docs.png"
          :box-text="$t('supportModal.docsText')"
          @card-action="openStereumDocs"
        ></support-modal-box>
      </div>
      <span class="email">{{ $t("supportModal.emailText") }}<a href="mailto:support@stereum.net">support@stereum.net</a></span>
    </div>
  </div>
</template>
<script>
import SupportModalBox from "./SupportModalBox.vue";
import { mapState } from "pinia";
import { useNodeManage } from "@/store/nodeManage";
export default {
  components: { SupportModalBox },
  data() {
    return {
      docsImage: "",
    };
  },
  computed: {
    ...mapState(useNodeManage, {
      currentNetwork: "currentNetwork",
    }),
  },
  mounted() {
    this.docsImage = "/img/icon/base-header-icons/help-modal-doc-ethereum.png";
  },
  methods: {
    OpenStereumGithub() {
      let URL =
        "https://github.com/stratisproject/stratis-node/issues/new";
      window.open(URL, "_blank");
    },
    OpenStereumDiscord() {
      let URL = "https://discord.gg/DzAwgnSXtB";
      window.open(URL, "_blank");
    },
    openStereumDocs() {
      let url = "https://stereum-dev.github.io/ethereum-node-web-docs/";
      window.open(url, "_blank");
    },
  },
};
</script>
<style scoped>
.support-modal-parent {
  width: 100%;
  height: 100%;
  position: fixed;
  top: 10%;
  left: 5%;
  z-index: 310;
}
.modal-opacity {
  width: 100%;
  height: 100%;
  background-color: black;
  position: fixed;
  left: 0;
  top: 0;
  opacity: 0.7;
  z-index: 311;
}
.support-modal-content {
  width: 55%;
  height: 55%;
  border-radius: 1rem;
  background-color: #343434;
  border: 4px solid rgb(171, 170, 170);
  z-index: 312;
  opacity: 1;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  box-shadow: 1px 1px 5px 1px rgb(6, 6, 6);
}

.content {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 5px;
}

.email {
  font-size: 0.6rem;
  font-weight: 500;
  color: #c6c6c6c6;
  text-align: center;
}
.email a {
  color: #83bbee;
  font-weight: 600;
}
.close {
  color: #bf3a3a;
  font-size: 0.6rem;
  font-weight: 400;
  align-self: center;
}
</style>
