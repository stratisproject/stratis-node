import { GethService } from "./ethereum-services/GethService";
import { SSVNetworkService } from "./ethereum-services/SSVNetworkService";
import { SSVDKGService } from "./ethereum-services/SSVDKGService";
import { CharonService } from "./ethereum-services/CharonService";
import { PrometheusService } from "./ethereum-services/PrometheusService";
import { PrometheusNodeExporterService } from "./ethereum-services/PrometheusNodeExporterService";
import { GrafanaService } from "./ethereum-services/GrafanaService";
import { PrysmBeaconService, checkpointSyncUrls } from "./ethereum-services/PrysmBeaconService";
import { PrysmValidatorService } from "./ethereum-services/PrysmValidatorService";
import { FlashbotsMevBoostService } from "./ethereum-services/FlashbotsMevBoostService";
import { ServicePort, servicePortProtocol, changeablePorts } from "./ethereum-services/ServicePort";
import { StringUtils } from "./StringUtils";
import { ServiceVolume } from "./ethereum-services/ServiceVolume";
import { Web3SignerService } from "./ethereum-services/Web3SignerService";
import { MetricsExporterService } from "./ethereum-services/MetricsExporterService";
import { ExternalConsensusService } from "./ethereum-services/ExternalConsensusService";
import { ExternalExecutionService } from "./ethereum-services/ExternalExecutionService";
import { CustomService } from "./ethereum-services/CustomService";
import { LssEjectorService, stakingContractAddresses } from "./ethereum-services/LssEjectorService";
import { ConfigManager } from "./ConfigManager";
import YAML from "yaml";
// import { file } from "jszip";
// import { config } from "process";
const axios = require("axios");
const path = require("path");
const log = require("electron-log");
const yaml = require("js-yaml");

async function Sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * desired states of a service
 */
export const serivceState = {
  restarted: "restarted",
  started: "started",
  stopped: "stopped",
};

export class ServiceManager {
  constructor(nodeConnection) {
    this.nodeConnection = nodeConnection;
    this.configManager = new ConfigManager(this.nodeConnection);
    this.watchSSVDKGLock = false;
    this.lastKnownOperatorIdCheckUnixTime = 0;
  }

  /**
   * Set the desired state of a service.
   *
   * @param serviceId service's id
   * @param state a string with the desired state, see serivceState
   * @returns an object containing a reference to the ansible process output, usable with NodeConnection.playbookStatus
   */
  manageServiceState(serviceId, state) {
    const extraVars = {
      stereum_role: "manage-service",
      stereum_args: {
        manage_service: {
          state: state,
          configuration: {
            id: serviceId,
          },
        },
      },
    };
    return this.nodeConnection.runPlaybook(state.replace("ed", "ing Service"), extraVars);
  }

  /**
   * Read the service configurations.
   *
   * @returns an array of all service configurations
   */
  async readServiceConfigurations() {
    return this.nodeConnection
      .listServicesConfigurations()
      .then(async (services) => {
        const serviceConfigurations = new Array();
        for (let i = 0; i < services.length; i++) {
          const service = services[i];
          await this.nodeConnection.readServiceConfiguration(service).then((config) => {
            serviceConfigurations.push(config);
          });
        }

        return serviceConfigurations;
      })
      .then((serviceConfigurations) => {
        const services = new Array();

        for (let i = 0; i < serviceConfigurations.length; i++) {
          const config = serviceConfigurations[i];

          if (config.service) {
            if (config.service == "GethService") {
              services.push(GethService.buildByConfiguration(config));
            } else if (config.service == "SSVNetworkService") {
              services.push(SSVNetworkService.buildByConfiguration(config));
            } else if (config.service == "SSVDKGService") {
              services.push(SSVDKGService.buildByConfiguration(config));
            } else if (config.service == "PrometheusService") {
              services.push(PrometheusService.buildByConfiguration(config));
            } else if (config.service == "PrometheusNodeExporterService") {
              services.push(PrometheusNodeExporterService.buildByConfiguration(config));
            } else if (config.service == "GrafanaService") {
              services.push(GrafanaService.buildByConfiguration(config));
            } else if (config.service == "PrysmBeaconService") {
              services.push(PrysmBeaconService.buildByConfiguration(config));
            } else if (config.service == "PrysmValidatorService") {
              services.push(PrysmValidatorService.buildByConfiguration(config));
            } else if (config.service == "FlashbotsMevBoostService") {
              services.push(FlashbotsMevBoostService.buildByConfiguration(config));
            } else if (config.service == "Web3SignerService") {
              services.push(Web3SignerService.buildByConfiguration(config));
            } else if (config.service == "MetricsExporterService") {
              services.push(MetricsExporterService.buildByConfiguration(config));
            } else if (config.service == "CharonService") {
              services.push(CharonService.buildByConfiguration(config));
            } else if (config.service == "ExternalConsensusService") {
              services.push(ExternalConsensusService.buildByConfiguration(config));
            } else if (config.service == "ExternalExecutionService") {
              services.push(ExternalExecutionService.buildByConfiguration(config));
            } else if (config.service == "CustomService") {
              services.push(CustomService.buildByConfiguration(config));
            } else if (config.service == "LssEjectorService") {
              services.push(LssEjectorService.buildByConfiguration(config))
            }
          } else {
            log.error("found configuration without service!");
            log.error(config);
            throw new Error("configuration without service specified");
          }
        }
        //retrieve full service out of minimal config
        services.forEach((service) => {
          if (service.dependencies.executionClients.length > 0) {
            service.dependencies.executionClients = service.dependencies.executionClients.map((client) => {
              return services.find((dependency) => dependency.id === client.id);
            });
          }
          if (service.dependencies.consensusClients.length > 0) {
            service.dependencies.consensusClients = service.dependencies.consensusClients.map((client) => {
              return services.find((dependency) => dependency.id === client.id);
            });
          }
          if (service.dependencies.mevboost.length > 0) {
            service.dependencies.mevboost = service.dependencies.mevboost.map((client) => {
              return services.find((dependency) => dependency.id === client.id);
            });
          }
          if (service.dependencies.otherServices?.length > 0) {
            service.dependencies.otherServices = service.dependencies.otherServices.map((client) => {
              return services.find((dependency) => dependency.id === client.id);
            });
          }
        });
        return services;
      })
      .catch((err) => {
        log.error(err);
        return [];
      });
  }

  async chooseServiceAction(action, service, data) {
    switch (action) {
      case "pruneGeth":
        if (service.service === "GethService") {
          service.yaml = await this.nodeConnection.readServiceYAML(service.config.serviceID);
          let data = service.yaml + "\nisPruning: true";
          await this.nodeConnection.writeServiceYAML({
            id: service.config.serviceID,
            data: data,
            service: service.service,
          });
          this.nodeConnection.runPlaybook("Pruning Geth", {
            stereum_role: "prune-geth",
            geth_service: service.config.serviceID,
          });
        }
        break;

      case "reSync":
        await this.resyncService(service, data);
        break;

      default:
        break;
    }
  }

  async restartService(client) {
    if (client.state == "running") {
      await this.manageServiceState(client.config.serviceID, "stopped");
    }
    await this.manageServiceState(client.config.serviceID, "started");
  }

  async resyncService(serviceID, checkpointUrl) {
    let services = await this.readServiceConfigurations();
    let client = services.find((service) => service.id === serviceID);

    const dataDir = client.volumes.find(
      (vol) =>
        vol.servicePath === "/opt/app/beacon" ||
        vol.servicePath === "/opt/app/data" ||
        vol.servicePath === "/opt/data/geth"
    ).destinationPath;

    let result = await this.nodeConnection.sshService.exec(`test -d ${dataDir}/ `);

    if (dataDir.length > 0 && result.rc == 0) {
      await this.manageServiceState(serviceID, "stopped");
      await this.deleteDataVolume(dataDir);
    }

    this.updateSyncCommand(client, checkpointUrl);

    await this.nodeConnection.writeServiceConfiguration(client.buildConfiguration());
    await this.manageServiceState(serviceID, "started");
  }

  updateSyncCommand(client, checkpointUrl) {
    const checkpointCommands = {
      PrysmBeaconService: "--checkpoint-sync-url=",
    };

    let isString = false;
    let command = client.command;
    if (typeof command === "string") {
      isString = true;
      command = command.replaceAll(/\n/gm, "").replaceAll(/\s\s+/gm, " ").split(" ");
    }

    //check if command is used
    const checkpointSyncIndex = command.findIndex((c) => c.includes(checkpointCommands[client.service]));
    //delete checkpointSync if used
    if (checkpointSyncIndex > -1) {
      command.splice(checkpointSyncIndex, 1);
    }
    // remove genesisSync if used
    if (genesisSyncCommands[client.service]) command = command.filter((c) => !c.includes(genesisSyncCommands[client.service]));
    //add checkpointSync if Url was send
    if (checkpointUrl && checkpointCommands[client.service]) {
      command.push(checkpointCommands[client.service] + checkpointUrl);
    }

    if (isString) {
      client.command = command.join(" ").trim();
    } else {
      client.command = command;
    }
  }

