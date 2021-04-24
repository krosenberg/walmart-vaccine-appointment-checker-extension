import * as Preact from "preact";
import { h } from "preact";
import Location from "./Location";
import { fetchAppointments, fetchIfLocationChanges } from "./fetchers";

class App extends Preact.Component {
  state = {
    hasAlertPermission: false,
    isFetching: false,
    isVisible: true,
    locations: [],
    shouldAlert: false,
    shouldAutoCheck: false,
    errorText: undefined,
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
    this.setState({ isFetching: true, locations: [] });
    fetchAppointments()
      .then((locations) => {
        locations = locations.filter(Boolean).filter((l) => l.slots.length);

        if (locations.length) {
          this.setState({ locations });
          if (this.state.shouldAlert) {
            this._sendAlert();
          }
        }
        if (this.state.shouldAutoCheck) {
          clearTimeout(this.timeout);
          this.timeout = setTimeout(this._maybeAutoCheckAppointments, 20000);
        }
      })
      .catch(() => {
        if (this.state.shouldAlert) {
          new Notification("Error - Reload and sign in", {
            body:
              "There was an error fetching data. You probably need to reload the page and sign in again.",
          });
        }
        this.setState({
          isFetching: false,
          shouldAlert: false,
          shouldAutoCheck: false,
          errorText:
            "There was an error fetching data. You probably need to reload the page and sign in again.",
        });
      })
      .finally(() => {
        this.setState({ isFetching: false });
      });
  };

  _sendAlert = () => {
    new Notification("Appointment found", {
      body: "A vaccine appointment was found!",
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

  _toggleContainer = () => {
    this.setState((state) => ({ isVisible: !state.isVisible }));
  };

  render() {
    const {
      locations,
      isFetching,
      shouldAutoCheck,
      shouldAlert,
      isVisible,
      errorText,
    } = this.state;

    return (
      <div className={`wm-appt-slots-container${isVisible ? "" : " hidden"}`}>
        <div
          tabindex="0"
          role="button"
          className="toggle-button"
          onClick={this._toggleContainer}
        >
          <small>{isVisible ? "hide" : "show"}</small>
        </div>
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
          <br />
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
            {locations.map((s, index) => (
              <Location key={index} store={s.store} slots={s.slots} />
            ))}
          </div>
        ) : isFetching ? (
          "searching..."
        ) : (
          <p>
            {errorText ? errorText : "No appointments found in the next 7 days"}
          </p>
        )}
      </div>
    );
  }
}

export default App;
