import * as Preact from "preact";
import { h } from "preact";
import Location from "./Location";
import "./styles.css";
import { formatStoreName } from "./utils";

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
  ).map((d) => {
    const storeId = d.getAttribute("data-automation-id").replace("store-", "");
    const name = d.querySelector(".store-address").innerText;
    return { name: name, storeId: storeId };
  });
}

function checkStoreInventory(store) {
  const cid = getCookie("CID");
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
  const cid = getCookie("CID");

  return walmartRequest(
    "POST",
    `/pharmacy/v2/clinical-services/time-slots/${cid}`,
    {
      startDate: getDates()[0],
      endDate: getDates()[1],
      imzStoreNumber: { USStoreId: storeId },
    }
  ).then((resp) => {
    const daysWithSlots = resp.data.slotDays.filter((sd) => sd.slots.length);
    return { slots: daysWithSlots, store: store };
  });
}

var observer = new MutationObserver(function (mutations) {
  if (document.querySelector(".store-list-container")) {
    observer.disconnect();
    const $pageTitle = document.querySelector("article");

    const $contents = document.createElement("div");
    $contents.classList.add("wm-appt-slots-container");

    $pageTitle.insertBefore($contents, $pageTitle.firstChild);

    Preact.render(<App />, $contents);
  }
});

observer.observe(document, {
  attributes: false,
  childList: true,
  characterData: false,
  subtree: true,
});

const fetchAppointments = (storesList) =>
  Promise.all(storesList.map(checkStoreInventory));

const fetchIfLocationChanges = (callback) => {
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
};
class App extends Preact.Component {
  state = {
    isFetching: false,
    locations: [],
    shouldAutoCheck: false,
    shouldAlert: false,
    hasAlertPermission: false,
  };

  componentDidMount() {
    this._fetchAppointments();
    fetchIfLocationChanges(this._fetchAppointments);
  }

  componentDidUpdate(_, newState) {
    if (this.state.shouldAutoCheck !== newState.shouldAutoCheck) {
      if (this.state.shouldAutoCheck) {
        this._fetchAppointments();
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this._maybeAutoCheckAppointments, 20000);
      } else {
        clearTimeout(this.timeout);
      }
    }
  }

  _maybeAutoCheckAppointments = () => {
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      console.log("counting down");
    }, 1000);
    this.state.shouldAutoCheck && this._fetchAppointments();
  };

  _fetchAppointments = () => {
    const storesList = getStoresFromList();
    this.setState({ isFetching: true, locations: [] });
    fetchAppointments(storesList)
      .then((locations) => {
        this.setState({
          locations: locations.filter(Boolean),
        });
        // TODO disable auto-check if there are locations with slots
        if (this.state.shouldAutoCheck) {
          clearTimeout(this.timeout);
          this.timeout = setTimeout(this._maybeAutoCheckAppointments, 20000);
        }
      })
      .finally(() => {
        this.setState({ isFetching: false });
      });
  };

  _handleButtonClick = () => {
    this._fetchAppointments();
  };

  _handleAutoCheckChange = () => {
    this.setState((state) => ({ shouldAutoCheck: !state.shouldAutoCheck }));
  };

  _handleAlertChange = (e) => {
    const { shouldAlert, hasAlertPermission } = this.state;

    if (!shouldAlert) {
      if (Notification && Notification.permission !== "denied") {
        this.setState({ shouldAlert: false });
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            this.setState({ shouldAlert: true });
          }
        });
      } else {
        this.setState({ shouldAlert: false });
      }
    }
  };

  render() {
    const { locations, isFetching, shouldAutoCheck, shouldAlert } = this.state;
    const locationsWithAppointments = locations.filter((l) => l.slots.length);

    // TODO add collapse toggle

    return (
      <div>
        <h3>💉 Walmart Vaccine Appointment Checker Extension</h3>
        <div>
          <button
            className="wm-appt-slots-button"
            disabled={isFetching || shouldAutoCheck}
            onClick={this._handleButtonClick}
          >
            {isFetching
              ? "Checking..."
              : shouldAutoCheck
              ? "Auto-checking"
              : "🔁Check again"}
          </button>{" "}
          <label>
            <input
              type="checkbox"
              checked={shouldAutoCheck}
              onChange={this._handleAutoCheckChange}
            />{" "}
            Auto-check every 20 seconds
          </label>{" "}
          <label>
            <input
              type="checkbox"
              checked={shouldAlert}
              onChange={this._handleAlertChange}
            />{" "}
            Alert if appointment is avaialble
          </label>
        </div>
        <hr />
        {locations.length ? (
          <div>
            {locationsWithAppointments.length ? (
              locationsWithAppointments.map(({ slots, store }, index) => (
                <Location key={index} store={store} slots={slots} />
              ))
            ) : (
              <p>No appointments found in the next 7 days</p>
            )}
          </div>
        ) : isFetching ? (
          "searching..."
        ) : (
          "No locations found"
        )}
      </div>
    );
  }
}