  async deleteDataVolume(dataDir) {
    await this.nodeConnection.sshService.exec(`rm -r ${dataDir}/*`);
  }

  async deleteSlasherVolume(serviceID) {
    let services = await this.readServiceConfigurations();
    let service = services.find((s) => s.id === serviceID);
    let workingDir = this.getWorkindDir(service);
    if (!workingDir.endsWith("/")) {
      workingDir += "/";
    }
    await this.nodeConnection.sshService.exec(`rm -r ${workingDir}/slasher`);
  }

  getWorkindDir(service) {
    if (service.volumes.length > 0) {
      let volumeWithID = service.volumes.find((v) => v.destinationPath.includes(service.id));
      if (volumeWithID && volumeWithID.destinationPath) return volumeWithID.destinationPath.replace(new RegExp(`(?<=${service.id}).*`), "");
    }
    return undefined;
  }

  changePort(service, port) {
    let portIndex = service.ports.findIndex((p) => p.servicePort == changeablePorts[service.service]);
    if (portIndex != -1) {
      service.ports[portIndex].destinationPort = port;
    }
    return service;
  }

  async modifyServices(tasks, services, newInstallTasks) {
    let modifiedServices = [];

    for (let task of tasks) {
      let ssvConfig;
      let service = services.find((s) => s.id === task.service.config.serviceID);
      let dependencies = task.data.executionClients.concat(task.data.consensusClients, task.data.otherServices).map((s) =>
        services.find((e) => {
          if (e.id === s.config.serviceID) {
            return true;
          } else if (
            newInstallTasks &&
            newInstallTasks.length > 0 &&
            e.id === newInstallTasks.find((i) => i.service.id === s.id).service.config.serviceID
          ) {
            return true;
          }
          return false;
        })
      );

      if (service.service === "FlashbotsMevBoostService") {
        modifiedServices.push(service);
        let dependenciesToRemove = services.filter((s) => s.dependencies.mevboost.map((m) => m.id).includes(service.id));
        dependenciesToRemove.forEach((dependency) => {
          modifiedServices.push(this.removeDependencies(dependency, service));
        });
      }

      if (service.service === "SSVNetworkService") {
        let result = await this.nodeConnection.readSSVNetworkConfig(service.id);
        ssvConfig = YAML.parse(result);
      }

      if (task.data.port) {
        service = this.changePort(service, task.data.port);
      }
      let updated = this.addDependencies(service, dependencies, ssvConfig);
      if (service.service === "SSVNetworkService") {
        await this.nodeConnection.writeSSVNetworkConfig(service.id, YAML.stringify(ssvConfig));
      }
      if (!Array.isArray(updated)) updated = [updated];
      updated.forEach((dep) => {
        let index = modifiedServices.findIndex((s) => s.id === dep.id);
        if (index != -1) {
          modifiedServices[index] = dep;
        } else {
          modifiedServices.push(dep);
        }
      });
    }

    await Promise.all(
      modifiedServices.map(async (service) => {
        await this.nodeConnection.writeServiceConfiguration(service.buildConfiguration());
      })
    );
  }

  addDependencies(service, dependencies, ssvConfig) {
    let command = "";
    let filter;
    let keyValuePairs = [];

    switch (service.service.replace(/(Beacon|Validator|Service)/gm, "")) {
      case "Prysm":
        if (service.service.includes("Beacon")) {
          filter = (e) => e.buildExecutionClientEngineRPCHttpEndpointUrl();
          command = "--execution-endpoint=";
        }
        if (service.service.includes("Validator")) {
          filter = (e) => e.buildConsensusClientEndpoint();
          command = "--beacon-rpc-provider=";
          service.command = this.addCommandConnection(service, command, dependencies, filter);
          filter = (e) => e.buildConsensusClientGateway();
          command = "--beacon-rpc-gateway-provider=";
        }
        break;
      case "Charon":
        filter = (e) => e.buildConsensusClientHttpEndpointUrl();
        command = "--beacon-node-endpoints=";
        break;
      case "FlashbotsMevBoost":
        return dependencies.map((client) => {
          client.command = this.addMevBoostConnection(service, client);
          client.dependencies.mevboost.push(service);
          return client;
        });
      case "SSVNetwork":
        return this.addSSVNetworkConnection(service, dependencies, ssvConfig);
      default:
        return service;
    }
    service.command = this.addCommandConnection(service, command, dependencies, filter);

    if (service.service.includes("Beacon")) {
      service.dependencies.executionClients = dependencies;

      service.volumes = service.volumes.filter((v) => v.destinationPath.includes(service.id));

      service.volumes = service.volumes.concat(
        dependencies.map((client) => {
          let destinationPath =
            client.service === "ExternalExecutionService"
              ? client.volumes.find((vol) => vol.destinationPath.includes("/engine.jwt")).destinationPath
              : client.volumes.find((vol) => vol.servicePath === "/engine.jwt").destinationPath;

          return new ServiceVolume(destinationPath, "/engine.jwt");
        })
      );
    } else if (service.service.includes("Validator") || service.service.includes("Charon")) {
      service.dependencies.consensusClients = dependencies;
    }
    return service;
  }

  addCommandConnection(service, endpointCommand, dependencies, filter) {
    let isString = false;
    let command = service.command;
    if (typeof command === "string") {
      isString = true;
      command = command.replaceAll(/\n/gm, "").replaceAll(/\s\s+/gm, " ").split(" ");
    }
    let fullCommand = command.find((c) => c.includes(endpointCommand));
    command = command.filter((c) => !c.includes(endpointCommand));
    let newProps;
    if (fullCommand) {
      newProps = [this.formatCommand(fullCommand, endpointCommand, filter, dependencies)].filter((c) => c !== undefined);
    } else {
      newProps = endpointCommand + dependencies.map(filter).join();
    }
    if (isString) {
      return command.concat(newProps).join(" ").trim();
    }
    return command.concat(newProps);
  }

  addMevBoostConnection(service, dependency) {
    let command = dependency.command;
    let isString = false;
    if (typeof command === "string") {
      isString = true;
      command = command.replaceAll(/\n/gm, "").replaceAll(/\s\s+/gm, " ").split(" ");
    }
    let builderCommand = "";
    switch (dependency.service) {
      case "PrysmBeaconService":
        builderCommand = "--http-mev-relay=";
        break;
    }
    let fullCommand = command.find((c) => c.includes(builderCommand));
    command = command.filter((c) => !c.includes(builderCommand));
    if (fullCommand) {
      fullCommand = this.formatCommand(fullCommand, builderCommand, undefined, [service.buildMevboostEndpointURL()]);
    } else {
      fullCommand = builderCommand + service.buildMevboostEndpointURL();
    }

    if (isString) return command.concat([fullCommand]).join(" ").trim();
    return command.concat([fullCommand]);
  }

  addSSVNetworkConnection(service, dependencies, ssvConfig) {
    const executionClient = dependencies.filter((d) => typeof d.buildExecutionClientWsEndpointUrl === "function")[0];
    const consensusClient = dependencies.filter((d) => typeof d.buildConsensusClientHttpEndpointUrl === "function")[0];
    ssvConfig.eth1.ETH1Addr = `${executionClient ? executionClient.buildExecutionClientWsEndpointUrl() : ""}`;
    ssvConfig.eth2.BeaconNodeAddr = `${consensusClient ? consensusClient.buildConsensusClientHttpEndpointUrl() : ""}`;
    service.dependencies.executionClients = executionClient ? [executionClient] : [];
    service.dependencies.consensusClients = consensusClient ? [consensusClient] : [];
    return service;
  }

  addENVConnction(service, dependencies, keyValuePairs) {
    keyValuePairs.forEach((pair) => {
      service.env[pair.key] = dependencies.filter(pair.filter).map(pair.value).join();
    });
  }

  removeSSVNetworkConnection(service, serviceToDelete, ssvConfigs) {
    let ssvConfig = ssvConfigs[service.id];
    if (ssvConfig.eth1.ETH1Addr.includes(serviceToDelete.id)) {
      ssvConfig.eth1.ETH1Addr = "";
    }
    if (ssvConfig.eth2.BeaconNodeAddr.includes(serviceToDelete.id)) {
      ssvConfig.eth2.BeaconNodeAddr = "";
    }
    this.nodeConnection.writeSSVNetworkConfig(service.id, YAML.stringify(ssvConfig));
  }

  removeDependencies(service, serviceToDelete) {
    //update command
    service.command = this.removeCommandConnection(
      service.command,
      serviceToDelete.service.includes("External") ? serviceToDelete.env.link : serviceToDelete.id
    );
    for (const prop in service.env) {
      if (service.env[prop].includes(serviceToDelete.id)) {
        service.env[prop] = service.env[prop]
          .split(",")
          .filter((e) => !e.includes(serviceToDelete.id))
          .join();
      }
    }
    if (service.service.includes("PrysmValidator") && serviceToDelete.service.includes("ExternalConsensus")) {
      service.command = this.removeCommandConnection(
        service.command,
        serviceToDelete.env.gateway ? serviceToDelete.env.gateway : "--beacon-rpc-gateway-provider="
      );
    }

    //update volumes
    service.volumes = service.volumes.filter((v) => !v.destinationPath.includes(serviceToDelete.id));

    //update dependencies arrays
    for (const dependency in service.dependencies) {
      service.dependencies[dependency] = service.dependencies[dependency].filter((s) => s.id != serviceToDelete.id);
    }
    return service;
  }

