import { NodeConnection } from "../../NodeConnection";
import { TaskManager } from "../../TaskManager";
import { nodeOS } from "../../NodeOS";
const log = require("electron-log");

test("findOS Ubuntu", () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn(() => {
    return { rc: 0, stdout: "DISTRIB_ID=Ubuntu" };
  });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  nodeConnection.findOS();

  expect(nodeConnection.os == nodeOS.ubuntu);
});

test("findOS CentOS", () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn(() => {
    return { rc: 0, stdout: 'NAME="CentOS Linux"' };
  });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  nodeConnection.findOS();

  expect(nodeConnection.os == nodeOS.centos);
});

test("findStereumSettings", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn(() => {
    return {
      rc: 0,
      stdout: `stereum_settings:
  settings:
    controls_install_path: /opt/stereum/mock
    updates:
      in_progress:
      lane: stable_mock
      available:
      unattended:
        check: true
        install: false
        `,
    };
  });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.findStereumSettings();

  expect(nodeConnection.settings.stereum.settings.controls_install_path).toMatch(/\/opt\/stereum\/mock/);
});

test("findStereumSettings failure", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn(() => {
    return {
      rc: 1,
      stdout: `stereum:
  settings:
    controls_install_path: /opt/stereum/mock
    updates:
      in_progress:
      lane: stable_mock
      available:
      unattended:
        check: true
        install: false`,
    };
  });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.findStereumSettings();

  expect(nodeConnection.settings).toBeUndefined();
});

test("prepareStereumNode failure ubuntu installpkg", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce({ rc: 0, stdout: "ubuntu" }).mockReturnValueOnce({ rc: 1, stderr: "error1234" });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.prepareStereumNode("/opt/stereum/bar").catch((e) => {
    expect(e).toEqual(new Error("Can't install os packages: error1234"));
  });

  expect(mMock.mock.calls.length).toBe(2);
  expect(mMock.mock.calls[1][0]).toMatch(/apt/);
});

test("prepareStereumNode error ubuntu installpkg", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce({ rc: 0, stdout: "ubuntu" }).mockRejectedValue("foobar");
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.prepareStereumNode("/opt/stereum/bar").catch((e) => {
    expect(e).toEqual(new Error("Can't install os packages: foobar"));
  });

  expect(mMock.mock.calls.length).toBe(2);
  expect(mMock.mock.calls[1][0]).toMatch(/apt/);
});

test("prepareStereumNode failure ubuntu unsupported os", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce({ rc: 0, stdout: "blah" });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.prepareStereumNode("/opt/stereum/bar").catch((e) => {
    expect(e).toEqual(new Error("unsupported OS"));
  });

  expect(mMock.mock.calls.length).toBe(1);
});

test("prepareStereumNode failure ubuntu install", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock
    .mockReturnValueOnce({ rc: 0, stdout: "ubuntu" }) // find OS
    .mockReturnValueOnce({ rc: 0 }) // install pkg
    .mockReturnValueOnce({ rc: 1, stderr: "" }); // install
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.prepareStereumNode("/opt/stereum/bar").catch((e) => {
    expect(e).toEqual(new Error("Can't install ansible role: <stderr empty>"));
  });

  expect(mMock.mock.calls.length).toBe(4);
});

test("prepareStereumNode error ubuntu install", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock
    .mockReturnValueOnce({ rc: 0, stdout: "ubuntu" }) // find OS
    .mockReturnValueOnce({ rc: 0 }) // delete ansible roles if exist
    .mockReturnValueOnce({ rc: 0 }) // install pkg
    .mockRejectedValue("connection lost"); // install
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.prepareStereumNode("/opt/stereum/bar").catch((e) => {
    expect(e).toEqual(new Error("Can't install ansible roles: connection lost"));
  });

  expect(mMock.mock.calls.length).toBe(4);
});

