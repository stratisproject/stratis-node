import { onMounted, computed } from 'vue';
<template>
  <div v-if="!manageStore.newConfiguration.length > 0" class="mt-4 flex justify-center items-center">
    <p class="text-md text-gray-400 font-semibold">
      {{ $t("editModals.noAvailService") }}
    </p>
  </div>
  <div v-else class="w-full mt-4 flex justify-center items-center box-border">
    <div
      v-if="list.length && list.some((e) => e.category === 'consensus')"
      class="w-1/3 h-[280px] flex flex-col justify-start items-center"
    >
      <div class="w-full h-5 flex justify-center items-center mt-2">
        <span class="text-lg font-semibold text-gray-500">{{ $t("editModals.consensusClients") }}</span>
      </div>
      <div
        class="w-full h-[250px] overflow-y-auto overflow-x-hidden flex flex-col justify-start items-center mx-auto rounded-lg space-y-2 mt-1"
      >
        <div
          v-for="option in list.filter((e) => e.category === 'consensus' && e.setupId === setupStore.selectedSetup.setupId)"
          :key="option.service"
          class="group mx-auto rounded-md cursor-pointer transition duration-200 shadow-xl shadow-[#141516] p-2"
          :class="{
            'bg-teal-600 hover:bg-teal-600 text-gray-200 border-2 border-teal-700': option.isConnected,
            'bg-[#282a2c] text-teal-600 border-2 border-gray-600 hover:border-teal-600': !option.isConnected,
            ' w-[190px] h-[55px]': props.client.service === 'SSVNetworkService',
            'w-[200px] h-[65px] text-md': props.client.service !== 'SSVNetworkService',
          }"
          @click="toggleConnection(option)"
        >
          <div class="w-full h-full flex justify-start items-center">
            <div class="p-1 flex justify-center items-center">
              <img class="w-9 h-9" :src="option.sIcon" alt="Service Icon" />
            </div>
            <div class="flex flex-col justify-center items-start space-y-1">
              <div class="font-semibold capitalize">
                <span> {{ option.name }}</span>
              </div>
              <div class="text-xs font-normal overflow-x-hidden" :class="option.isConnected ? 'text-gray-800' : 'text-gray-400'">
                <span class="min-w-[120px] min-h-[18px]"> {{ shortID(option) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="list.length && list.some((e) => e.category === 'execution')"
      class="w-1/3 h-[280px] flex flex-col justify-start items-center"
    >
      <div class="w-full h-5 flex justify-center items-center mt-2">
        <span class="text-lg font-semibold text-gray-500">{{ $t("editModals.executionClients") }}</span>
      </div>
      <div
        class="w-full h-[250px] overflow-x-hidden overflow-y-auto flex flex-col justify-start items-center mx-auto rounded-lg space-y-2 mt-1"
      >
        <div
          v-for="option in list.filter((e) => e.category === 'execution' && e.setupId === setupStore.selectedSetup.setupId)"
          :key="option.service"
          class="group mx-auto rounded-md cursor-pointer transition duration-200 shadow-xl shadow-[#141516] p-2"
          :class="{
            'bg-teal-600 hover:bg-teal-600 text-gray-200 border-2 border-teal-700': option.isConnected,
            'bg-[#282a2c] text-teal-600 border-2 border-gray-600 hover:border-teal-600': !option.isConnected,
            ' w-[190px] h-[55px]': props.client.service === 'SSVNetworkService',
            'w-[200px] h-[65px] text-md': props.client.service !== 'SSVNetworkService',
          }"
          @click="toggleConnection(option)"
        >
          <div class="w-full h-full flex justify-start items-center">
            <div class="p-1 flex justify-center items-center">
              <img class="w-9 h-9" :src="option.sIcon" alt="Service Icon" />
            </div>
            <div class="flex flex-col justify-center items-start space-y-1">
              <div class="font-semibold capitalize">
                <span> {{ option.name }}</span>
              </div>
              <div class="text-xs font-normal overflow-x-hidden" :class="option.isConnected ? 'text-gray-800' : 'text-gray-400'">
                <span> {{ shortID(option) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="list.length && list.some((e) => e.category === 'validator')"
      class="w-1/3 h-[280px] flex flex-col justify-start items-center"
    >
      <div class="w-full h-5 flex justify-center items-center mt-2">
        <span class="text-lg font-semibold text-gray-500">{{ $t("editModals.validatorClients") }}</span>
      </div>
      <div
        class="w-full h-[250px] flex flex-col justify-start items-center mx-auto rounded-lg space-y-2 mt-1 overflow-x-hidden overflow-y-auto"
      >
        <div
          v-for="option in list.filter((e) => e.category === 'validator' && e.setupId === setupStore.selectedSetup.setupId)"
          :key="option.service"
          class="group mx-auto rounded-md cursor-pointer transition duration-200 shadow-xl shadow-[#141516] p-2"
          :class="{
            'bg-teal-600 hover:bg-teal-600 text-gray-200 border-2 border-teal-700': option.isConnected,
            'bg-[#282a2c] text-teal-600 border-2 border-gray-600 hover:border-teal-600': !option.isConnected,
            ' w-[190px] h-[55px]': props.client.service === 'SSVNetworkService',
            'w-[200px] h-[65px] text-md': props.client.service !== 'SSVNetworkService',
          }"
          @click="toggleConnection(option)"
        >
          <div class="w-full h-full flex justify-start items-center">
            <div class="p-1 flex justify-center items-center">
              <img class="w-9 h-9" :src="option.sIcon" alt="Service Icon" />
            </div>
            <div class="flex flex-col justify-center items-start space-y-1">
              <div class="font-semibold capitalize">
                <span> {{ option.name }}</span>
              </div>
              <div class="text-xs font-normal overflow-x-hidden" :class="option.isConnected ? 'text-gray-800' : 'text-gray-400'">
                <span> {{ shortID(option) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="list.length && list.some((e) => e.category === 'service')" class="w-1/3 h-[280px] flex flex-col justify-start items-center">
      <div class="w-full h-5 flex justify-center items-center mt-2">
        <span class="text-lg font-semibold text-gray-500">{{ "Other Services" }}</span>
      </div>
      <div
        class="w-full h-[250px] overflow-x-hidden overflow-y-auto flex flex-col justify-start items-center mx-auto rounded-lg space-y-2 mt-1"
      >
        <div
          v-for="option in list.filter((e) => e.category === 'service')"
          :key="option.service"
          class="group mx-auto rounded-md cursor-pointer transition duration-200 shadow-xl shadow-[#141516] p-2"
          :class="{
            'bg-teal-600 hover:bg-teal-600 text-gray-200 border-2 border-teal-700': option.isConnected,
            'bg-[#282a2c] text-teal-600 border-2 border-gray-600 hover:border-teal-600': !option.isConnected,
            ' w-[190px] h-[55px]': props.client.service === 'SSVNetworkService',
            'w-[200px] h-[65px] text-md': props.client.service !== 'SSVNetworkService',
          }"
          @click="toggleConnection(option)"
        >
          <div class="w-full h-full flex justify-start items-center">
            <div class="p-1 flex justify-center items-center">
              <img class="w-9 h-9" :src="option.sIcon" alt="Service Icon" />
            </div>
            <div class="flex flex-col justify-center items-start space-y-1">
              <div class="font-semibold capitalize">
                <span> {{ option.name }}</span>
              </div>
              <div class="text-xs font-normal overflow-x-hidden" :class="option.isConnected ? 'text-gray-800' : 'text-gray-400'">
                <span> {{ shortID(option) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { useNodeManage } from "@/store/nodeManage";
import { onMounted, ref } from "vue";
import { useSetups } from "../../../../../store/setups";

const emit = defineEmits(["select-service"]);

const list = ref([]);

//Props
const props = defineProps({
  client: {
    type: Object,
    default: null,
  },
  properties: {
    type: Object,
    default: null,
  },
});

//Stores
const manageStore = useNodeManage();
const setupStore = useSetups();

//Lifecycle Hooks
onMounted(() => {
  manageStore.newConfiguration.forEach((e) => {
    e.isConnected = false;
  });
  list.value = getConnectionOptions();
});
//Methods

const toggleConnection = (option) => {
  if (!option.isConnected) {
    option.isConnected = true;
    emit("select-service", option);
  } else {
    option.isConnected = false;
  }
  props.properties.executionClients = list.value.filter((e) => e.category === "execution" && e.isConnected);
  props.properties.consensusClients = list.value.filter(
    (e) => (e.category === "consensus" || e.service === "CharonService") && e.isConnected
  );
  props.properties.otherServices = list.value.filter((e) => e.category === "service" && e.isConnected);
  if (props.client.service === 'LssEjectorService') {
    props.properties.otherServices = list.value.filter((e) => e.category === "validator" && e.isConnected);
  }
};

const getConnectionOptions = () => {
  switch (props.client.category) {
    case "execution":
      if (props.client.service === "ExternalExecutionService") {
        return manageStore.newConfiguration.filter((e) => e.category === "consensus");
      }
      return [];
    case "consensus":
      if (props.client.service === "ExternalConsensusService") {
        return manageStore.newConfiguration.filter((e) => e.category === "validator");
      }
      return manageStore.newConfiguration.filter((e) => e.category === "execution");
    case "validator":
      if (props.client.service === "SSVNetworkService") {
        return manageStore.newConfiguration.filter((e) => e.category === "consensus" || e.category === "execution");
      }
      if (props.client.service === "Web3SignerService") {
        return [];
      }
      if (props.client.service === "CharonService") {
        return manageStore.newConfiguration.filter((e) => e.category === "consensus");
      }
      return manageStore.newConfiguration.filter((e) => e.category === "consensus" || e.service === "CharonService");
    case "service":
      if (props.client.service === "FlashbotsMevBoostService") {
        return manageStore.newConfiguration.filter((e) => e.category === "consensus");
      }
      if (props.client.service === "LssEjectorService") {
        return manageStore.newConfiguration.filter(e => e.category === "execution" || e.category === "consensus" || e.category === "validator")
      }
      break;
    default:
      return [];
  }
};

const shortID = (client) => {
  if (client?.config?.serviceID) {
    return client.config.serviceID.slice(0, 8) + "..." + client.config.serviceID.slice(-8);
  }
  return client.id;
};
</script>
