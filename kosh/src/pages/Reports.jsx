import { Cards, Head } from "../shared";
import { reports } from "../data";
export default function Reports() {
  return (
    <section className="kw-sec"><div className="kw-wrap">
      <Head n="06 | Reports, Excel & Parent Meetings" title="Reports that help in PTMs" sub="Make academic discussions more structured with student-level data." />
      <Cards items={reports} />
      <div className="kw-banner">DATA → INSIGHT → ACTION</div>
    </div></section>
  );
}
