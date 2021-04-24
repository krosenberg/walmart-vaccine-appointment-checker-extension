export function formatStoreName(store) {
  return `${store.name.split("\n")[0]} - ${store.name.split("\n")[1]} – ${
    store.name.split("\n")[2]
  }`;
}
