import { defineStore } from "pinia";
export const useNodeManage = defineStore("nodeManage", {
  state: () => {
    return {
      //  Beginning Custom Service
      customConfig: {
        image: "",
        entrypoint: "",
        command: "",
        paths: [],
        ports: [],
      },

      //End Custom Service
      externalConsensusSelectedService: "",
      reloadEditBody: false,
      isLineHidden: false,
      lines: [],
      hideConnectingLines: false,
      addConfigButton: false,
      nodeConfigs: [
        { id: 1, configName: "config", status: true },
        { id: 2, configName: "config", status: false },
        { id: 3, configName: "config", status: false },
        { id: 4, configName: "config", status: false },
        { id: 5, configName: "config", status: false },
        { id: 6, configName: "config", status: false },
      ],
      isDrawerOpen: false,
      architecture: "",
      selectedServiceToResync: {},
      availableBlocks: [],
      checkedRelays: [],
      usedBlocks: [],
      relaysList: [],
      newConfiguration: [],
      selectedItemToRemove: [],
      actionContents: [
        {
          id: 1,
          content: "INSTALL",
          contentIcon: require("../../public/img/icon/edit-node-icons/add-service.png"),
        },
        {
          id: 2,
          content: "DELETE",
          contentIcon: require("../../public/img/icon/edit-node-icons/remove-service.png"),
        },
        {
          id: 3,
          content: "MODIFY",
          contentIcon: require("../../public/img/icon/edit-node-icons/modify-service.png"),
        },
        {
          id: 5,
          content: "SWITCH CLIENT",
          contentIcon: require("../../public/img/icon/edit-node-icons/switch-client.png"),
        },
        {
          id: 6,
          content: "CHANGE NETWORK",
          contentIcon: require("../../public/img/icon/edit-node-icons/change-network.png"),
        },
      ],
      confirmChanges: [],
      disableConfirmButton: false,
      displayNetworkList: false,
      networkList: [
        {
          id: 1,
          name: "Stratis Mainnet",
          network: "stratis",
          icon: "/img/icon/network-icons/stratis-mainnet.png",
          currencyIcon: "/img/icon/control-page-icons/mainnet-currency-symbol.png",
          dataEndpoint: "https://beacon.stratisevm.com/api/v1",
          support: ["staking"],
        },

        {
          id: 2,
          name: "Auroria Testnet",
          network: "auroria",
          icon: "/img/icon/network-icons/ethereum-testnet-icon.png",
          currencyIcon: "/img/icon/control-page-icons/network-currency-icons/network-currency-icons-goerli-testnet.png",
          dataEndpoint: "https://auroria.stratisevm.com/api/v1",
          support: ["staking"],
        },
      ],
      currentNetwork: {},
      selectedNetwork: null,
      configNetwork: {},
      catDefult: "select a category",
    };
  },
  getters: {},
  actions: {
    addRelay(relay) {
      this.checkedRelays.push(relay);
    },
    removeRelay(relay) {
      this.checkedRelays.splice(this.checkedRelays.indexOf(relay), 1);
    },
  },
});
