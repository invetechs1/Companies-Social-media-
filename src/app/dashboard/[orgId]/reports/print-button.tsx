"use client";

/** Opens the report iframe's print dialog so the client can Save-as-PDF. */
export default function PrintButton() {
  function print() {
    const iframe = document.querySelector("iframe[title='Performance report']") as HTMLIFrameElement | null;
    (iframe?.contentWindow || window).print();
  }
  return (
    <button className="btn-primary" onClick={print}>
      🖨️ Print / Save as PDF
    </button>
  );
}
