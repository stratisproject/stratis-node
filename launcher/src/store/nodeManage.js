import { defineStore } from "pinia";
export const useNodeManage = defineStore("nodeManage", {
  state: () => {
    return {
      //Installed services on edit page
      newConfiguration: [],
      // End of Installed services on edit page

      //  Beginning Custom Service
      customConfig: {
        image: "",
        entrypoint: "",
        command: "",
        paths: [],
        ports: [],
      },

      //End Custom Service

      // Beginning of Drawer Box
      isDrawerOpen: false,
      isDrawerMenuActive: false,
      isSetupsDrawerActive: false,
      isServicesDrawerActive: false,

      // End of Drawer Box

      //Import Setup Yaml File
      isImportSetupYamlActive: false,

      externalConsensusSelectedService: "",
      reloadEditBody: false,
      isLineHidden: false,
      lines: [],
      hideConnectingLines: false,
      addConfigButton: false,
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
          name: "Xertra Mainnet",
          network: "stratis",
          icon: "/img/icon/network-icons/xertra-mainnet.png",
          currencyIcon: "/img/icon/control-page-icons/mainnet-currency-symbol.png",
          dataEndpoint: "https://beacon.xertra.com/api/v1",
          support: ["staking"],
        },

        {
          id: 2,
          name: "Auroria Testnet",
          network: "auroria",
          icon: "/img/icon/network-icons/auroria.png",
          currencyIcon: "/img/icon/control-page-icons/network-currency-icons/network-currency-icons-goerli-testnet.png",
          dataEndpoint: "https://auroria.beacon.xertra.com/api/v1",
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
