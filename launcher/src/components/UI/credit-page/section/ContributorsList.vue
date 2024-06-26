<template>
  <div class="contributors-parent w-full h-full">
    <div v-if="loader" class="loader">
      <div class="spinner-square">
        <div v-for="n in 3" :key="n" :class="['square', `square-${n}`]"></div>
      </div>
    </div>
    <div v-else class="contributors-list" name="contributors-list">
      <TheContributor
        v-for="(result, index) in results"
        :key="result.id"
        :class="getClass(index)"
        :name="result.name"
        :avatar="result.avatar"
        :crown="headerStore.choosedCreditType !== 'translation' && index === 0"
        :rank="headerStore.choosedCreditType !== 'translation' ? index + 1 : ''"
        :score="result.score"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import TheContributor from "../components/TheContributor.vue";
import { useNodeHeader } from "@/store/nodeHeader";

const headerStore = useNodeHeader();
const results = ref([]);
const isLoading = ref(true);
const DELAY_FOR_CHECKING_DATA = 1000;

// Computed Properties
const loader = computed(() => isLoading.value);

// Watchers
watch(
  () => headerStore.stereumTesters,
  (newTesters) => updateResults(newTesters, "feedback, testing & suggestions"),
  { immediate: true }
);

watch(
  () => headerStore.stereumTranslators,
  (newTranslators) => updateResults(newTranslators, "translation"),
  { immediate: true }
);

// Lifecycle Hooks
onMounted(handleCreditType);

onUnmounted(clearComponentState);

// Methods
function handleCreditType() {
  isLoading.value = true;
  if (headerStore.choosedCreditType === "technical contribution") {
    fetchGithubContributors();
  } else {
    setTimeout(() => {
      isLoading.value = results.value.length === 0;
    }, DELAY_FOR_CHECKING_DATA);
  }
}

function updateResults(newData, creditType) {
  if (headerStore.choosedCreditType === creditType) {
    results.value = newData;
    isLoading.value = false;
  }
}

async function fetchGithubContributors() {
  try {
    const response = await fetch("https://api.github.com/repos/stratisproject/stratis-node/contributors");
    if (!response.ok) throw new Error("Network response was not ok");
    const contributors = await response.json();
    results.value = contributors.map((contributor, index) => ({
      id: index,
      name: contributor.login,
      avatar: contributor.avatar_url,
      score: contributor.contributions,
    }));
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    isLoading.value = false;
  }
}

function getClass(index) {
  if (headerStore.choosedCreditType === "translation") return {};
  return {
    "gold-border": index === 0,
    "silver-border": index === 1,
    "bronze-border": index === 2,
  };
}

function clearComponentState() {
  results.value = [];
  isLoading.value = true;
}
</script>

<style scoped>
.contributors-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(250px, auto);
  gap: 10px;
  max-height: 408px;
  overflow-y: auto;
  justify-content: center;
  align-items: center;
}

.gold-border {
  border: 2px solid gold;
}
.silver-border {
  border: 2px solid silver;
}
.bronze-border {
  border: 2px solid #cd7f32;
}

.technical-box_parent {
  display: flex;
  justify-content: center;
  align-items: center;
}

.loader {
  width: 100%;
  height: 70%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
}
.spinner-square {
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
}
.square {
  width: 5%;
  height: 40%;
  border-radius: 20px;
  margin-right: 5%;
}

.square-1 {
  animation: square-anim 1200ms 0s infinite;
}

.square-2 {
  animation: square-anim 1200ms 200ms infinite;
}

.square-3 {
  animation: square-anim 1200ms 400ms infinite;
}

@keyframes square-anim {
  0% {
    height: 40%;
    background-color: #336666;
  }
  20% {
    height: 40%;
  }
  40% {
    height: 80%;
    background-color: #478e8e;
  }
  80% {
    height: 40%;
  }
  100% {
    height: 40%;
    background-color: #336666;
  }
}
</style>
