<template>
  <div
    class="w-full h-full max-h-8 col-start-1 col-span-full row-start-2 row-span-1 border border-gray-500 rounded-full grid grid-cols-6 bg-[#313539] items-center p-[1px]"
    @mouseenter="footerStore.cursorLocation = `${attestReward}`"
    @mouseleave="footerStore.cursorLocation = ''"
  >
    <div class="h-full col-start-1 col-end-3 self-center grid grid-cols-3 justify-center items-center gap-1 px-[2px]">
      <img class="col-start-1 col-span-1 w-4 h-4" src="/img/icon/staking-page-icons/eye.png" alt="Block Icon" @mousedown.prevent />
      <span class="col-start-2 col-span-full text-[9px] text-amber-300 font-semibold">{{ $t("stakingPage.reward") }}</span>
    </div>
    <div
      class="w-full h-full col-start-3 col-span-full rounded-r-full self-center flex justify-center items-center bg-[#151618] px-1"
    >
      <span class="text-2xs text-gray-300 font-semibold">{{ totalRewards / 1000000000 }}</span>
    </div>
  </div>
</template>
<script setup>
import { useStakingStore } from "@/store/theStaking";
import { onUnmounted, watchEffect, ref, onMounted } from "vue";
import ControlService from "@/store/ControlService";
import { useFooter } from "@/store/theFooter";
import i18n from "@/includes/i18n";

const t = i18n.global.t;

const footerStore = useFooter();

const attestReward = t("displayValidator.attestReward");

const stakingStore = useStakingStore();
const intervalID = ref(null);
const totalRewards = ref(0);

onMounted(() => {
  getStats();
});

watchEffect(() => {
  if (stakingStore.secondsPerSlot > 0 && intervalID.value == null) {
    intervalID.value = setInterval(() => {
      getStats();
    }, stakingStore.secondsPerSlot * stakingStore.slotsPerEpoch * 1000);
  }
});

const getStats = () => {
  ControlService.getAttestationRewards(stakingStore.keys.map((k) => k.index).filter((k) => k))
    .then((data) => {
      if (data.rewards?.length > 0)
        totalRewards.value = data.rewards.filter((item) => !isNaN(item.total_rewards))
          .reduce((sum, item) => sum += item.total_rewards, 0);
    });
};

onUnmounted(() => {
  clearInterval(intervalID.value);
});
</script>
