import * as Preact from "preact";
import { h } from "preact";
import { formatStoreName } from "./utils";

function convertDatestampToString(datestamp) {
  const monthNum = datestamp.substring(0, 2);
  const dayNum = datestamp.substring(2, 4);
  const yearNum = datestamp.substring(4, 8);
  return `${monthNum}/${dayNum}/${yearNum}`;
}

export default ({ store, slots }) => {
  const numSlots = slots.reduce((memo, item) => {
    return memo + item.slots.length;
  }, 0);

  const numAppointmentsLabel = `${numSlots} appointment${
    numSlots === 1 ? "" : "s"
  } available`;

  const daysWithAppointments = slots.map((s) => {
    return { date: s.slotDate, appointments: s.slots.map((s) => s.startTime) };
  });

  return (
    <details>
      <summary>
        <strong>{formatStoreName(store)}</strong>
        <br />
        {numAppointmentsLabel}
      </summary>
      <dl>
        {daysWithAppointments.map(({ date, appointments }, index) => {
          return (
            <span key={index}>
              <dt>
                <strong>{convertDatestampToString(date)}</strong>
              </dt>
              <dd>{appointments.join(", ")}</dd>
            </span>
          );
        })}
      </dl>
      <small>
        To book an appointment, select this location from the{" "}
        <em>Pharmacies offering COVID-19 vaccination</em> list below, and then
        click the blue <em>Continue</em> button.
      </small>
    </details>
  );
};
