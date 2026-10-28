import { useEffect, useRef } from "react";

const openModals = []; // stack of open modals (a modal can open another one on top)

export default function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const me = {};
    openModals.push(me);
    const onKey = (e) => {
      if (e.key === "Escape" && openModals[openModals.length - 1] === me) closeRef.current(); // only the top-most modal closes
    };
    window.addEventListener("keydown", onKey);
    if (ref.current) ref.current.focus();
    return () => { window.removeEventListener("keydown", onKey); openModals.splice(openModals.indexOf(me), 1); };
  }, []);

  return (
    <div className="db-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`db-modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="db-modal-head">
          <h2>{title}</h2>
          <button type="button" className="db-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
