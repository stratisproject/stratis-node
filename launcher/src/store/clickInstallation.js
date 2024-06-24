import { defineStore } from "pinia";

export const useClickInstall = defineStore("clickInstallation", {
  state: () => {
    return {
      startServicesAfterInstall: false,
      isConfigButtonEnbabled: false,
      installMonitoring: false,
      relayURL: "",
      checkPointSync: "",
      currentSlide: 0,
      btnActive: false,
      selectedItem: "- SELECT A SOURCE -",
      selectedLinks: null,
      selectedIcon: null,
      syncType: [
        {
          id: 1,
          name: "genesis",
          type: "Syncs from genesis",
          displayCategory: "Syncs from genesis",
          display: false,
        },
      ],
      selectedNetwork: {},
      installationPath: "/opt/stereum",
      selectedPreset: null,
      installation: [
        {
          img: "/img/icon/one-click-installer.png",
          img2: "/img/icon/welcome-page-icons/oneclick-install.png",
          path: "/selectPlugin",
        },
        {
          img: "/img/icon/custom_installer.png",
          img2: "img/icon/welcome-page-icons/custom-install.png",
          path: "/manage",
        },
        {
          img: "/img/icon/IMPORT_CONFIGURATIONS.png",
          img2: "/img/icon/welcome-page-icons/config-import.png",
          path: "/",
        },
      ],
      presets: [
        {
          id: 0,
          name: "staking",
          defaultPath: "/opt/stereum",
          icon: "/img/icon/one-click-icons/preset-icons/staking-preset.png",
          serviceAvailable: true,
          includedPlugins: [],
        },
        // {
        //   id: 1,
        //   name: "mev boost",
        //   defaultPath: "/opt/stereum",
        //   icon: "/img/icon/one-click-icons/preset-icons/mev-staking-preset.png",
        //   showDropDown: false,
        //   includedPlugins: [],
        // },
        // {
        //   id: 2,
        //   name: "ssv.network",
        //   defaultPath: "/opt/stereum",
        //   icon: "/img/icon/one-click-icons/preset-icons/ssv-network-preset.png",
        //   includedPlugins: [],
        // },
        // {
        //   id: 5,
        //   name: "archive",
        //   defaultPath: "/opt/stereum",
        //   icon: "/img/icon/one-click-icons/preset-icons/archive-preset.png",
        //   includedPlugins: [],
        // },
      ],
      services: [
        {
          serviceName: "grafana",
          icon: "/img/icon/service-icons/Other/Grafana-s.png",
          linkUrl: "https://stereum.net",
        },
        {
          serviceName: "prometheus",
          icon: "/img/icon/service-icons/Other/Prometheus-s.png",
          linkUrl: "https://stereum.net",
        },
        // {
        //   serviceName: "ssv",
        //   icon: "/img/icon/service-icons/Other/ssv-network-s.png",
        //   linkUrl: "https://stereum.net",
        // },
      ],
      filteredPluginsToChange: [],

      customAnimations: [
        { id: 1, src: "/animation/custom-start.gif", alt: "Animation", display: false },
        { id: 2, src: "/animation/custom-loop.gif", alt: "Animation", display: false },
      ],
      unzippedData: [],
      configServices: [],
      removedServices: [],
      configNetwork: {},
      stratis: [],
      auroria: [],
    };
  },
  actions: {},
});
