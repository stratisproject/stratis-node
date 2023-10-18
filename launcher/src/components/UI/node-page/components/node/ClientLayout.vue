<template>
  <div
    class="grid-col-1 col-span-1 relative w-full h-full flex justify-center items-center box-border"
    @pointerdown.prevent.stop
    @mousedown.prevent.stop
  >
    <div
      class="w-[178px] h-[16px] absolute top-[-18px] -left-[1px] rounded-r-full pl-2 flex justify-between items-center text-white text-[10px] font-semibold capitalize bg-[#264744]"
    >
      <span> {{ props.client.name }}</span>

      <span :class="clientStatus"></span>
    </div>
    <div class="flex flex-col gap-2">
      <img class="w-10" :src="props.client.sIcon" alt="icon" />
      <div v-if="props.client.category !== 'validator'" class="h-1/3 flex justify-evenly items-center">
        <img class="w-4" :src="syncIcon" alt="icon" />
        <span class="text-xs text-gray-100">{{ syncPercent }}</span>
      </div>
      <div v-else class="h-1/3 flex justify-center items-center">
        <img class="w-5" src="/img/icon/node-icons/key.png" alt="icon" />
        <span
          class="text-md font-semibold"
          :class="props.client.state === 'running' ? 'text-green-500' : 'text-red-600 '"
          >{{ getKeyNumbers }}</span
        >
      </div>
    </div>

    <div
      v-if="getConnectedMevboost?.config.serviceID === props.client.config.serviceID"
      class="flex justify-evenly items-center absolute -bottom-2 -right-24"
    >
      <img class="w-5" src="/img/icon/plugin-icons/Other/mev-sIcon.png" alt="icon" />
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onUnmounted } from "vue";
import { useServices } from "@/store/services";
import { useControlStore } from "@/store/theControl";
import { ref } from "vue";

const props = defineProps({
  client: Object,
});


const serviceStore = useServices();
const controlStore = useControlStore();

const syncPercent = ref("-");
const refreshSync = ref(null);

const syncIcons = ref([
  {
    id: 1,
    name: "error",
    icon: "/img/icon/arrows/SynchronisationIconError.gif",
  },
  {
    id: 2,
    name: "active",
    icon: "/img/icon/arrows/SynchronisationIconActive.gif",
  },
  {
    id: 3,
    name: "synched",
    icon: "/img/icon/arrows/SynchronisationIconSynchronized.gif",
  },
  {
    id: 4,
    name: "unknown",
    icon: "/img/icon/arrows/SynchronisationIconUnknown.gif",
  },
]);

const syncIcon = ref(syncIcons.value[3].icon);

onMounted(() => {
  if (props.client.category !== "validator") {
    getPercent();
    refreshSync.value = setInterval(() => {
      getPercent();
    }, 10000);
  }
});

onUnmounted(() => {
  if (props?.client?.category !== "validator") {
    clearInterval(refreshSync.value);
  }
});

const getPercent = () => {
  const syncResult = structuredClone(controlStore.syncstatus);
  if (syncResult.code === 0) {
    const flatArray = syncResult.data.flat();
    let data = flatArray.find((e) => e.title.toLowerCase() === props.client.name.toLowerCase());

    if (data) {
      const lo = data.frstVal;
      const hi = data.scndVal;
      const percent = Math.floor((parseInt(lo) / parseInt(hi)) * 100);

      if (isNaN(percent)) {
        syncPercent.value = "-";
      } else {
        syncPercent.value = percent + "%";
      }
      // console.log(data.title, lo, hi);
      if (lo > hi) {
        //fonts.orange.push(k);
        syncIcon.value = syncIcons.value[0].icon;
        return;
      }
      if (lo < 1 && hi < 1) {
        //fonts.grey.push(k);
        syncIcon.value = syncIcons.value[3].icon;
        return;
      }
      if (lo < hi) {
        //fonts.blue.push(k);
        syncIcon.value = syncIcons.value[1].icon;
        return;
      }
      if (lo == hi) {
        //fonts.green.push(k);
        syncIcon.value = syncIcons.value[2].icon;
        return;
      }
    }
  }
  syncPercent.value = "-";
};

const clientStatus = computed(() => {
  if (props.client.state === "running") {
    return "w-5 h-[16px] bg-green-500 border border-green-500 rounded-r-full";
  } else if (props.client.state === "restarting") {
    return "w-5 h-[16px] bg-orange-500 border border-orange-500 rounded-r-full";
  }
  return "w-5 h-[16px] bg-red-600 border border-red-600 rounded-r-full";
});

const getKeyNumbers = computed(() => {
  return props.client?.config?.keys?.length ? props.client.config.keys.length : 0;
});

const getConnectedMevboost = computed(() => {
  let connectedMevboost;
  connectedMevboost = serviceStore.installedServices
    .filter((e) => e.category == "consensus")
    .find((e) => e.config.dependencies.mevboost[0]);
  return connectedMevboost;
});
</script>