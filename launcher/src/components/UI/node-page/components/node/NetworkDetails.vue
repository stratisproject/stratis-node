import { useNodeManage } from '@/store/nodeManage';
<template>
  <div
    class="col-start-7 col-span-3 flex flex-col justify-between items-center bg-[#151618] border h-full border-gray-600 rounded-md px-2 py-1"
    style="cursor: default"
    @mouseenter="footerStore.cursorLocation = `${currIs} ${network?.name}`"
    @mouseleave="footerStore.cursorLocation = ''"
  >
    <div class="w-full self-start text-xs font-semibold text-teal-700">
      {{ t("networkDetails.currentNet") }}
    </div>
    <div class="w-full flex justify-center items-center">
      <img v-if="getNetworkIcon" :src="getNetworkIcon" alt="Networks" class="w-5 mr-1" />
      <span class="text-md text-gray-300 text-left overflow-hidden whitespace-pre">{{ getNetworkName }}</span>
    </div>
  </div>
</template>
<script setup>
import { useNodeManage } from "@/store/nodeManage";
import { watchEffect, ref, onMounted, watch, computed } from "vue";
import { useFooter } from "@/store/theFooter";
import { useDeepClone } from "@/composables/utils";
import i18n from "@/includes/i18n";

const t = i18n.global.t;

const currIs = t("networkDetails.currIs");

const footerStore = useFooter();
const manageStore = useNodeManage();
const network = ref(null);

const getNetworkName = computed(() => {
  return network.value.name ? network.value.name : manageStore.currentNetwork.name;
});

const getNetworkIcon = computed(() => {
  return network.value.icon ? network.value.icon : manageStore.currentNetwork.icon;
});

watch(network, (val) => {
  if (!val) {
    useDeepClone(manageStore.configNetwork);
  }
});

watchEffect(() => {
  let id = manageStore.configNetwork?.id ? manageStore.configNetwork.id : manageStore.currentNetwork.id;
  if (!id) {
    manageStore.currentNetwork = useDeepClone(manageStore.networkList.find((net) => net.id === (id ? id : 5)));
  }
  network.value = useDeepClone(manageStore.currentNetwork);
});

onMounted(() => {
  network.value = useDeepClone(manageStore.currentNetwork);
});
</script>

<style scoped>
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

/* 2. declare enter from and leave to state */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(30px, 0);
}

/* 3. ensure leaving items are taken out of layout flow so that moving
      animations can be calculated correctly. */
.fade-leave-active {
  position: absolute;
}
</style>
