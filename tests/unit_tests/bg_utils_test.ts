import "./test_helper.js";
import "../../lib/url_utils.js";
import "../../background_scripts/tab_recency.js";
import * as bgUtils from "../../background_scripts/bg_utils.js";

context("runTabOperation", () => {
  should("ignore a missing-tab error from a rejected browser promise", async () => {
    const result = await bgUtils.runTabOperation(() =>
      Promise.reject(new Error("No tab with id: 1648448729."))
    );
    assert.equal(undefined, result);
  });

  should("ignore a synchronously thrown missing-tab error", async () => {
    const result = await bgUtils.runTabOperation(() => {
      throw new Error("No tab with id: 1648448729.");
    });
    assert.equal(undefined, result);
  });

  should("preserve unexpected browser errors", async () => {
    let caughtError = null;
    try {
      await bgUtils.runTabOperation(() => Promise.reject(new Error("Unexpected failure")));
    } catch (error) {
      caughtError = error;
    }
    assert.equal("Unexpected failure", caughtError?.message);
  });
});

context("runTabCallbackOperation", () => {
  teardown(() => chrome.runtime.lastError = undefined);

  should("consume a callback-style missing-tab error", async () => {
    const result = await bgUtils.runTabCallbackOperation((callback) => {
      chrome.runtime.lastError = new Error("No tab with id: 1648449498.");
      callback();
    });
    assert.equal(undefined, result);
  });

  should("consume a callback-style missing-receiver error", async () => {
    const result = await bgUtils.runTabCallbackOperation((callback) => {
      chrome.runtime.lastError = new Error(
        "Could not establish connection. Receiving end does not exist.",
      );
      callback();
    });
    assert.equal(undefined, result);
  });

  should("run a fallback for a missing receiver", async () => {
    let fallbackCalled = false;
    await bgUtils.runTabCallbackOperation(
      (callback) => {
        chrome.runtime.lastError = new Error(
          "Could not establish connection. Receiving end does not exist.",
        );
        callback();
      },
      () => fallbackCalled = true,
    );
    assert.isTrue(fallbackCalled);
  });

  should("preserve an unrelated callback-style error", async () => {
    let caughtError;
    try {
      await bgUtils.runTabCallbackOperation((callback) => {
        chrome.runtime.lastError = new Error("Unexpected failure");
        callback();
      });
    } catch (error) {
      caughtError = error;
    }
    assert.equal("Unexpected failure", caughtError.message);
  });
});