  removeCommandConnection(command, id) {
    let isString = false;
    if (typeof command === "string") {
      isString = true;
      command = command.replaceAll(/\n/gm, "").replaceAll(/\s\s+/gm, " ").split(" ");
    }
    let includesID = command.filter((c) => c.includes(id));
    command = command.filter((c) => !includesID.includes(c));

    let newProps = includesID
      .map((c) => {
        let command = c.match(/.*=/)[0];
        return this.formatCommand(c, command, (e) => !e.includes(id));
      })
      .filter((c) => c !== undefined);

    if (isString) return command.concat(newProps).join(" ").trim();
    return command.concat(newProps);
  }

  formatCommand(fullCommand, command, filter, dependencies) {
    let value = fullCommand.replace(command, "");
    let quotes = false;
    if (value.startsWith('"') && value.endsWith('"')) {
      quotes = true;
      value = value.substring(1, value.length - 1);
    }
    let newValue;
    if (dependencies && filter) {
      // it's intended that dependencies is only checked for truthy
      newValue = dependencies.map(filter).join();
    } else if (dependencies) {
      // same here.
      newValue = value.split(",").concat(dependencies).join();
    } else {
      newValue = value.split(",").filter(filter).join();
    }
    if (!newValue) {
      // if dependencies is an empty array it is caught here
      return undefined;
    }
    if (quotes) newValue = '"' + newValue + '"';
    return command + newValue;
  }

  async deleteService(task, tasks, services, ssvConfigs) {
    let serviceToDelete = services.find((service) => service.id === task.service.config.serviceID);
    let dependents = [];
    services.forEach((service) => {
      for (const dependency in service.dependencies) {
        service.dependencies[dependency].forEach((s) => {
          if (s.id === serviceToDelete.id) dependents.push(service);
        });
      }
    });
    for (let service of dependents) {
      service = this.removeDependencies(service, serviceToDelete);
      if (service.service === "SSVNetworkService") {
        this.removeSSVNetworkConnection(service, serviceToDelete, ssvConfigs);
      }
      this.nodeConnection.writeServiceConfiguration(service.buildConfiguration());
    }
    if (serviceToDelete.service === "Web3SignerService") {
      await this.nodeConnection.sshService.exec(
        `docker stop slashingdb-${serviceToDelete.id} && docker rm slashingdb-${serviceToDelete.id}`
      );
    }
    await this.nodeConnection.runPlaybook("Delete Service", {
      stereum_role: "delete-service",
      service: task.service.config.serviceID,
    });
  }

  async switchServices(switchTask) {
    await this.configManager.deleteServiceFromSetup(switchTask.id, switchTask.setupId);
    let services = await this.readServiceConfigurations();

    let previousService = services.find((service) => service.id === switchTask.service.config.serviceID);
    let servicesBelow = [];
    switch (switchTask.service.category) {
      case "execution":
        services.forEach((service) => {
          service.dependencies.executionClients.forEach((dependingOn) => {
            if (dependingOn.id === previousService.id) {
              servicesBelow.push(service);
            }
          });
        });
        break;
      case "consensus":
        switchTask.data.data.executionClients = previousService.dependencies.executionClients;
        switchTask.data.data.mevboost = previousService.dependencies.mevboost;
        services.forEach((service) => {
          service.dependencies.consensusClients.forEach((dependingOn) => {
            if (dependingOn.id === previousService.id) {
              servicesBelow.push(service);
            }
          });
        });
        break;
      case "validator":
        switchTask.data.data.consensusClients = previousService.dependencies.consensusClients;
        break;
    }
    try {
      let installTask = [];
      installTask.push({
        service: switchTask.data.itemToInstall,
        data: switchTask.data.data,
        setupId: switchTask.setupId,
      });

      await this.addServices(installTask, services);
    } catch (err) {
      log.error("Installing Services Failed:", err);
    }

    let newServices = await this.readServiceConfigurations();
    let newService = newServices.filter(({ id: id1 }) => !services.some(({ id: id2 }) => id2 === id1));
    if (switchTask.service.category != "validator") {
      servicesBelow.forEach((service) => {
        let newDependencies = [];
        if (switchTask.service.category === "execution") {
          service.dependencies.executionClients.forEach((dependency) => {
            newDependencies.push(dependency);
          });
        } else if (switchTask.service.category === "consensus") {
          service.dependencies.consensusClients.forEach((dependency) => {
            newDependencies.push(dependency);
          });
        }
        newDependencies.push(newService[0]);
        try {
          let updatedDep = this.addDependencies(service, newDependencies);
          this.nodeConnection.writeServiceConfiguration(updatedDep.buildConfiguration());
        } catch (err) {
          log.error("Dependencies Update Failed:", err);
        }
      });
    }
  }

  //args: network, installDir, port, executionClients, checkpointURL, consensusClients, mevboost, relays, // for external -> source, jwtToken
  getService(name, args) {
    let ports;
    let service;
    switch (name) {
      case "GethService":
        ports = [
          new ServicePort(null, 30303, 30303, servicePortProtocol.tcp),
          new ServicePort(null, 30303, 30303, servicePortProtocol.udp),
          new ServicePort("127.0.0.1", args.port ? args.port : 8545, 8545, servicePortProtocol.tcp),
          new ServicePort("127.0.0.1", 8546, 8546, servicePortProtocol.tcp),
        ];
        return GethService.buildByUserInput(args.network, ports, args.installDir + "/geth");

      case "PrysmBeaconService":
        ports = [
          new ServicePort(null, 13001, 13001, servicePortProtocol.tcp),
          new ServicePort(null, 12001, 12001, servicePortProtocol.udp),
          new ServicePort("127.0.0.1", 4000, 4000, servicePortProtocol.tcp),
          new ServicePort("127.0.0.1", args.port ? args.port : 3500, 3500, servicePortProtocol.tcp),
        ];
        return PrysmBeaconService.buildByUserInput(
          args.network,
          ports,
          args.installDir + "/prysm",
          args.executionClients,
          args.mevboost ? args.mevboost : [],
          args.checkpointURL
        );

      case "PrysmValidatorService":
        ports = [new ServicePort("127.0.0.1", args.port ? args.port : 7500, 7500, servicePortProtocol.tcp)];
        return PrysmValidatorService.buildByUserInput(args.network, ports, args.installDir + "/prysm", args.consensusClients);

      case "PrometheusNodeExporterService":
        return PrometheusNodeExporterService.buildByUserInput(args.network);

      case "PrometheusService":
        ports = [new ServicePort("127.0.0.1", args.port ? args.port : 9090, 9090, servicePortProtocol.tcp)];
        return PrometheusService.buildByUserInput(args.network, ports, args.installDir + "/prometheus");

      case "GrafanaService":
        ports = [new ServicePort("127.0.0.1", args.port ? args.port : 3000, 3000, servicePortProtocol.tcp)];
        return GrafanaService.buildByUserInput(args.network, ports, args.installDir + "/grafana");

      case "FlashbotsMevBoostService":
        return FlashbotsMevBoostService.buildByUserInput(args.network, args.relays);

      case "Web3SignerService":
        return Web3SignerService.buildByUserInput(args.network, [], args.installDir + "/web3signer");

      case "MetricsExporterService":
        return MetricsExporterService.buildByUserInput(args.network);

      case "SSVNetworkService":
        ports = [
          new ServicePort(null, 12000, 12000, servicePortProtocol.udp),
          new ServicePort(null, 13000, 13000, servicePortProtocol.tcp),
        ];
        return SSVNetworkService.buildByUserInput(
          args.network,
          ports,
          args.installDir + "/ssv_network",
          args.executionClients,
          args.consensusClients
        );
      case "CharonService":
        ports = [new ServicePort(null, 3610, 3610, servicePortProtocol.tcp)];
        return CharonService.buildByUserInput(args.network, ports, args.installDir + "/charon", args.consensusClients);

      case "ExternalExecutionService":
        ports = [];
        return ExternalExecutionService.buildByUserInput(args.network, args.installDir + "/externalExecution", args.source, args.jwtToken);
      case "ExternalConsensusService":
        ports = [];
        return ExternalConsensusService.buildByUserInput(
          args.network,
          args.installDir + "/externalConsensus",
          args.source,
          args.gateway ? args.gateway : ""
        );
      case "CustomService":
        ports = [];
        return CustomService.buildByUserInput(
          args.network,
          args.installDir + "/custom",
          args.image,
          args.entrypoint,
          args.command,
          args.ports,
          args.volumes
        );
      case "SSVDKGService":
        ports = [new ServicePort(null, 3030, 3030, servicePortProtocol.udp), new ServicePort(null, 3030, 3030, servicePortProtocol.tcp)];
        return SSVDKGService.buildByUserInput(
          args.network,
          ports,
          args.installDir + "/ssvdkg",
          args.consensusClients, // TOOD: remove later!
          args.otherServices
        );
      case "LssEjectorService":
        return LssEjectorService.buildByUserInput(
          args.network,
          args.executionClients,
          args.consensusClients,
          args.otherServices,
        )
    }
  }

