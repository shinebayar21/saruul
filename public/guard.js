// Баруун товч, F12, Ctrl+Shift+I/J/C, Ctrl+U-г хаана.
// Энэ нь зөвхөн саад — жинхэнэ хамгаалалт серверийн талд байгаа (үнэ, үлдэгдэл, төлбөр, админ эрхийг сервер шалгана).
(function () {
  "use strict";
  document.addEventListener("contextmenu", function (e) {
    var t = e.target && e.target.tagName;
    if (t !== "INPUT" && t !== "TEXTAREA") e.preventDefault(); // талбарт хуулж буулгахад саад болохгүй
  });
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if (k === "f12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c")) || ((e.ctrlKey || e.metaKey) && k === "u")) e.preventDefault();
  }, true);
})();
