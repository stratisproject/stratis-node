import { defineStore } from "pinia";

export const useControlStore = defineStore("theControl", {
  state: () => {
    return {
      currentConsensusIcon: "",
      currentExecutionIcon: "",
      synchronizationError: false,
      synchronizationErrorControl: false,
      pageNumber: 1,
      consensusName: "",
      request: [],
      deleteKey: false,
      generateModalShow: false,
      currentSlotData: null,
      currentEpochData: null,
      currentResult: {},
      noDataFlag: false,
      ServerName: null,
      ipAddress: null,
      totalRam: null,
      usedRam: null,
      totalDisk: null,
      availDisk: null,
      usedPerc: null,
      cpu: null,
      rx: null,
      tx: null,
      readValue: null,
      writeValue: null,
      code: null,
      syncstatus: [],
      p2pstatus: [],
      rpcstatus: null,
      wsstatus: null,
      beaconstatus: null,
      portstatus: [],
      storagestatus: [],
      balancestatus: null,
      consensusClientsData: [
        {
          name: "prysm",
          img: "/img/icon/service-icons/consensus/Prysm.png",
        },
      ],
      executionClientsData: [
        {
          name: "geth",
          img: "/img/icon/service-icons/execution/Geth.png",
        },
      ],
    };
  },
  actions: {},
});