  async createCachingDB(keyAPI) {
    try {
      const dbPass = StringUtils.createRandomString();
      const dbUser = "postgres";
      const dbName = "node_operator_keys_service_db";
      await this.nodeConnection.sshService.exec(
        `docker run --restart=unless-stopped --name=cachingDB-${keyAPI.id} --network=stereum -d -e POSTGRES_PASSWORD=${dbPass} -e POSTGRES_USER=${dbUser} -e POSTGRES_DB=${dbName} postgres`
      );
      keyAPI.env.DB_NAME = dbName;
      keyAPI.env.DB_USER = dbUser;
      keyAPI.env.DB_PASSWORD = dbPass;

      keyAPI.env.DB_HOST = `cachingDB-${keyAPI.id}`;
    } catch (err) {
      log.error("Creating CachingDB failed: ", err);
      await this.nodeConnection.sshService.exec(`docker stop cachingDB-${keyAPI.id} && docker rm cachingDB-${keyAPI.id}`);
    }
  }

  async initKeysAPI(services) {
    for (const service of services) {
      await this.createCachingDB(service);
      await this.nodeConnection.writeServiceConfiguration(service.buildConfiguration());
    }
  }

  async createSlashingDB(web3signer, workingDir) {
    try {
      const dbPass = StringUtils.createRandomString();
      const dbUser = "postgres";
      const dbName = "web3signer";
      await this.nodeConnection.sshService.exec(
        `docker run --restart=unless-stopped --name=slashingdb-${web3signer.id} --network=stereum -v ${workingDir}/postgresql:/opt/app/schemas -d -e POSTGRES_PASSWORD=${dbPass} -e POSTGRES_USER=${dbUser} -e POSTGRES_DB=${dbName} postgres`
      );
      const schemas = await this.nodeConnection.sshService.exec(`sleep 10s && ls -1 ${workingDir}/postgresql`);
      for (const schema of schemas.stdout.split("\n").filter((s) => s)) {
        log.info("loading " + schema + " schema...");
        const result = await this.nodeConnection.sshService.exec(
          `docker exec -u 0 -w /opt/app/schemas slashingdb-${web3signer.id} psql --echo-all --host=localhost --port=5432 --dbname=web3signer --username=postgres -f ${schema}`
        );
        log.info(`\nstdout: ${result.stdout}\nstderr: ${result.stderr}\n`);
      }
      web3signer.command.push(
        "--slashing-protection-enabled=true",
        `--slashing-protection-db-url=jdbc:postgresql://slashingdb-${web3signer.id}/${dbName}`,
        `--slashing-protection-db-username=${dbUser}`,
        `--slashing-protection-db-password=${dbPass}`,
        "--slashing-protection-pruning-enabled=true"
      );
    } catch (err) {
      log.error("Creating SlashingDB failed: ", err);
      await this.nodeConnection.sshService.exec(`docker stop slashingdb-${web3signer.id} && docker rm slashingdb-${web3signer.id}`);
    }
  }

  async initWeb3Signer(services) {
    for (const service of services) {
      await this.manageServiceState(service.id, "started");
      const workingDir = this.getWorkindDir(service);
      await this.nodeConnection.sshService.exec("docker cp stereum-" + service.id + ":/opt/web3signer/migrations/postgresql " + workingDir);
      await this.manageServiceState(service.id, "stopped");
      service.command = service.command.filter((c) => c != "--slashing-protection-enabled=false");
      await this.createSlashingDB(service, workingDir);
      await this.nodeConnection.writeServiceConfiguration(service.buildConfiguration());
    }
  }

  async createKeystores(services) {
    for (const service of services) {
      if (service.service.includes("SSVNetwork")) {
        await this.nodeConnection.runPlaybook("ssv-key-generator", {
          stereum_role: "ssv-key-generator",
          ssv_key_service: service.id,
        });
        const config = await this.nodeConnection.readServiceConfiguration(service.id);
        let ssvConfig = service.getServiceConfiguration(
          service.network,
          service.dependencies.executionClients,
          service.dependencies.consensusClients
        );
        let replacementString = "";
        if (config.ssv_sk) {
          replacementString = "OperatorPrivateKey: " + config.ssv_sk;
        } else {
          replacementString = "KeyStore:\n  PrivateKeyFile: /secrets/encrypted_private_key.json\n  PasswordFile: /secrets/password";
        }

        // prepare service's config file
        const dataDir = service.volumes.find((vol) => vol.servicePath === "/data").destinationPath;
        const escapedConfigFile = StringUtils.escapeStringForShell(ssvConfig.replace(/^OperatorPrivateKey.*/gm, replacementString));
        this.nodeConnection.sshService.exec(`mkdir -p ${dataDir} && echo ${escapedConfigFile} > ${dataDir}/config.yaml`);
      } else if (service.service.includes("External")) {
        const extConnDir = service.volumes
          .find((vol) => vol.destinationPath.includes("link.txt"))
          .destinationPath.split("/")
          .slice(0, -1)
          .join("/");
        await this.nodeConnection.sshService.exec(
          `mkdir -p ${extConnDir} && echo -e ${service.env.link} > ${extConnDir}/link.txt` +
            (service.env.gateway ? ` && echo -e ${service.env.gateway} > ${extConnDir}/gateway.txt` : "")
        );
        if (service.service.includes("Execution")) {
          await this.nodeConnection.sshService.exec(`echo -e ${service.env.jwtToken} > ${extConnDir}/engine.jwt`);
        }
      }
    }
  }

  updateInfoForDependencies(task, services, newServices, ELInstalls, CLInstalls, PInstalls, DVTInstalls) {
    if (task.data.executionClients?.length > 0) {
      task.data.executionClients = task.data.executionClients.map((ec) => {
        let id = ec.config ? ec.config.serviceID : ec.id;
        if (id) {
          return services.find((s) => s.id === id);
        }
        id = ELInstalls.find((el) => el.service.id === ec.id).service.config.serviceID;
        return newServices.find((s) => s.id === id);
      });
    }
    if (task.data.consensusClients?.length > 0) {
      task.data.consensusClients = task.data.consensusClients.map((cc) => {
        let id = cc.config ? cc.config.serviceID : cc.id;
        if (id) {
          return services.find((s) => s.id === id);
        }
        id = CLInstalls.find((el) => el.service.id === cc.id)?.service.config.serviceID;
        if (!id) {
          id = DVTInstalls.find((el) => el.service.id === cc.id).service.config.serviceID;
        }
        return newServices.find((s) => s.id === id);
      });
    }
    if (task.data.otherServices?.length > 0) {
      task.data.otherServices = task.data.otherServices.map((bc) => {
        let id = bc.config ? bc.config.serviceID : bc.id;
        if (id) {
          return services.find((s) => s.id === id);
        }
        id = PInstalls.find((el) => el.service.id === bc.id).service.config.serviceID;
        return newServices.find((s) => s.id === id);
      });
    }
  }

