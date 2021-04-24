export function formatStoreName(store) {
  return `${store.name.split("\n")[0]} - ${store.name.split("\n")[1]} – ${
    store.name.split("\n")[2]
  }`;
}

export function convertDatestampToString(datestamp) {
  const monthNum = datestamp.substring(0, 2);
  const dayNum = datestamp.substring(2, 4);
  const yearNum = datestamp.substring(4, 8);
  return `${monthNum}/${dayNum}/${yearNum}`;
}

// Returns start and end date [DDMMYYYY, DDMMYYYY]
export function getDates() {
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

export function pad(number, length) {
  var str = "" + number;
  while (str.length < length) {
    str = "0" + str;
  }

  return str;
}

export function getCIDCookie() {
  var name = "CID=";
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
