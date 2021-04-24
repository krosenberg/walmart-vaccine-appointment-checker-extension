import * as Preact from "preact";
import { h } from "preact";
import App from "./App";
import "./styles.css";

var observer = new MutationObserver(function (mutations) {
  if (document.querySelector(".store-list-container")) {
    observer.disconnect();
    const $pageTitle = document.querySelector("article");

    const $contents = document.createElement("div");

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