  async addServices(tasks, services) {
    let newServices = [];
    let setupAndServiceIds = {};
    let ELInstalls = tasks.filter((t) => t.service.category === "execution");
    ELInstalls.forEach((t) => {
      let service = this.getService(t.service.service, t.data);
      t.service.config.serviceID = service.id;
      setupAndServiceIds[service.id] = t.data.setupId;
      newServices.push(service);
    });
    let CLInstalls = tasks.filter((t) => t.service.category === "consensus");
    CLInstalls.forEach((t) => {
      this.updateInfoForDependencies(t, services, newServices, ELInstalls);
      let service = this.getService(t.service.service, t.data);
      t.service.config.serviceID = service.id;
      setupAndServiceIds[service.id] = t.data.setupId;
      newServices.push(service);
    });
    let DVTInstalls = tasks.filter((t) => /SSVNetwork|Charon/.test(t.service.service));
    DVTInstalls.forEach((t) => {
      if (t.service.service == "SSVNetworkService" && services.filter((s) => s.service === "SSVNetworkService").length) {
        // TODO: Make SSVNetworkService multiservice (which depends also on SSVDKGService)
        log.error("Multiple SSVNetworkService services currently not supported - ignoring setup!");
        return;
      }
      this.updateInfoForDependencies(t, services, newServices, ELInstalls, CLInstalls);
      let service = this.getService(t.service.service, t.data);
      t.service.config.serviceID = service.id;
      setupAndServiceIds[service.id] = t.data.setupId;
      newServices.push(service);
    });
    let VLInstalls = tasks.filter((t) => t.service.category === "validator" && !/SSVNetwork|Charon/.test(t.service.service));
    VLInstalls.forEach((t) => {
      this.updateInfoForDependencies(t, services, newServices, ELInstalls, CLInstalls, undefined, DVTInstalls);
      let service = this.getService(t.service.service, t.data);
      t.service.config.serviceID = service.id;
      setupAndServiceIds[service.id] = t.data.setupId;
      newServices.push(service);
    });
    let PInstalls = tasks.filter((t) => t.service.category === "service");
    PInstalls.forEach((t) => {
      this.updateInfoForDependencies(t, services, newServices, ELInstalls, CLInstalls, PInstalls, DVTInstalls);
      let service = this.getService(t.service.service, t.data);

      // Make sure dependencies are correctly set for MEVBoost
      if (t.data.consensusClients.length > 0 && t.service.service === "FlashbotsMevBoostService") {
        let changed = this.addDependencies(service, t.data.consensusClients);
        changed.forEach((dep) => {
          let index = newServices.findIndex((s) => s.id === dep.id);
          if (index != -1) {
            newServices[index] = dep;
          } else {
            newServices.push(dep);
          }
        });
      }
      t.service.config.serviceID = service.id;
      setupAndServiceIds[service.id] = t.data.setupId;
      newServices.push(service);
    });

    let allPorts = services
      .map((s) => s.ports)
      .flat(1)
      .map((p) => p.destinationPort + "/" + p.servicePortProtocol);
    let changed;
    newServices.forEach((service) => {
      service.ports.forEach((newPort) => {
        do {
          changed = false;
          if (
            allPorts.includes(newPort.destinationPort + "/" + newPort.servicePortProtocol) &&
            !services.map((s) => s.id).includes(service.id)
          ) {
            newPort.destinationPort++;
            changed = true;
          } else if (
            !allPorts.includes(newPort.destinationPort + "/" + newPort.servicePortProtocol) &&
            !services.map((s) => s.id).includes(service.id)
          ) {
            allPorts.push(newPort.destinationPort + "/" + newPort.servicePortProtocol);
          }
        } while (changed);
      });
    });

    let versions;
    try {
      versions = await this.nodeConnection.nodeUpdates.checkUpdates();
    } catch (err) {
      log.error(`Couldn't fetch versions in OneClickInstallation...
      Installing with predefined Versions
      ${err.name}: ${err.message}
      url: ${err.config.url}
      method: ${err.config.method}
      headers: ${err.config.headers}
      timeout: ${err.config.timeout}
      `);
    }
    newServices.forEach((service) => {
      if (versions[service.network] && versions[service.network][service.service]) {
        service.imageVersion = versions[service.network][service.service].slice(-1).pop();
      } else if (versions["stratis"] && versions["stratis"][service.service]) {
        service.imageVersion = versions["stratis"][service.service].slice(-1).pop();
      } else if (versions["auroria"] && versions["auroria"][service.service]) {
        service.imageVersion = versions["auroria"][service.service].slice(-1).pop();
      }
      if (service.switchImageTag) service.switchImageTag(this.nodeConnection.settings.stereum.settings.arch);
    });
    for (const service of newServices) {
      await this.nodeConnection.writeServiceConfiguration(
        service.buildConfiguration(),
        setupAndServiceIds[service.id] ? setupAndServiceIds[service.id] : tasks[0].setupId
      );
    }

    await this.createKeystores(
      newServices.filter(
        (s) =>
          s.service.includes("SSVNetwork") ||
          s.service.includes("External")
      )
    );
    await this.prepareSSVDKG(newServices.find((s) => s.service === "SSVDKGService"));
    await this.initWeb3Signer(newServices.filter((s) => s.service === "Web3SignerService"));
    return ELInstalls.concat(CLInstalls, VLInstalls);
  }

  async readServiceInfos(services = null) {
    const serviceConfigs = services ? services : await this.readServiceConfigurations();
    const serviceStates = await this.nodeConnection.listServices();
    if (serviceConfigs && serviceConfigs.length > 0 && serviceStates && Array.isArray(serviceStates)) {
      let newInfo = serviceConfigs.map((config) => {
        const newState = serviceStates.find((state) => state.Names.replace("stereum-", "") === config.id);
        return {
          service: config.service,
          state: newState ? newState.State : "exited",
          config: {
            serviceID: config.id,
            configVersion: config.configVersion,
            image: config.image,
            imageVersion: config.imageVersion,
            runningImageVersion: newState?.Image ? newState.Image.split(":").pop() : null,
            ports: config.ports,
            volumes: config.volumes,
            network: config.network,
            dependencies: config.dependencies,
          },
        };
      });
      return newInfo;
    }
    return [];
  }

  // Prepares the SSVDKGService on installation
  async prepareSSVDKG(service) {
    console.log("prepareSSVDKG", service);
    log.debug("prepareSSVDKG", service);
    if (!service) return;
    // Prepare service's config file
    //const ssvDkgServiceConfig = await this.nodeConnection.readServiceConfiguration(service.id);
    let ssvDkgConfig = service.getServiceConfiguration(0);
    const dataDir = service.volumes.find((vol) => vol.servicePath === "/data").destinationPath;
    const escapedConfigFile = StringUtils.escapeStringForShell(ssvDkgConfig);
    this.nodeConnection.sshService.exec(`mkdir -p ${dataDir} && echo ${escapedConfigFile} > ${dataDir}/config.yaml`);
  }

