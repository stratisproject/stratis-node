import { NodeService } from "./NodeService";
import { ServiceVolume } from "./ServiceVolume";

export const stakingContractAddresses = {
  stratis: '0x16CFc478175C222a1eC558baAE290593f175514F',
  auroria: '0x0504D06711d02E6275e1724529a801441088f9f4',
}

export class LssEjectorService extends NodeService {
  static buildByUserInput(network, executionClients, consensusClients, otherServices) {
    const service = new LssEjectorService();
    service.setId();

    const executionEndpoint = executionClients
      .map((client) => {
        return client.buildExecutionClientHttpEndpointUrl();
      })
      .join();
    const consensusEndpoint = consensusClients.map((client) => {
      return client.buildConsensusClientHttpEndpointUrl();
    })
    .join();

    const allAccountsKeystoreDir = '/config/wallets'
    const walletPasswordDir = '/config/passwords'

    const validatorService = otherServices.find(s => s.service.includes('PrysmValidator'))

    const walletsDir = validatorService.volumes.find(
      (vol) => vol.servicePath === "/wallets" || vol.destinationPath.includes("/wallets")
    ).destinationPath
    const passwordsDir = validatorService.volumes.find(
      (vol) => vol.servicePath === "/passwords" || vol.destinationPath.includes("/passwords")
    ).destinationPath

    const volumes = [
      new ServiceVolume(walletsDir, allAccountsKeystoreDir, 'ro'),
      new ServiceVolume(passwordsDir, walletPasswordDir, 'ro'),
    ]

    service.init(
      "LssEjectorService", //service
      service.id, // id
      1, // configVersion
      "stratisevm/lss-ejector", // image
      "latest", // imageVersion
      [
        "start",
        '--all_accounts_file',
        `--consensus_endpoint=${consensusEndpoint}`,
        `--execution_endpoint=${executionEndpoint}`,
        `--keys_dir=${allAccountsKeystoreDir}/direct/accounts/all-accounts.keystore.json`,
        `--keystore_password_file=${walletPasswordDir}/wallet-password`,
        `--staking_address=${stakingContractAddresses[network]}`
      ], // command
      ["lss-ejector"], // entrypoint
      null, // env
      null, // ports
      volumes, // volumes
      null, // user
      network, // network
      executionClients,
      consensusClients,
      null, // mevboost
      otherServices,
    );
    return service;
  }

  static buildByConfiguration(config) {
    const service = new LssEjectorService();

    service.initByConfig(config);

    return service;
  }
}