test("prepareStereumNode success", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock
    .mockReturnValueOnce({ rc: 0, stdout: "stereum_settings:\n  settings:\n    controls_install_path: /opt/tests" }) // find settings
    .mockReturnValueOnce({ rc: 0, stdout: "ubuntu" }) // find OS
    .mockReturnValueOnce({ rc: 0 }) // delete ansible roles if exist
    .mockReturnValueOnce({ rc: 0 }) // install pkg
    .mockReturnValueOnce({ rc: 0 }) // install
    .mockReturnValueOnce({ rc: 0 }) // playbook ansible
    .mockReturnValueOnce({ rc: 0 }); // playbook ansible
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.findStereumSettings();
  const playbookRun = await nodeConnection.prepareStereumNode("/opt/stereum/bar");
  expect(playbookRun[0]).toBeDefined();
  expect(playbookRun[0]).toMatchObject({
    playbook: expect.stringMatching(/setup/),
    playbookRunRef: expect.any(String),
  });
  expect(playbookRun[1]).toBeDefined();
  expect(playbookRun[1]).toMatchObject({
    playbook: expect.stringMatching(/configure-firewall/),
    playbookRunRef: expect.any(String),
  });

  expect(mMock.mock.calls.length).toBe(7);

  expect(mMock.mock.calls[0][0]).toMatch(/cat/);
  expect(mMock.mock.calls[0][0]).toMatch(/stereum.yaml/);

  expect(mMock.mock.calls[1][0]).toMatch(/cat/);
  expect(mMock.mock.calls[1][0]).toMatch(/release/);

  expect(mMock.mock.calls[2][0]).toMatch(/apt install/);

  expect(mMock.mock.calls[4][0]).toMatch(/git checkout/);

  expect(mMock.mock.calls[5][0]).toMatch(/ansible-playbook/);
  expect(mMock.mock.calls[5][0]).toMatch(/ansible-playbook/);
});

test("prepareStereumNode error playbook", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock
    .mockReturnValueOnce({ rc: 0, stdout: "stereum_settings:\n  settings:\n    controls_install_path: /opt/tests" }) // find settings
    .mockReturnValueOnce({ rc: 0, stdout: "ubuntu" }) // find OS
    .mockReturnValueOnce({ rc: 0 }) // delete ansible roles if exist
    .mockReturnValueOnce({ rc: 0 }) // install pkg
    .mockReturnValueOnce({ rc: 0 }) // install
    .mockRejectedValue("connection interrupted"); // playbook ansible
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.findStereumSettings();
  await nodeConnection.prepareStereumNode("/opt/stereum/bar").catch((e) => {
    expect(e).toEqual(new Error("Can't run setup playbook: Error: Can't run playbook: connection interrupted"));
  });

  expect(mMock.mock.calls.length).toBe(6);

  expect(mMock.mock.calls[1][0]).toMatch(/cat/);
  expect(mMock.mock.calls[1][0]).toMatch(/release/);

  expect(mMock.mock.calls[2][0]).toMatch(/apt install/);

  expect(mMock.mock.calls[4][0]).toMatch(/git checkout/);

  expect(mMock.mock.calls[5][0]).toMatch(/ansible-playbook/);
});

test("prepareStereumNode failure playbook", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock
    .mockReturnValueOnce({ rc: 0, stdout: "stereum_settings:\n  settings:\n    controls_install_path: /opt/tests" }) // find settings
    .mockReturnValueOnce({ rc: 0, stdout: "ubuntu" }) // find OS
    .mockReturnValueOnce({ rc: 0 }) // delete ansible roles if exist
    .mockReturnValueOnce({ rc: 0 }) // install pkg
    .mockReturnValueOnce({ rc: 0 }) // install
    .mockReturnValueOnce({ rc: 1, stderr: "asdf" }); // playbook ansible
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.findStereumSettings();
  await nodeConnection.prepareStereumNode("/opt/stereum/bar").catch((e) => {
    expect(e).toEqual(new Error("Can't run setup playbook: Error: Failed running 'setup': asdf"));
  });

  expect(mMock.mock.calls.length).toBe(6);
  expect(mMock.mock.calls[1][0]).toMatch(/cat/);
  expect(mMock.mock.calls[1][0]).toMatch(/release/);

  expect(mMock.mock.calls[2][0]).toMatch(/apt install/);

  expect(mMock.mock.calls[4][0]).toMatch(/git checkout/);

  expect(mMock.mock.calls[5][0]).toMatch(/ansible-playbook/);
});