  // This one is triggered each few seconds from frontend and manages relation between SSVDKGService and SSVNetworkService
  async watchSSVDKG(_internal = false) {
    if (this.watchSSVDKGLock && _internal != "_internal") {
      return;
    }
    this.watchSSVDKGLock = true;
    try {
      // General tasks:
      // - Regularly check last known operator ID and update if needed
      // - Add or remove secrets volume to DKG container
      // - Adjust SSV operator ID in DKG config file
      // - Restart the DKG container if chages was applied

      const from = _internal == "_internal" ? " (internal)" : "";
      log.silly(`watchSSVDKG -> Run${from}...`);

      const services = await this.readServiceConfigurations();
      const serviceInfos = await this.readServiceInfos(services);
      const SSVDKGService = services.find((s) => s.service === "SSVDKGService");
      const SSVNetworkService = services.find((s) => s.service === "SSVNetworkService");
      const SSVDKGClient = serviceInfos.find((s) => s.service === "SSVDKGService");
      //const SSVNetworkClient = serviceInfos.find((s) => s.service === "SSVNetworkService");

      let getSSVTotalConfig;
      try {
        if (SSVNetworkService.id) getSSVTotalConfig = await this.nodeConnection.getSSVTotalConfig(SSVNetworkService.id);
      } catch (e) {}
      let getSSVDKGTotalConfig;
      try {
        if (SSVDKGService.id) getSSVDKGTotalConfig = await this.nodeConnection.getSSVDKGTotalConfig(SSVDKGService.id);
      } catch (e) {}

      const ssvTotalConfig = getSSVTotalConfig;
      const ssvDkgTotalConfig = getSSVDKGTotalConfig;

      // Disable watch if "nossvwatch: true" is set in DGK service config (DKG container expert mode)
      const nowatch = ssvDkgTotalConfig?.ssvDkgServiceConfig?.nossvwatch;
      if (nowatch) {
        log.debug("watchSSVDKG disabled by SSV DKG service setting -> nossvwatch: true");
        return;
      }

      // console.log("TTT :: SSVDKGService", SSVDKGService);
      // console.log("TTT :: SSVNetworkService", SSVNetworkService);
      // console.log("TTT :: ssvTotalConfig", ssvTotalConfig);
      // console.log("TTT :: ssvDkgTotalConfig", ssvDkgTotalConfig);
      // console.log("TTT :: services", services);
      // console.log("TTT :: serviceInfos", serviceInfos);
      //await new Promise((r) => setTimeout(r, 2000000));

      // If SSVNetworkService exists:
      // Regularly check and update last known operator ID (if needed)
      // Note that the last known operator ID is set in SsvModal.vue instantly on key import (*IF REGISTERED*).
      // Therefore it is ok to run this check a bit less frequent here to avoid API spamming.
      if (ssvTotalConfig) {
        const checkLastKnownOperatorIdInterval = 20;
        const uxtsNow = Math.floor(Date.now() / 1000);
        const elapsedSeconds = uxtsNow - this.lastKnownOperatorIdCheckUnixTime;
        let currentNetwork = SSVNetworkService.network;
        let lastKnownPublicKey = ssvTotalConfig.lastKnownPublicKeyFileData;
        let lastKnownOperatorId = ssvTotalConfig.lastKnownOperatorId;
        if (lastKnownPublicKey && elapsedSeconds >= checkLastKnownOperatorIdInterval) {
          log.silly("Check last known operator ID");
          this.lastKnownOperatorIdCheckUnixTime = uxtsNow;
          const result = await this.nodeConnection.getSSVOperatorDataFromApi(currentNetwork, lastKnownPublicKey, false);
          if (!result.code) {
            const operatorId = result.data.operatorData.id;
            if (lastKnownOperatorId != operatorId) {
              log.info(`Set last known operator ID to ${operatorId}`);
              try {
                await this.nodeConnection.setSSVLastKnownOperatorId(SSVNetworkService.id, operatorId);
                return await this.watchSSVDKG("_internal"); // refresh
              } catch (e) {
                log.error(`Failed to set last known operator ID to ${operatorId} (${e.message})`);
              }
            } else {
              log.silly(`The last known operator ID ${operatorId} is up to date`);
            }
          } else if (result.code == 99 && lastKnownOperatorId) {
            // At this point the opertor is not registered *anymore* at SSV (thus, was previously)
            // Do *never* remove the last know operator id file, not even on result.code == 99!
            // Istead advice the user to reinstall the SSVNetworkService and import an existing or register a new operator.
            log.silly(`The last known operator ID is set but wont be updated anymore (${result.info})`);
          } else {
            // No matter if already set or not, no update in errors...
            log.silly(`The last known operator ID wont be updated (${result.info})`);
          }
        } else if (lastKnownPublicKey) {
          const nextCheckInSeconds =
            elapsedSeconds > checkLastKnownOperatorIdInterval
              ? elapsedSeconds - checkLastKnownOperatorIdInterval
              : checkLastKnownOperatorIdInterval - elapsedSeconds;
          log.silly(`Next check for last known operator ID in ${nextCheckInSeconds} seconds`);
        }
      }

      // If SSVDKGService exists:
      // 1. Add or remove secrets volume to DKG container
      // 2. Adjust SSV operator ID in DKG config file
      // 3. Restart the DKG container if chages was applied
      // .. depending if SSVNetworkService exists and/or operator is registered
      if (ssvDkgTotalConfig) {
        // Option to log changes
        let changes = false;

        // 1. Add or remove secrets volume to DKG container
        log.silly("Check shared secrets volume at DKG container");
        // Set dataDir and secretsDir that is *currently* added to SSVDKGService
        const dataDir = SSVDKGService.volumes.find((vol) => vol.servicePath === "/data").destinationPath;
        const secretsDir = SSVDKGService.volumes.find((vol) => vol.servicePath === "/secrets").destinationPath;
        // Set local secretsDir that that is added to SSVDKGService by default on installation
        const workingDir = path.dirname(dataDir);
        const localSecretsDir = workingDir + "/secrets";
        const localSecretsVolume = new ServiceVolume(localSecretsDir, "/secrets");
        if (ssvTotalConfig) {
          // Change local (SSVDKGService) secrets volume with shared (SSVNetworkService) secrets volume
          if (!secretsDir.includes(SSVNetworkService.id)) {
            log.silly("SSVNetworkService exists");
            log.info("Add shared secrets volume to DKG container");
            const index = SSVDKGService.volumes.findIndex((vol) => vol.servicePath === "/secrets");
            if (index !== -1) {
              SSVDKGService.volumes.splice(index, 1);
            }
            SSVDKGService.volumes.push(new ServiceVolume(ssvTotalConfig.ssvSecretsDir, "/secrets"));
            await this.nodeConnection.writeServiceConfiguration(SSVDKGService.buildConfiguration());
            changes = true;
          } else {
            log.silly("Shared secrets volume already added to DKG container");
          }
        } else {
          // Change shared (SSVNetworkService) secrets volume with local (SSVDKGService) secrets volume
          if (!secretsDir.includes(SSVDKGService.id)) {
            log.silly("SSVNetworkService does not exist");
            log.info("Add local secrets volume to DKG container");
            const index = SSVDKGService.volumes.findIndex((vol) => vol.servicePath === "/secrets");
            if (index !== -1) {
              SSVDKGService.volumes.splice(index, 1);
            }
            SSVDKGService.volumes.push(localSecretsVolume);
            await this.nodeConnection.writeServiceConfiguration(SSVDKGService.buildConfiguration());
            changes = true;
          } else {
            log.silly("Local secrets volume already added to DKG container");
          }
        }

        // 2. Adjust SSV operator ID in DKG config
        if (ssvTotalConfig) {
          // Set operator ID to last known operator ID (revert or 0) in DKG config file (if needed)
          if (ssvTotalConfig.lastKnownOperatorId && ssvDkgTotalConfig.operatorId != ssvTotalConfig.lastKnownOperatorId) {
            log.silly("SSVNetworkService exists");
            log.info(`Update operator ID in DKG config file to ${ssvTotalConfig.lastKnownOperatorId}`);
            ssvDkgTotalConfig.ssvDkgConfig.operatorID = parseInt(ssvTotalConfig.lastKnownOperatorId, 10);
            const ssvDkgConfigYamlString = YAML.stringify(ssvDkgTotalConfig.ssvDkgConfig);
            await this.nodeConnection.writeSSVDKGConfig(SSVDKGClient.config.serviceID, ssvDkgConfigYamlString);
            changes = true;
          } else if (!ssvTotalConfig.lastKnownOperatorId && ssvDkgTotalConfig.operatorId) {
            // This case shouldn't happen without strange end-user activities (e.g.: removing last_known_* files on shell..)
            log.silly("SSVNetworkService does not exist");
            log.info(`Revert operator ID in DKG config file to 0`);
            ssvDkgTotalConfig.ssvDkgConfig.operatorID = 0;
            const ssvDkgConfigYamlString = YAML.stringify(ssvDkgTotalConfig.ssvDkgConfig);
            await this.nodeConnection.writeSSVDKGConfig(SSVDKGClient.config.serviceID, ssvDkgConfigYamlString);
            changes = true;
          } else {
            log.silly(`The operator ID ${ssvDkgTotalConfig.operatorId} is up to date in DKG config file`);
          }
        } else {
          // Reset operator ID to 0 in DKG config file (if needed)
          if (ssvDkgTotalConfig.operatorId) {
            log.silly("SSVNetworkService does not exist");
            log.info(`Reset operator ID in DKG config file to 0`);
            ssvDkgTotalConfig.ssvDkgConfig.operatorID = 0;
            const ssvDkgConfigYamlString = YAML.stringify(ssvDkgTotalConfig.ssvDkgConfig);
            await this.nodeConnection.writeSSVDKGConfig(SSVDKGClient.config.serviceID, ssvDkgConfigYamlString);
            changes = true;
          } else {
            log.silly(`The operator ID ${ssvDkgTotalConfig.operatorId} is up to date in DKG config file`);
          }
        }

        // 3. Restart the DKG container if chages was applied
        if (changes) {
          if (SSVDKGClient.state == "running" || SSVDKGClient.state == "restarting") {
            log.info("Restart DKG container");
            await this.restartService(SSVDKGClient);
          }
          return await this.watchSSVDKG("_internal"); // refresh
        }
      }
    } catch (e) {
      log.debug("watchSSVDKG -> Catched unhandled error ->", e);
    } finally {
      if (_internal != "_internal") {
        // Sleep to avoid API or disk spamming
        let secsleep = 10;
        log.silly(`watchSSVDKG -> Sleep ${secsleep} seconds...`);
        await new Promise((r) => setTimeout(r, secsleep * 1000));
        // Release lock
        log.silly("watchSSVDKG -> Finally");
        this.watchSSVDKGLock = false;
      }
    }
  }

  //make sure there are no double tasks
  static uniqueByID(job) {
    return (value, index, self) =>
      self.map((t) => t.service.config.serviceID).indexOf(value.service.config.serviceID) === index && value.content === job;
  }

  //remove all service data
  async removeServiceData(services) {
    services = [].concat(services);
    for (const service of services) {
      if (service.volumes.length > 0) {
        //get service data path
        let path = this.getWorkindDir(service);
        await this.nodeConnection.sshService.exec("rm -rf " + path);
      }
    }
  }

  changeNetworkCommand(newNetwork, service) {
    let command = service.command;
    let isString = false;
    if (typeof command === "string") {
      isString = true;
      command = command.replaceAll(/\n/gm, "").replaceAll(/\s\s+/gm, " ").split(" ");
    }
    if (newNetwork === 'stratis') {
      newNetwork = 'mainnet'
    }
    if (service.service === "FlashbotsMevBoostService") {
      command = service.entrypoint;
      let index = command.findIndex((c) => /^-(mainnet|stratis|auroria$)/.test(c));
      command[index] = "-" + newNetwork;
      index = command.findIndex((c) => c === "-relays") + 1;
      command[index] = '""';
    } else if (service.service === "PrysmBeaconService") {
      let networkIndex = command.findIndex((c) => /--(mainnet|stratis|auroria)/.test(c));
      if (networkIndex !== -1) {
        command[networkIndex] = "--" + newNetwork;
      } else {
        command.push(`--${newNetwork}`)
      }

      const checkpointSyncIndex = command.findIndex(c => /--checkpoint-sync-url/.test(c))
      if (checkpointSyncIndex !== -1) {
        command[checkpointSyncIndex] = `--checkpoint-sync-url=${checkpointSyncUrls[newNetwork === 'mainnet' ? 'stratis' : newNetwork]}`
      }
    } else if (service.service === 'LssEjectorService') {
      const index = command.findIndex(c => /--staking_address/.test(c))
      command[index] = `--staking_address=${stakingContractAddresses[newNetwork === 'mainnet' ? 'stratis' : newNetwork]}`
    } else {
      let networkIndex = command.findIndex((c) => /--(mainnet|stratis|auroria)/.test(c));
      if (networkIndex !== -1) {
        command[networkIndex] = "--" + newNetwork;
      } else {
        command.push(`--${newNetwork}`)
      }
    }
    if (isString) return command.join(" ").trim();
    return command;
  }

