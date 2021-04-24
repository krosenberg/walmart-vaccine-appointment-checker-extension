import { getDates, getCIDCookie, pad } from "./utils";

function walmartRequest(method, path, body) {
  return fetch(path, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
    method: method,
    mode: "cors",
  }).then((r) => r.json());
}

function getStoresFromList() {
  return Array.from(
    document.querySelectorAll(".store-list-container > div > label")
  ).map((d) => {
    const storeId = d.getAttribute("data-automation-id").replace("store-", "");
    const name = d.querySelector(".store-address").innerText;
    return { name: name, storeId: storeId };
  });
}

function checkStoreInventory(store) {
  const cid = getCIDCookie();
  return walmartRequest(
    "GET",
    `/pharmacy/v2/clinical-services/inventory/store/${store.storeId}/${cid}?type=imz`,
    {}
  ).then((resp) => {
    const hasInventory = resp.data.inventory.filter((s) => s.quantity > 0)
      .length;

    if (hasInventory) {
      return checkStoreAppointments(store);
    } else {
      return { store: store, slots: [] };
    }
  });
}

function checkStoreAppointments(store) {
  const { storeId } = store;
  const cid = getCIDCookie();
  const [startDate, endDate] = getDates();

  return walmartRequest(
    "POST",
    `/pharmacy/v2/clinical-services/time-slots/${cid}`,
    {
      startDate,
      endDate,
      imzStoreNumber: { USStoreId: storeId },
    }
  ).then((resp) => {
    const daysWithSlots = resp.data.slotDays.filter((sd) => sd.slots.length);
    return { slots: daysWithSlots, store: store };
  });
}

export function fetchAppointments() {
  const storesList = getStoresFromList();
  return Promise.all(storesList.map(checkStoreInventory));
}

export function fetchIfLocationChanges(callback) {
  const $storeListContainerParent = document.querySelector(
    ".store-finder-search-container .well"
  );

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((addedNode) => {
        if (addedNode === document.querySelector(".store-list-container")) {
          callback();
        }
      });
    });
  });

  observer.observe($storeListContainerParent, {
    childList: true,
  });
}
