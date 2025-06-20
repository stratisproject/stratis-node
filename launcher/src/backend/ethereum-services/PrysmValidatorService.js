import { NodeService } from "./NodeService.js";
import { ServicePortDefinition } from "./SerivcePortDefinition.js";
import { ServiceVolume } from "./ServiceVolume.js";

export class PrysmValidatorService extends NodeService {
  static buildByUserInput(network, ports, dir, consensusClients) {
    const service = new PrysmValidatorService();
    service.setId();
    const workingDir = service.buildWorkingDir(dir);

    const image = "stratisevm/prysm-validator";

    const dataDir = "/opt/app/data/db";
    const walletDir = "/opt/app/data/wallets";
    const passwordDir = "/opt/app/data/passwords";
    const graffitiDir = "/opt/app/graffitis";

    const volumes = [
      new ServiceVolume(workingDir + "/data/db", dataDir),
      new ServiceVolume(workingDir + "/data/wallets", walletDir),
      new ServiceVolume(workingDir + "/data/passwords", passwordDir),
      new ServiceVolume(workingDir + "/graffitis", graffitiDir),
    ];

    const provider = consensusClients
      .map((client) => {
        return client.buildConsensusClientEndpoint();
      })
      .join();
    const providerGateway = consensusClients
      .map((client) => {
        return client.buildConsensusClientGateway();
      })
      .join();

    service.init(
      "PrysmValidatorService", //service
      service.id, //id
      1, // configVersion
      image, //image
      "latest", //imageVersion
      [
        "--accept-terms-of-use=true",
        `--beacon-rpc-provider=${provider}`,
        `--beacon-rpc-gateway-provider=${providerGateway}`,
        "--web",
        `--datadir=${dataDir}`,
        `--validator-api-bearer-file=${walletDir + "/auth-token"}`,
        `--wallet-dir=${walletDir}`,
        `--wallet-password-file=${passwordDir + "/wallet-password"}`,
        "--monitoring-host=0.0.0.0",
        "--grpc-gateway-port=7500",
        "--grpc-gateway-host=0.0.0.0",
        '--grpc-gateway-corsdomain="*"',
        "--monitoring-host=0.0.0.0",
        "--monitoring-port=8081",
        "--suggested-fee-recipient=0x0000000000000000000000000000000000000000",
        `--graffiti-file=${graffitiDir + "/graffitis.yaml"}`,
        "--enable-builder=true",
        "--enable-doppelganger=true",
      ],
      ["/app/cmd/validator/validator"], //entrypoint
      null, // env
      ports, //ports
      volumes, //volumes
      null, //user
      network, //network
      null, //executionClients
      consensusClients //consensusClients
    );

    if (network === 'stratis') {
      service.command.push(`--mainnet`)
    } else {
      service.command.push(`--${network}`)
    }

    return service;
  }

  static buildByConfiguration(config) {
    const service = new PrysmValidatorService();

    service.initByConfig(config);

    return service;
  }

  buildValidatorClientMetricsEndpoint() {
    return "stereum-" + this.id + ":8081";
  }

  getAvailablePorts() {
    return [new ServicePortDefinition(7500, "tcp", "Validator Client API and Web Interface")];
  }
}