  async changeNetwork(newNetwork, services) {
    await this.removeServiceData(services);
    for (let service of services) {
      if (service.service === "FlashbotsMevBoostService") {
        service.entrypoint = this.changeNetworkCommand(newNetwork, service);
      } else {
        service.command = this.changeNetworkCommand(newNetwork, service);
      }
      service.network = newNetwork;
    }
    await this.createKeystores(services);
    services.sort((a, b) => {
      if (a.service === 'GethService' || b.service === 'LssEjectorService') {
        return -1
      } else if (b.service === 'GethService' || a.service === 'LssEjectorService') {
        return 1
      }

      return 0
    })
    await Promise.all(
      services.map(async (service) => {
        await this.nodeConnection.writeServiceConfiguration(service.buildConfiguration());
      })
    );
  }

  async getSSVConfigs(services) {
    const ssvServices = services.filter((s) => s.service === "SSVNetworkService");
    let configs = [];
    if (ssvServices?.length > 0) {
      for (let service of ssvServices) {
        let result = await this.nodeConnection.readSSVNetworkConfig(service.id);
        configs[service.id] = YAML.parse(result);
      }
    }
    return configs;
  }

  async handleServiceChanges(tasks) {
    let jobs = tasks.map((t) => t.content);
    if (jobs.includes("DELETE")) {
      let services = await this.readServiceConfigurations();
      let ssvConfigs = await this.getSSVConfigs(services);
      let before = this.nodeConnection.nodeUpdates.getTimeStamp();
      try {
        for (const task of tasks) {
          await this.configManager.deleteServiceFromSetup(task.id, task.setupId);
        }
        await Promise.all(
          tasks.filter(ServiceManager.uniqueByID("DELETE")).map((task, index, tasks) => {
            return this.deleteService(task, tasks, services, ssvConfigs);
          })
        );
      } catch (err) {
        log.error("Deleting Services Failed:", err);
      } finally {
        let after = this.nodeConnection.nodeUpdates.getTimeStamp();
        await this.nodeConnection.nodeUpdates.restartServices(after - before);
      }
    }
    let newInstallTasks = [];
    if (jobs.includes("INSTALL")) {
      try {
        let services = await this.readServiceConfigurations();
        let installTasks = tasks.filter((t) => t.content === "INSTALL");
        newInstallTasks = await this.addServices(installTasks, services);
      } catch (err) {
        log.error("Installing Services Failed:", err);
      }
    }
    if (jobs.includes("MODIFY")) {
      try {
        let services = await this.readServiceConfigurations();
        let modifyTasks = tasks.filter((t) => t.content === "MODIFY");
        await this.modifyServices(modifyTasks, services, newInstallTasks);
      } catch (err) {
        log.error("Modifying Services Failed:", err);
      }
    }
    if (jobs.includes("NETWORK")) {
      let before = this.nodeConnection.nodeUpdates.getTimeStamp();
      let services = await this.readServiceConfigurations();
      try {
        let changeNetworkTask = tasks.find((t) => t.content === "NETWORK");
        await this.changeNetwork(
          changeNetworkTask.data.network,
          services.filter((s) => s.service !== "SSVNetworkService")
        );
      } catch (err) {
        log.error("Changing Network Failed:", err);
      } finally {
        let after = this.nodeConnection.nodeUpdates.getTimeStamp();
        await this.nodeConnection.nodeUpdates.restartServices(after - before);
      }
    }
    if (jobs.includes("SWITCH CLIENT")) {
      let before = this.nodeConnection.nodeUpdates.getTimeStamp();
      try {
        let switchTasks = tasks.filter((t) => t.content === "SWITCH CLIENT");
        for (const switchTask of switchTasks) {
          await this.switchServices(switchTask);
        }
        let services = await this.readServiceConfigurations();
        await Promise.all(
          tasks.filter(ServiceManager.uniqueByID("SWITCH CLIENT")).map((task, index, tasks) => {
            return this.deleteService(task, tasks, services);
          })
        );
      } catch (err) {
        log.error("Switching Services Failed:", err);
      } finally {
        let after = this.nodeConnection.nodeUpdates.getTimeStamp();
        await this.nodeConnection.nodeUpdates.restartServices(after - before);
      }
    }
  }

