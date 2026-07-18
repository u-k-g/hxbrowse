import "./test_helper.js";
import "../../lib/settings.js";
import {
  getConfiguredNewTabUrl,
  handleCreatedTab,
  handleRemovedTab,
  handleSettledCreatedTab,
  handleUpdatedTab,
  isBrowserNewTabUrl,
  redirectBrowserNewTab,
} from "../../background_scripts/new_tab_redirect.js";

context("Browser new-tab redirects", () => {
  setup(async () => {
    await Settings.load();
  });

  teardown(async () => {
    handleRemovedTab(42);
    await Settings.clear();
  });

  should("recognize browser new-tab URLs", () => {
    assert.isTrue(isBrowserNewTabUrl("chrome://newtab/"));
    assert.isTrue(isBrowserNewTabUrl("about:newtab"));
    assert.isTrue(isBrowserNewTabUrl("edge://newtab/"));
    assert.isFalse(isBrowserNewTabUrl("https://example.com/"));
  });

  should("use the configured Vimium new-tab page", async () => {
    await Settings.set("newTabDestination", Settings.newTabDestinations.vimiumNewTabPage);
    assert.equal(Settings.vimiumNewTabPageUrl, getConfiguredNewTabUrl());

    let update;
    stub(chrome.tabs, "update", (tabId, properties) => {
      update = { tabId, properties };
    });
    assert.isTrue(await redirectBrowserNewTab({ id: 42, url: "chrome://newtab/" }));
    assert.equal({ tabId: 42, properties: { url: Settings.vimiumNewTabPageUrl } }, update);
  });

  should("use a configured custom URL", async () => {
    await Settings.set("newTabDestination", Settings.newTabDestinations.customUrl);
    await Settings.set("newTabCustomUrl", "https://example.com/start");

    let update;
    stub(chrome.tabs, "update", (tabId, properties) => {
      update = { tabId, properties };
    });
    assert.isTrue(await redirectBrowserNewTab({ id: 42, pendingUrl: "chrome://newtab/" }));
    assert.equal(
      { tabId: 42, properties: { url: "https://example.com/start" } },
      update,
    );
  });

  should("leave the browser's default new-tab page untouched", async () => {
    await Settings.set("newTabDestination", Settings.newTabDestinations.browserNewTabPage);

    let wasUpdated = false;
    stub(chrome.tabs, "update", () => {
      wasUpdated = true;
    });
    assert.isFalse(await redirectBrowserNewTab({ id: 42, url: "chrome://newtab/" }));
    assert.isFalse(wasUpdated);
  });

  should("leave ordinary newly created tabs untouched", async () => {
    await Settings.set("newTabDestination", Settings.newTabDestinations.vimiumNewTabPage);

    let wasUpdated = false;
    stub(chrome.tabs, "update", () => {
      wasUpdated = true;
    });
    assert.isFalse(await handleCreatedTab({ id: 42, url: "https://example.com/" }));
    assert.isFalse(wasUpdated);
  });

  should("redirect only after Chrome finishes its new-tab navigation", async () => {
    await Settings.set("newTabDestination", Settings.newTabDestinations.vimiumNewTabPage);

    let update;
    stub(chrome.tabs, "update", (tabId, properties) => {
      update = { tabId, properties };
    });
    assert.isTrue(
      handleCreatedTab({ id: 42, url: "chrome://newtab/", status: "loading" }),
    );
    assert.equal(undefined, update);
    assert.isFalse(
      await handleUpdatedTab(
        42,
        { status: "loading" },
        { id: 42, url: "chrome://newtab/", status: "loading" },
      ),
    );
    assert.equal(undefined, update);
    assert.isTrue(
      await handleUpdatedTab(
        42,
        { status: "complete" },
        { id: 42, url: "chrome://newtab/", status: "complete" },
      ),
    );
    assert.equal({ tabId: 42, properties: { url: Settings.vimiumNewTabPageUrl } }, update);
  });

  should("redirect after Chrome reports a delayed new-tab URL", async () => {
    await Settings.set("newTabDestination", Settings.newTabDestinations.customUrl);
    await Settings.set("newTabCustomUrl", "https://example.com/start");

    let update;
    stub(chrome.tabs, "update", (tabId, properties) => {
      update = { tabId, properties };
    });
    assert.isTrue(handleCreatedTab({ id: 42, url: "", status: "loading" }));
    assert.isTrue(
      await handleUpdatedTab(
        42,
        { status: "complete" },
        { id: 42, url: "chrome://newtab/", status: "complete" },
      ),
    );
    assert.equal(
      { tabId: 42, properties: { url: "https://example.com/start" } },
      update,
    );
  });

  should("redirect from a settled tab when Chrome sends no update event", async () => {
    await Settings.set("newTabDestination", Settings.newTabDestinations.customUrl);
    await Settings.set("newTabCustomUrl", "https://example.com/start");

    stub(chrome.tabs, "get", () => ({
      id: 42,
      url: "chrome://newtab/",
      status: "complete",
    }));
    let update;
    stub(chrome.tabs, "update", (tabId, properties) => {
      update = { tabId, properties };
    });

    assert.isTrue(handleCreatedTab({ id: 42, pendingUrl: "chrome://newtab/" }));
    assert.isTrue(await handleSettledCreatedTab(42));
    assert.equal(
      { tabId: 42, properties: { url: "https://example.com/start" } },
      update,
    );
  });
});
