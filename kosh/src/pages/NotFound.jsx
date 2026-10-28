import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <section className="kw-sec"><div className="kw-wrap" style={{ textAlign: "center" }}>
      <h1>Page not found</h1>
      <p className="sub" style={{ margin: "0 auto 24px" }}>This page does not exist. Go back to the home page.</p>
      <Link to="/" className="kw-btn dark">Back to home</Link>
    </div></section>
  );
}