test("playbookStatus error", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockRejectedValue("error123");
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  expect.assertions(1);

  await nodeConnection.playbookStatus("ref-123").catch((e) => {
    expect(e).toEqual(new Error("Can't read playbook status 'ref-123': error123"));
  });
});

test("playbookStatus failure", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce(new Promise((resolve) => resolve({ rc: 1, stderr: "err-1" })));
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  expect.assertions(1);

  await nodeConnection.playbookStatus("ref-123").catch((e) => {
    log.debug("playbookStatus failure:", e);
    expect(e).toEqual(new Error("Failed reading status of ref 'ref-123': err-1"));
  });
});

test("playbookStatus success", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce(new Promise((resolve) => resolve({ rc: 0, stdout: "playbook-output" })));
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  expect(await nodeConnection.playbookStatus("ref-123")).toMatch("playbook-output");
});

test("runPlaybook extravars success", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce({ rc: 0, stdout: "playbook-output" });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  nodeConnection.settings = {
    stereum: {
      settings: {
        controls_install_path: "/some/path",
      },
    },
  };

  const playbookRunRef = await nodeConnection.runPlaybook("ref-abc", { stereum_var: "sowow" });

  expect(playbookRunRef.playbook).toMatch("ref-abc");
  expect(playbookRunRef.playbookRunRef).toBeDefined();
  expect(playbookRunRef.playbookRunRef).toHaveLength(36);
  expect(mMock.mock.calls).toHaveLength(1);
  expect(mMock.mock.calls[0][0]).toMatch(/sowow/);

  log.info("call: ", mMock.mock.calls[0][0]);
});

test("runPlaybook error no settings", async () => {
  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();

  await nodeConnection.runPlaybook("ref-abc", { stereum_var: "sowow" }).catch((e) => {
    expect(e).toEqual(new Error("Settings not loaded! Run findStereumSettings() first."));
  });
});

test("listServicesConfigurations success", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce({ rc: 0, stdout: "foo.yaml\nbar.yaml\nxyz.yaml" });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  const list = await nodeConnection.listServicesConfigurations();

  expect(list.length).toBe(3);
  expect(list).toContain("foo.yaml");
  expect(list).toContain("bar.yaml");
  expect(list).toContain("xyz.yaml");

  expect(mMock.mock.calls.length).toBe(1);

  expect(mMock.mock.calls[0][0]).toMatch(/ls -1 \/etc\/stereum\/services/);
});

test("listServicesConfigurations success empty", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce({ rc: 0, stdout: "" });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  const list = await nodeConnection.listServicesConfigurations();

  expect(list.length).toBe(0);

  expect(mMock.mock.calls.length).toBe(1);

  expect(mMock.mock.calls[0][0]).toMatch(/ls -1 \/etc\/stereum\/services/);
});

test("writeServiceConfiguration success", async () => {
  jest.mock("../../SSHService");
  const SSHService = require("../../SSHService");
  const mMock = jest.fn();
  mMock.mockReturnValueOnce({ rc: 0 });
  SSHService.SSHService.mockImplementation(() => {
    return {
      exec: mMock,
    };
  });

  const nodeConnection = new NodeConnection(null);
  nodeConnection.taskManager = new TaskManager();
  nodeConnection.sshService = new SSHService.SSHService();

  await nodeConnection.writeServiceConfiguration({
    id: "some-id",
    user: "2000",
    ports: ["0.0.0.0:9000:9000/tcp", "0.0.0.0:9000:9000/udp"],
  });

  expect(mMock.mock.calls.length).toBe(1);

  expect(mMock.mock.calls[0][0]).toMatch(/2000/);
  expect(mMock.mock.calls[0][0]).toMatch(/id: some-id/);
  expect(mMock.mock.calls[0][0]).toMatch("/etc/stereum/services/some-id");
  expect(mMock.mock.calls[0][0]).toMatch("- 0.0.0.0:9000:9000/tcp");
  log.debug(mMock.mock.calls[0][0]);
});

// EOF
