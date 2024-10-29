import { SSVNetworkService } from "../../ethereum-services/SSVNetworkService.js";
import { ServicePort, servicePortProtocol } from "../../ethereum-services/ServicePort.js";
const log = require("electron-log");

test("buildConfiguration", () => {
  const ports = [new ServicePort(null, 100, 200, servicePortProtocol.tcp), new ServicePort(null, 101, 202, servicePortProtocol.udp)];

  jest.mock("../../ethereum-services/GethService");
  const GethService = require("../../ethereum-services/GethService");
  const mMock = jest.fn(() => {
    return "ws-endpoint-string";
  });
  GethService.GethService.mockImplementation(() => {
    return {
      buildExecutionClientWsEndpointUrl: mMock,
      buildMinimalConfiguration: jest.fn(() => {
        return {
          id: "geth-id",
          service: "GethService",
        };
      }),
    };
  });

  jest.mock("../../ethereum-services/PrysmBeaconService");
  const PrysmBeaconService = require("../../ethereum-services/PrysmBeaconService");
  const mMockPrysm = jest.fn(() => {
    return "http-prysm-endpoint-string";
  });
  PrysmBeaconService.PrysmBeaconService.mockImplementation(() => {
    return {
      buildConsensusClientHttpEndpointUrl: mMockPrysm,
      buildMinimalConfiguration: jest.fn(() => {
        return {
          id: "prysm-beacon-id",
          service: "PrysmBeaconService",
        };
      }),
    };
  });

  const ssvService = SSVNetworkService.buildByUserInput(
    "auroria",
    ports,
    "/opt/stereum/ssv",
    [new GethService.GethService()],
    [new PrysmBeaconService.PrysmBeaconService()]
  ).buildConfiguration();

  log.info("cmd: ", ssvService.command);

  expect(ssvService.env.CONFIG_PATH).toMatch(/\/config.yaml/);
  expect(ssvService.volumes).toHaveLength(2);
  expect(ssvService.volumes).toContain("/opt/stereum/ssv-" + ssvService.id + "/data:/data");
  expect(ssvService.volumes).toContain("/opt/stereum/ssv-" + ssvService.id + "/secrets:/secrets");
  expect(ssvService.ports).toHaveLength(2);
  expect(ssvService.id).toHaveLength(36);
  expect(ssvService.user).toMatch(/2000/);
  expect(ssvService.image).toMatch(/bloxstaking\/ssv-node/);
  expect(ssvService.configVersion).toBe(1);
});

test("getServiceConfiguration", () => {
  jest.mock("../../ethereum-services/GethService");
  const GethService = require("../../ethereum-services/GethService");
  const mMock = jest.fn(() => {
    return "ws-endpoint-string";
  });
  GethService.GethService.mockImplementation(() => {
    return {
      buildExecutionClientWsEndpointUrl: mMock,
    };
  });

  jest.mock("../../ethereum-services/PrysmBeaconService");
  const PrysmBeaconService = require("../../ethereum-services/PrysmBeaconService");
  const mMockPrysm = jest.fn(() => {
    return "http-prysm-endpoint-string";
  });
  PrysmBeaconService.PrysmBeaconService.mockImplementation(() => {
    return {
      buildConsensusClientHttpEndpointUrl: mMockPrysm,
    };
  });

  const ssvService = SSVNetworkService.buildByUserInput(
    "auroria",
    null,
    "/opt/stereum/ssv",
    [new GethService.GethService()],
    [new PrysmBeaconService.PrysmBeaconService()]
  ).getServiceConfiguration(
    "auroria",
    [new GethService.GethService()],
    [new PrysmBeaconService.PrysmBeaconService()]
  );

  expect(ssvService).toBeDefined();
  expect(ssvService).toMatch(/auroria/);
  expect(ssvService).toMatch(/http-prysm-endpoint-string/);
  expect(ssvService).toMatch(/ws-endpoint-string/);
});

test("getAvailablePorts", () => {
  const service = SSVNetworkService.buildByUserInput(
    "auroria",
    null,
    "/opt/stereum/ssv",
    [],
    []
  ).getAvailablePorts();

  expect(service).toHaveLength(3);
});

test("service name", () => {
  const service = SSVNetworkService.buildByUserInput(
    "auroria",
    null,
    "/opt/stereum/ssv",
    [],
    []
  ).buildConfiguration();

  expect(service.service).toMatch(/SSVNetworkService/);
});

test("autoupdate", () => {
  const service = SSVNetworkService.buildByUserInput(
    "auroria",
    null,
    "/opt/stereum/ssv",
    [],
    []
  ).buildConfiguration();

  expect(service.autoupdate).toBe(true);
});

// EOF