  async exportSingleSetup(setupId) {
    const ref = StringUtils.createRandomString();
    this.nodeConnection.taskManager.otherTasksHandler(ref, `Exporting A Setup`);

    try {
      let setup = await this.configManager.getSetup(setupId);
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Read ${setup[setupId].name} Setup`, true);

      let arrayOfServices = await this.nodeConnection.listServicesConfigurations();

      arrayOfServices = arrayOfServices
        .map((service) => service.replace(".yaml", ""))
        .filter((service) => setup[setupId].services.includes(service));

      let serviceNameConfig = [];

      for (let i = 0; i < arrayOfServices.length; i++) {
        let serviceObject = await this.nodeConnection.readServiceYAML(arrayOfServices[i]);
        const exportObject = {
          filename: arrayOfServices[i] + ".yaml",
          content: serviceObject,
        };
        serviceNameConfig.push(exportObject);
      }

      serviceNameConfig.push({
        filename: setup[setupId].name + ".yaml",
        content: yaml.dump(setup),
      });

      this.nodeConnection.taskManager.otherTasksHandler(ref, `Export setup Completed`, true);

      return serviceNameConfig;
    } catch (error) {
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Export Failed`, false, `Failed to export setup: ${error}`);
      console.error(`Failed to export setup: ${error}`);
    } finally {
      this.nodeConnection.taskManager.otherTasksHandler(ref);
    }
  }

  async exportConfig() {
    const ref = StringUtils.createRandomString();
    this.nodeConnection.taskManager.otherTasksHandler(ref, `Exporting Configuration`);
    try {
      let multiSetups = await this.configManager.readMultiSetup();
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Read Multi Setup`, true);
      let arrayOfServices = await this.nodeConnection.listServicesConfigurations();
      let serviceNameConfig = [];
      for (let i = 0; i < arrayOfServices.length; i++) {
        let serviceObject = await this.nodeConnection.readServiceYAML(arrayOfServices[i]);
        this.nodeConnection.taskManager.otherTasksHandler(ref, `Read Service YAML for ${arrayOfServices[i]}`, true);

        const exportObject = {
          filename: arrayOfServices[i],
          content: serviceObject,
        };
        serviceNameConfig.push(exportObject);
      }

      serviceNameConfig.push({
        filename: "multisetup.yaml",
        content: multiSetups,
      });
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Export Configuration Completed`, true);
      return serviceNameConfig;
    } catch (error) {
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Export Failed`, false, `Failed to export config: ${error}`);
      console.error(`Failed to export config: ${error}`);
    } finally {
      this.nodeConnection.taskManager.otherTasksHandler(ref);
    }
  }

  async getCurrentPath() {
    const stereumConfig = await this.nodeConnection.sshService.exec("cat /etc/stereum/stereum.yaml");
    if (stereumConfig.rc == 0) {
      return YAML.parse(stereumConfig.stdout).stereum_settings.settings.controls_install_path;
    }
    return "/opt/stereum";
  }

  async getAllPorts(installedServices) {
    return installedServices
      .map((s) => s.ports)
      .flat(1)
      .map((p) => p.destinationPort + "/" + p.servicePortProtocol);
  }

  async importSingleSetup(configFiles) {
    const ref = StringUtils.createRandomString();
    this.nodeConnection.taskManager.otherTasksHandler(ref, `Importing a setup`);
    try {
      const currentPath = await this.getCurrentPath();
      let multiSetup = {};

      let installedServices = await this.readServiceConfigurations();
      let allPorts = await this.getAllPorts(installedServices);

      //write config files
      for (let file of configFiles) {
        if (file.id && file.content && file.service) {
          file.content = file.content.replace(/(\s+-\s)\/[^\s]+\/([a-zA-Z]+-[^/]+\/[^:]+):/g, `$1${currentPath}/$2:`);
          const findUniquePort = (port, protocol, allPorts) => {
            while (allPorts.includes(`${port}/${protocol}`)) {
              port += 1;
            }
            allPorts.push(`${port}/${protocol}`);
            return port;
          };

          file.content = file.content.replace(/(\d+\.\d+\.\d+\.\d+:\d+):(\d+\/(tcp|udp))/g, (match, p1, p2, p3) => {
            const [ip, originalPort] = p1.split(":");
            const newPort = findUniquePort(parseInt(originalPort), p3, allPorts);
            return `${ip}:${newPort}:${originalPort}/${p3}`;
          });
          await this.nodeConnection.writeServiceYAML({ id: file.id, data: file.content, service: file.service });
        } else {
          multiSetup = yaml.safeLoad(file.content);
        }
      }

      let currentSetups = await this.configManager.readMultiSetup();
      let setupsObj = yaml.load(currentSetups);
      let mergedSetup = { ...setupsObj, ...multiSetup };
      await this.configManager.writeMultiSetup(mergedSetup);

      this.nodeConnection.taskManager.otherTasksHandler(ref, `Wrote multi setup`, true);

      let services = await this.readServiceConfigurations();
      let importingSetupServices = services.filter((service) => multiSetup[Object.keys(multiSetup)[0]].services.includes(service.id));

      await Promise.all(
        importingSetupServices.map(async (service) => {
          await this.nodeConnection.writeServiceConfiguration(service.buildConfiguration());
        })
      );

      await this.createKeystores(importingSetupServices);

      // start service
      const runRefs = [];
      if (importingSetupServices[0] !== undefined) {
        await Promise.all(
          importingSetupServices.map(async (service, index) => {
            Sleep(index * 1000).then(() => runRefs.push(this.manageServiceState(service.id, "started")));
          })
        );
      }

      this.nodeConnection.taskManager.otherTasksHandler(ref, `Import Configuration Completed`, true);
      return runRefs;
    } catch (error) {
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Import Failed`, false, `Failed to import config: ${error}`);
      console.error(`Failed to import config: ${error}`);
    } finally {
      this.nodeConnection.taskManager.otherTasksHandler(ref);
    }
  }

  async importConfig(configFiles, removedServices, checkPointSync) {
    const ref = StringUtils.createRandomString();
    this.nodeConnection.taskManager.otherTasksHandler(ref, `Importing Configuration`);
    try {
      let multiSetup = {};
      let consensusClients = [];
      //remove existing config files
      await this.nodeConnection.sshService.exec(`rm -rf /etc/stereum && mkdir -p /etc/stereum/services`);
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Removed existing config files`, true);

      //write config files
      for (let file of configFiles.concat(removedServices)) {
        if (file.id && file.content && file.service && file.category) {
          await this.nodeConnection.writeServiceYAML({ id: file.id, data: file.content, service: file.service });
          if (file.category === "consensus") {
            consensusClients.push(file.id);
          }
        } else {
          multiSetup = yaml.safeLoad(file.content);
        }
      }

      await this.configManager.writeMultiSetup(multiSetup);

      let services = await this.readServiceConfigurations();

      for (let serviceToDelete of removedServices) {
        for (let setupId of Object.keys(multiSetup)) {
          await this.configManager.deleteServiceFromSetup(serviceToDelete.id, setupId);
        }
        let dependents = [];
        services.forEach((service) => {
          for (const dependency in service.dependencies) {
            service.dependencies[dependency].forEach((s) => {
              if (s.id === serviceToDelete.id) dependents.push(service);
            });
          }
        });
        dependents.forEach((service) => {
          this.removeDependencies(service, serviceToDelete);
        });
        services = services.filter((s) => s.id !== serviceToDelete.id);
      }

      let updatedMultiSetup = await this.configManager.readMultiSetup();

      //Add or Remove Checkpoint Sync
      for (let service of services.filter((s) => consensusClients.includes(s.id))) {
        this.updateSyncCommand(service, checkPointSync);
      }

      // create stereum config file
      await this.nodeConnection.sshService.exec(`rm -rf /etc/stereum && mkdir -p /etc/stereum/services`);
      const settings = {
        stereum_settings: {
          settings: {
            controls_install_path: "/opt/stereum",
            updates: {
              lane: "stable",
              unattended: {
                install: false,
              },
            },
          },
        },
      };
      await this.nodeConnection.sshService.exec(
        `echo -e ${StringUtils.escapeStringForShell(YAML.stringify(settings))} > /etc/stereum/stereum.yaml`
      );
      await this.configManager.writeMultiSetup(yaml.load(updatedMultiSetup));
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Wrote multi setup`, true);

      //prepare node
      await this.nodeConnection.findStereumSettings();
      await this.nodeConnection.prepareStereumNode(this.nodeConnection.settings.stereum.settings.controls_install_path);

      await Promise.all(
        services.map(async (service) => {
          await this.nodeConnection.writeServiceConfiguration(service.buildConfiguration());
        })
      );

      await this.createKeystores(services);

      // start service(s)
      const runRefs = [];
      if (services[0] !== undefined) {
        await Promise.all(
          services.map(async (service, index) => {
            Sleep(index * 1000).then(() => runRefs.push(this.manageServiceState(service.id, "started")));
          })
        );
      }
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Import Configuration Completed`, true);
      return runRefs;
    } catch (error) {
      this.nodeConnection.taskManager.otherTasksHandler(ref, `Import Failed`, false, `Failed to import config: ${error}`);
      console.error(`Failed to import config: ${error}`);
    } finally {
      this.nodeConnection.taskManager.otherTasksHandler(ref);
    }
  }

  async beaconchainMonitoringModification(data) {
    let services = await this.readServiceConfigurations();
    let selectedValidator = services.find((service) => service.id === data.selectedVal);
    let firstConsensusClient = services.find((service) => service.id === selectedValidator.dependencies.consensusClients[0].id);

    let metricsExporterAdded = false;

    switch (selectedValidator.service) {
      case "PrysmValidatorService":
        await this.addMetricsExporter(services);
        metricsExporterAdded = true;
        break;
    }

    switch (firstConsensusClient.service) {
      case "PrysmBeaconService":
        if (!metricsExporterAdded) {
          await this.addMetricsExporter(services);
          metricsExporterAdded = true;
        }
        break;
    }

    if (metricsExporterAdded) {
      let newServices = await this.readServiceConfigurations();
      let metricsExporter = newServices.filter(({ id: id1 }) => !services.some(({ id: id2 }) => id2 === id1))[0];
      metricsExporter.command = [];
      metricsExporter.command.push(
        `--server.address=https://beacon.stratisevm.com/api/v1/client/metrics?apikey=${data.apiKey}&machine=${data.machineName}`,
        `--system.partition=/host/rootfs`
      );
      if (selectedValidator.service == "PrysmValidatorService") {
        metricsExporter.command.push(`--validator.type=prysm`, `--validator.address=http://stereum-${selectedValidator.id}:8081/metrics`);
      }
      if (firstConsensusClient.service == "PrysmBeaconService") {
        metricsExporter.command.push(
          `--beaconnode.type=prysm`,
          `--beaconnode.address=http://stereum-${firstConsensusClient.id}:8080/metrics`
        );
      }

      await this.nodeConnection.writeServiceConfiguration(metricsExporter.buildConfiguration());
      await this.manageServiceState(metricsExporter.id, "started");
    }
  }

  async addMetricsExporter(services) {
    try {
      let installTask = [];
      installTask.push({
        service: {
          id: services.length + 1,
          name: "MetricsExporter",
          service: "MetricsExporterService",
          category: "service",
          config: [
            {
              serviceID: "",
              configVersion: "",
              image: "",
              imageVersion: "",
              ports: [],
              volumes: [],
              network: "",
            },
          ],
        },
        data: {
          network: "auroria",
          installDir: "/opt/stereum",
          executionClients: [],
          consensusClients: [],
          relays: "",
          checkpointURL: false,
        },
      });

      await this.addServices(installTask, services);
    } catch (err) {
      log.error("Installing Services Failed:", err);
    }
  }

  async removeBeaconchainMonitoring(data) {
    let metricsExporterRemoveID = null;
    let linkedMetricsExporter;

    let services = await this.readServiceConfigurations();
    let selectedValidator = services.find((service) => service.id === data.selectedVal);

    switch (selectedValidator.service) {
      case "PrysmValidatorService":
        metricsExporterRemoveID = selectedValidator.id;
        break;
    }

    if (metricsExporterRemoveID != null) {
      let metricsExporters = services.filter((services) => services.service == "MetricsExporterService");
      metricsExporters.forEach((metricsExporter) => {
        let IDIndex = metricsExporter.command.findIndex((c) => c.includes(metricsExporterRemoveID));
        if (IDIndex > -1) {
          linkedMetricsExporter = metricsExporter;
        }
      });

      await this.nodeConnection.runPlaybook("Delete Service", {
        stereum_role: "delete-service",
        service: linkedMetricsExporter.id,
      });
    }
  }

  async copyExecutionJWT(volume) {
    let jwtContent = "";
    jwtContent = await this.nodeConnection.sshService.exec(`cat ${volume}`);
    return jwtContent.stdout;
  }

  async fetchTranslators() {
    try {
      const response = await axios.get("https://stereum.com/api/translators");
      const translators = response.data.data.translators.map((translator) => ({
        name: translator.username,
        avatar: translator.avatarUrl,
      }));
      return translators;
    } catch (error) {
      console.error("Failed to fetch translators:", error);
    }
  }

  async fetchGitHubTesters() {
    try {
      const response = await axios.get("https://stereum.com/api/github/testers");
      const testers = response.data.data.testers.map((tester) => ({
        name: tester.username,
        avatar: tester.avatarUrl,
        tests: tester.testsCount,
      }));
      return testers;
    } catch (error) {
      console.error("Failed to fetch GitHub testers:", error);
    }
  }
}
