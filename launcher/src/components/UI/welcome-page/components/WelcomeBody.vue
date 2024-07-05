<template>
  <div v-if="active" class="col-start-3 col-end-23 row-start-4 row-span-6 grid grid-cols-12 grid-rows-6 p-4 bg-[#1E2429] rounded-lg">
    <div class="col-start-1 col-end-13 row-start-1 row-end-7 w-full h-full flex justify-evenly items-center space-x-2 text-white">
      {{ t("installitionMenu.osCheck") }}
    <svg
      class="animate-spin h-5 w-5 mr-3 border-2 border-gray-200 border-r-2 border-r-transparent rounded-full"
      viewBox="0 0 24 24"
    ></svg>
    </div>
  </div>

  <div v-if="!active && isSupported" class="col-start-3 col-end-23 row-start-4 row-span-6 grid grid-cols-12 grid-rows-6 p-4 bg-[#1E2429] rounded-lg">
    <div class="col-start-1 col-end-13 row-start-1 row-end-2 w-full h-full flex justify-center items-center">
      <span class="text-xl text-gray-300 font-normal text-center">{{ $t("welcomePage.chooseInstallNode") }}</span>
    </div>
    <div class="col-start-1 col-end-13 row-start-2 row-end-7 w-full h-full flex justify-evenly items-center space-x-2">
      <CardItem v-for="item in welStore.installationOptions" :key="item" :item="item" />
    </div>
  </div>
  <div v-if="!active && !isSupported" class="col-start-3 col-end-23 row-start-4 row-span-6 grid grid-cols-12 grid-rows-6 p-4 bg-[#1E2429] rounded-lg">
    <div class="col-start-1 col-end-13 row-start-1 row-end-7 w-full h-full flex justify-evenly items-center space-x-2 text-white">
      UNSUPPORTED OS
    </div>
  </div>
</template>
<script setup>
import ControlService from "@/store/ControlService";
import CardItem from "./CardItem.vue";
import { ref, onMounted } from "vue";
import { useWelcomeStore } from "@/store/welcomePage";
import i18n from "../../../../includes/i18n";

const t = i18n.global.t;

const welStore = useWelcomeStore();
const isSupported = ref(false);
const active = ref(true);

// Lifecycle Hooks
onMounted(() => {
  checkSupportedOs();
});

const checkSupportedOs = async () => {
  const osResponse = await ControlService.checkOS();
  const osData = await osResponse
  const osName = osData && osData.hasOwnProperty("name") && osData.name ? osData.name : "";
  const osVers = osData && osData.hasOwnProperty("version") && osData.version ? osData.version : "";
  if (osName === "Ubuntu" && (osVers === "22.04" || osVers === "24.04")) {
    isSupported.value = true
  } else {
    isSupported.value = false
  }
  active.value = false
};
</script>
