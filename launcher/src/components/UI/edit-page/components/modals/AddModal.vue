<template>
  <custom-modal
    :main-title="`${client.name} - ${client.category}`"
    :client="client"
    :sub-title="getSubTitles"
    :confirm-text="getConfirmText"
    :disabled-button="disabledButton || externalServiceConfirmBtn || lssEjectorEmptyClients"
    click-outside-text="Click outside to cancel"
    @close-window="closeWindow"
    @confirm-action="confirmInstall"
  >
    <template #content>
      <AddPanel v-if="isAddPanelActivated" ref="addPanelComponent" :client="client" :properties="properties" />
      <MevboostRelays v-if="isRelaysActivated" :client="client" :properties="properties" />
      <AddConnection v-if="isModifyActivated" :client="client" :properties="properties" />
    </template>
  </custom-modal>
</template>
<script setup>
import CustomModal from "./CustomModal.vue";
import AddPanel from "./AddPanel";
import AddConnection from "./AddConnection";
import MevboostRelays from "./MevboostRelays.vue";
import { ref, onMounted, computed, watchEffect } from "vue";
import { useNodeManage } from "@/store/nodeManage";
import { useClickInstall } from "@/store/clickInstallation";

const props = defineProps({
  client: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["closeWindow", "confirmInstall", "selectService"]);

const manageStore = useNodeManage();
const installStore = useClickInstall();

//Refs
const isAddPanelActivated = ref(false);
const isRelaysActivated = ref(false);
const isModifyActivated = ref(false);
const disabledButton = ref(false);
const lssEjectorEmptyClients = ref(false)
// eslint-disable-next-line vue/no-setup-props-destructure
const properties = ref({
  client: props.client,
  network: manageStore.configNetwork.network,
  installDir: "/opt/stereum",
  executionClients: [],
  consensusClients: [],
  otherServices: [],
  relays: [],
  checkPointSyncUrl: null,
});

//Computed & Watcher

const getConfirmText = computed(() => {
  let text = "";
  if (isAddPanelActivated.value) {
    if (props.client.category === "consensus" && props.client.service === "ExternalConsensusService") {
      text = "confirm";
    } else if (props.client.category === "execution" && props.client.service === "ExternalExecutionService") {
      text = "confirm";
    } else if (
      props.client.category === "consensus" ||
      (props.client.category === "validator" && !/Web3Signer/.test(props.client.service))
    ) {
      text = "next";
    } else if (props.client.category === "service" && props.client.service === "LssEjectorService") {
      text = "next"
    } else if (props.client.category === "service" && props.client.service !== "FlashbotsMevBoostService") {
      text = "confirm";
    } else if (props.client.category === "service" && props.client.service === "FlashbotsMevBoostService") {
      text = "next";
    }
  } else if (isRelaysActivated.value) {
    text = "next";
  } else if (isModifyActivated.value) {
    text = "confirm";
  }
  return text ? text : "confirm";
});

const getSubTitles = computed(() => {
  let text = "";
  if (isAddPanelActivated.value) {
    text = "Add Service";
  } else if (isRelaysActivated.value) {
    text = "Mevboost Relays";
  } else if (isModifyActivated.value) {
    text = "Add Connection";
  }
  return text;
});

watchEffect(() => {
  lssEjectorEmptyClients.value = (
    props.client.service === "LssEjectorService" &&
    getConfirmText.value === "confirm" &&
    (properties.value.executionClients.length === 0 ||
    properties.value.consensusClients.length === 0 ||
    properties.value.otherServices.length === 0)
  )
})

const externalServiceConfirmBtn = computed(() => {
  if (props.client.service === "ExternalExecutionService") {
    return props.client.config.source === "" || props.client.config.jwtToken === "";
  } else if (props.client.service === "ExternalConsensusService" && manageStore.externalConsensusSelectedService !== "prysm") {
    return props.client.config.source === "";
  } else if (props.client.service === "ExternalConsensusService" && manageStore.externalConsensusSelectedService === "prysm") {
    return props.client.config.source === "" || props.client.config.gateway === "";
  }
  return false;
});

//Lifecycle Hooks
onMounted(() => {
  isAddPanelActivated.value = true;
});

//Methods

const confirmInstall = () => {
  if (getConfirmText.value === "confirm") {
    props.client.addPanel = false;
    properties.value.checkPointSyncUrl = installStore.checkPointSync;
    emit("confirmInstall", properties.value);
  } else if (
    (props.client.category === "consensus" && getConfirmText.value === "next") ||
    (props.client.category === "validator" && getConfirmText.value === "next") ||
    (props.client.category === "service" && props.client.service === "LssEjectorService" && getConfirmText.value === "next")
  ) {
    isAddPanelActivated.value = false;
    isModifyActivated.value = true;
  } else if (
    props.client.category === "service" &&
    props.client.service === "FlashbotsMevBoostService" &&
    !isRelaysActivated.value &&
    getConfirmText.value === "next"
  ) {
    isAddPanelActivated.value = false;
    isRelaysActivated.value = true;
  } else if (
    isRelaysActivated.value &&
    props.client.category === "service" &&
    props.client.service === "FlashbotsMevBoostService" &&
    getConfirmText.value === "next"
  ) {
    isAddPanelActivated.value = false;
    isRelaysActivated.value = false;
    isModifyActivated.value = true;
  }
};

const closeWindow = () => {
  emit("closeWindow", props.client);
};
</script>

<style scoped>
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: opacity 0.3s ease-out;
}
.slide-leave-active {
  transition: opacity 0.3s ease-in;
}
.slide-enter-to,
.slide-leave-from {
  opacity: 1;
}
</style>
