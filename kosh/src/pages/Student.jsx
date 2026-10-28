import { Link } from "react-router-dom";
import { Cards, Head } from "../shared";
import { student } from "../data";
export default function Student() {
  return (
    <section className="kw-sec"><div className="kw-wrap">
      <Head n="03 | Student Panel" title="Keep every student on track" sub="A personalized student dashboard for tests and progress." />
      <Cards items={student} />
      <p style={{ marginTop: 28 }}><Link to="/student-dashboard" className="kw-btn dark">Open student dashboard</Link></p>
    </div></section>
  );
}
