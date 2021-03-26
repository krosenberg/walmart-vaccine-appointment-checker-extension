function walmartRequest(method, path, body) {
  return fetch(path, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "content-type": "application/json"
    },
    body: method === "POST" ? JSON.stringify(body) : undefined,
    method: method,
    mode: "cors"
  }).then(r => r.json());
}

function pad(number, length) {
  var str = "" + number;
  while (str.length < length) {
    str = "0" + str;
  }

  return str;
}

// Returns start and end date [DDMMYYYY, DDMMYYYY]
function getDates() {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 8.64e7 * 6);

  const startDate = `${pad(today.getMonth() + 1, 2)}${pad(
    today.getDate(),
    2
  )}${today.getFullYear()}`;

  const endDate = `${pad(nextWeek.getMonth() + 1, 2)}${pad(
    nextWeek.getDate(),
    2
  )}${today.getFullYear()}`;

  return [startDate, endDate];
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function getStoresFromList() {
  return Array.from(
    document.querySelectorAll(".store-list-container > div > label")
  ).map(d => {
    const storeId = d.getAttribute("data-automation-id").replace("store-", "");
    const name = d.querySelector(".store-address").innerText;
    return { name: name, storeId: storeId };
  });
}

function markStore({ storeId }, isAvailable) {
  const $el = document.querySelector(
    `[data-automation-id="store-${storeId}"] .radio-tile-content`
  );

  $el.classList.add("wm-appt-slots", isAvailable ? "available" : "unavailable");

  isAvailable && $el.scrollIntoView();
}

function unmarkAllStores() {
  document
    .querySelectorAll(".wm-appt-slots")
    .forEach($el => $el.classList.remove("available", "unavailable"));
}

function checkStoreInventory(store) {
  const cid = getCookie("CID");
  walmartRequest(
    "GET",
    `/pharmacy/v2/clinical-services/inventory/store/${store.storeId}/${cid}?type=imz`,
    {}
  ).then(resp => {
    const hasInventory = resp.data.inventory.filter(s => s.quantity > 0).length;

    if (hasInventory) {
      checkStoreAppointments(store);
    } else {
      markStore(store, false);
    }
  });
}

function checkStoreAppointments(store) {
  const { storeId } = store;
  const cid = getCookie("CID");

  walmartRequest("POST", `/pharmacy/v2/clinical-services/time-slots/${cid}`, {
    startDate: getDates()[0],
    endDate: getDates()[1],
    imzStoreNumber: { USStoreId: storeId }
  }).then(resp => {
    const daysWithSlots = resp.data.slotDays.filter(sd => sd.slots.length);

    if (daysWithSlots.length) {
      markStore(store, true);
      incrementCount();

      // TODO show available appointments in Store List instead of console.logging
      console.log(`Store #${storeId} - ${store.name}`);

      daysWithSlots.forEach(s => {
        console.log(
          `> ${s.slotDate}: ${s.slots.map(s => s.startTime).join(", ")}`
        );
        console.log(``);
      });
    } else {
      markStore(store, false);
    }
  });
}

let availableLocationCount = 0;

function incrementCount() {
  const $count = document.querySelector(".wm-appt-slots-count");
  $count.innerText = availableLocationCount++;
}

function renderHeaderBox() {
  const $pageTitle = document.querySelector("[data-automation-id=page-title]");
  const $contents = document.createElement("div");
  $contents.classList.add("wm-appt-slots-container");
  $contents.innerHTML = `
			<p>
				Locations with appointments in the next 7 days: <span class="wm-appt-slots-count">0</span>
				<button class="wm-appt-slots-button">🔁Check again</button>
			</p>`;

  $pageTitle.insertBefore($contents, $pageTitle.firstChild);

  const $button = document.querySelector(".wm-appt-slots-button");

  $button.addEventListener("click", handleClick);

  const $count = document.querySelector(".wm-appt-slots-count");

  const $storeListContainerParent = document.querySelector(
    ".store-finder-search-container .well"
  );

  function handleClick() {
    unmarkAllStores();
    // Disable the button for 5 seconds to prevent too many requests
    $button.disabled = true;
    $button.innerText = "checking...";
    setTimeout(() => {
      $button.disabled = false;
      $button.innerText = "🔁Check again";
    }, 5000);

    availableLocationCount = 0;
    $count.innerText = availableLocationCount;

    check();
  }
}

function check() {
  getStoresFromList().forEach(checkStoreInventory);
}

var observer = new MutationObserver(function(mutations) {
  if (document.querySelector(".store-list-container")) {
    observer.disconnect();
    renderHeaderBox();
    check();
  }
});

observer.observe(document, {
  attributes: false,
  childList: true,
  characterData: false,
  subtree: true
});
